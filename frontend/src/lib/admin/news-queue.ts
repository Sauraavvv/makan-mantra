import { getNewsCollection, getTempNewsCollection } from "@/lib/auth/db";

/**
 * A story the generator wrote and staged, waiting on a yes or no.
 *
 * The shape is the published article's shape plus three review-only fields:
 * `needs_image`, `source`, and a `status` of `pending_review`. Approving drops
 * the review fields and moves the rest across untouched.
 */
export type QueuedNews = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
  author: { name: string; avatarUrl: string };
  featuredImage: {
    url: string;
    altText: string;
    publicId: string;
    width: number | null;
    height: number | null;
  };
  publishedAt: string;
  updatedAt: string;
  seo: { metaTitle: string; metaDescription: string };
  needsImage: boolean;
  batchDate: string;
  createdAt: string;
};

type QueuedNewsDoc = {
  _id: string;
  slug?: string;
  title?: string;
  summary?: string;
  content?: string;
  category?: string;
  tags?: string[];
  author?: { name?: string; avatarUrl?: string };
  featuredImage?: {
    url?: string;
    altText?: string;
    publicId?: string;
    width?: number | null;
    height?: number | null;
  };
  publishedAt?: string;
  updatedAt?: string;
  seo?: { metaTitle?: string; metaDescription?: string };
  needs_image?: boolean;
  source?: { batch_date?: string };
  created_at?: string;
};

function toQueuedNews(doc: QueuedNewsDoc): QueuedNews {
  const image = doc.featuredImage ?? {};

  return {
    id: doc._id,
    slug: doc.slug ?? "",
    title: doc.title ?? "",
    summary: doc.summary ?? "",
    content: doc.content ?? "",
    category: doc.category ?? "",
    tags: doc.tags ?? [],
    author: {
      name: doc.author?.name || "Makan Mantraa News Desk",
      avatarUrl: doc.author?.avatarUrl ?? "",
    },
    featuredImage: {
      url: image.url ?? "",
      altText: image.altText ?? "",
      publicId: image.publicId ?? "",
      width: image.width ?? null,
      height: image.height ?? null,
    },
    publishedAt: doc.publishedAt ?? "",
    updatedAt: doc.updatedAt ?? "",
    seo: {
      metaTitle: doc.seo?.metaTitle ?? "",
      metaDescription: doc.seo?.metaDescription ?? "",
    },
    // A story with no banner is staged anyway so the writing is not lost, but
    // it cannot go live until someone gives it an image.
    needsImage: doc.needs_image === true || !image.publicId,
    batchDate: doc.source?.batch_date ?? "",
    createdAt: doc.created_at ?? "",
  };
}

/** Newest batch first, which is the order an admin reviews them in. */
export async function listQueuedNews(): Promise<QueuedNews[]> {
  const col = await getTempNewsCollection();
  const docs = await col.find({}).sort({ created_at: -1 }).limit(50).toArray();
  // The driver types `_id` as an ObjectId; these documents carry a string id.
  return (docs as unknown as QueuedNewsDoc[]).map(toQueuedNews);
}

export async function getQueuedNews(slug: string): Promise<QueuedNews | null> {
  const col = await getTempNewsCollection();
  const doc = await col.findOne({ slug });
  return doc ? toQueuedNews(doc as unknown as QueuedNewsDoc) : null;
}

export async function countQueuedNews(): Promise<number> {
  const col = await getTempNewsCollection();
  return col.countDocuments({});
}

/** An article that is already on the site, listed so it can be taken down again. */
export type PublishedNews = {
  id: string;
  slug: string;
  title: string;
  category: string;
  publishedAt: string;
  status: string;
  imagePublicId: string;
  imageAltText: string;
};

export async function listPublishedNews(): Promise<PublishedNews[]> {
  const col = await getNewsCollection();
  const docs = await col
    .find({}, { projection: { title: 1, slug: 1, category: 1, publishedAt: 1, status: 1, featuredImage: 1 } })
    .sort({ publishedAt: -1 })
    .limit(100)
    .toArray();

  return docs.map((doc) => ({
    id: String(doc._id),
    slug: doc.slug ?? "",
    title: doc.title ?? "",
    category: doc.category ?? "",
    publishedAt: doc.publishedAt ?? "",
    status: doc.status ?? "",
    imagePublicId: doc.featuredImage?.publicId ?? "",
    imageAltText: doc.featuredImage?.altText ?? "",
  }));
}

export async function countPublishedNews(): Promise<number> {
  const col = await getNewsCollection();
  return col.countDocuments({});
}

/** The body is one string of blank-line separated paragraphs, as it is on the site. */
export function toParagraphs(content: string) {
  return content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

export function readingMinutes(content: string) {
  return Math.max(1, Math.round(content.trim().split(/\s+/).length / 200));
}
