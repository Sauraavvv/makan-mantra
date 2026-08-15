"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth/admin";
import {
  getAuthDbErrorMessage,
  getNewsCollection,
  getNewsCommentsCollection,
  getNewsViewsCollection,
  getTempNewsCollection,
} from "@/lib/auth/db";
import { cloudinary, deleteAsset } from "@/lib/cloudinary";

export type ReviewState = { error?: string };

const PENDING_TAG = "news_pending";
const PUBLISHED_TAG = "news_published";

/**
 * Every article already in `news` carries a +05:30 timestamp, because the
 * generator writes them in IST. Matching that keeps the listing sort — which
 * compares these as plain strings — honest.
 */
function istStamp() {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().replace(/\.\d{3}Z$/, "+05:30");
}

/**
 * Publishes a staged story.
 *
 * The document keeps its `_id` (`news:<slug>`) on the way across, so an upsert
 * is safe to repeat: if the delete below fails and the admin clicks Approve
 * again, the same article is overwritten instead of duplicated.
 */
export async function approveNewsAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const session = await getAdminSession();
  if (!session) return { error: "Not authorised." };

  const slug = String(formData.get("slug") ?? "");
  if (!slug) return { error: "Missing story." };

  try {
    const queue = await getTempNewsCollection();
    const news = await getNewsCollection();

    const doc = await queue.findOne({ slug });
    if (!doc) return { error: "This story is no longer in the review queue." };

    const publicId = doc.featuredImage?.publicId;
    if (doc.needs_image === true || !publicId) {
      return { error: "This story has no banner yet. Add one before publishing it." };
    }

    const clash = await news.findOne({ slug }, { projection: { _id: 1 } });
    if (clash) {
      return { error: "A published article already uses this slug. Reject this copy instead." };
    }

    // Move the banner out of the pending set first. A retag that fails leaves
    // the story in the queue, which is the state an admin can retry from.
    await cloudinary.uploader.remove_tag(PENDING_TAG, [publicId], { resource_type: "image" });
    await cloudinary.uploader.add_tag(PUBLISHED_TAG, [publicId], { resource_type: "image" });

    const published: Record<string, unknown> = { ...doc };
    delete published.needs_image;
    delete published.source;
    published.status = "published";
    published.publishedAt = doc.publishedAt || istStamp();
    published.updatedAt = istStamp();
    published.updated_at = new Date().toISOString();

    await news.replaceOne({ _id: doc._id }, published, { upsert: true });
    await queue.deleteOne({ _id: doc._id });
  } catch (error) {
    return { error: getAuthDbErrorMessage(error) };
  }

  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/admin/news");
  revalidatePath("/admin");
  redirect("/admin/news?published=1");
}

/**
 * Throws a staged story away, banner and all.
 *
 * The image goes first, exactly as it does for property enquiries: if the
 * document went first, the file would be left on Cloudinary with nothing left
 * to find it by, and the draft sweeper only looks at the property folder.
 */
export async function rejectNewsAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const session = await getAdminSession();
  if (!session) return { error: "Not authorised." };

  const slug = String(formData.get("slug") ?? "");
  if (!slug) return { error: "Missing story." };

  try {
    const queue = await getTempNewsCollection();
    const doc = await queue.findOne({ slug });
    if (!doc) return { error: "This story is no longer in the review queue." };

    const publicId = doc.featuredImage?.publicId;
    if (publicId) {
      const removed = await deleteAsset(publicId, "image").catch(() => false);
      if (!removed) {
        return {
          error: "Could not remove the banner from storage. Nothing was deleted — please try again.",
        };
      }
    }

    await queue.deleteOne({ _id: doc._id });
  } catch (error) {
    return { error: getAuthDbErrorMessage(error) };
  }

  revalidatePath("/admin/news");
  revalidatePath("/admin");
  redirect("/admin/news?rejected=1");
}

/**
 * Takes a published article off the site for good.
 *
 * Order matters, and it runs outside-in: banner, then the comments and view
 * counts that hang off the slug, then the article itself. Everything before the
 * last step is safe to repeat, so a failure part-way leaves the article still
 * standing and the whole action retryable. Anyone holding the article's URL
 * gets a 404 once the last step lands.
 */
export async function deletePublishedNewsAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const session = await getAdminSession();
  if (!session) return { error: "Not authorised." };

  const slug = String(formData.get("slug") ?? "");
  if (!slug) return { error: "Missing article." };

  try {
    const news = await getNewsCollection();
    const doc = await news.findOne({ slug });
    if (!doc) return { error: "This article no longer exists." };

    const publicId = doc.featuredImage?.publicId;
    if (publicId) {
      const removed = await deleteAsset(publicId, "image").catch(() => false);
      if (!removed) {
        return {
          error: "Could not remove the banner from storage. Nothing was deleted — please try again.",
        };
      }
    }

    const [comments, views] = await Promise.all([
      getNewsCommentsCollection(),
      getNewsViewsCollection(),
    ]);

    // Both are keyed by article_slug and neither is referenced anywhere else,
    // so removing them by slug is enough — and repeating it changes nothing.
    await comments.deleteMany({ article_slug: slug });
    await views.deleteMany({ article_slug: slug });

    await news.deleteOne({ _id: doc._id });
  } catch (error) {
    return { error: getAuthDbErrorMessage(error) };
  }

  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/admin/news");
  revalidatePath("/admin");
  redirect("/admin/news?tab=published&deleted=1");
}
