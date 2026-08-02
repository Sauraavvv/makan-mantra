"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { getAdminSession } from "@/lib/auth/admin";
import { getAuthDbErrorMessage, getPropertySubmissionsCollection } from "@/lib/auth/db";
import { deleteAsset, type UploadedAsset } from "@/lib/cloudinary";

export type DeleteState = { error?: string };

/**
 * Removes an enquiry for good — its media on Cloudinary and then the document.
 *
 * Media goes first: if a delete fails the document stays, so the admin can
 * retry. Dropping the document first would leave assets nobody can find, and
 * the draft sweeper ignores them once they carry a `listing_` tag.
 */
export async function deleteSubmissionAction(
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  const session = await getAdminSession();
  if (!session) return { error: "Not authorised." };

  const id = String(formData.get("id") ?? "");
  if (!ObjectId.isValid(id)) return { error: "Invalid enquiry." };

  try {
    const submissions = await getPropertySubmissionsCollection();
    const doc = await submissions.findOne({ _id: new ObjectId(id) });

    if (!doc) return { error: "This enquiry no longer exists." };

    const media: UploadedAsset[] = doc.media ?? doc.images ?? [];

    const failed: string[] = [];
    for (const asset of media) {
      if (!asset?.public_id) continue;

      const ok = await deleteAsset(asset.public_id, asset.kind === "video" ? "video" : "image")
        .catch(() => false);

      if (!ok) failed.push(asset.public_id);
    }

    if (failed.length > 0) {
      return {
        error: `Could not delete ${failed.length} file${failed.length === 1 ? "" : "s"} from storage. Nothing was removed — please try again.`,
      };
    }

    await submissions.deleteOne({ _id: new ObjectId(id) });
  } catch (error) {
    return { error: getAuthDbErrorMessage(error) };
  }

  revalidatePath("/admin/post-property");
  revalidatePath("/admin");
  redirect("/admin/post-property");
}
