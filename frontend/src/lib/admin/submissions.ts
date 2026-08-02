import { ObjectId } from "mongodb";
import { getPropertySubmissionsCollection } from "@/lib/auth/db";

export type SubmissionMedia = {
  kind: "image" | "video";
  public_id: string;
  url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
};

export type Submission = {
  id: string;
  property_type: string;
  listing_type: string;
  details: string | null;
  media: SubmissionMedia[];
  user_type: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  source: string;
  created_at: string;
};

export const PAGE_SIZE = 25;

type SubmissionDoc = {
  _id: ObjectId;
  property_type?: string;
  listing_type?: string;
  details?: string | null;
  media?: SubmissionMedia[];
  images?: SubmissionMedia[];
  user_type?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  source?: string;
  created_at?: Date;
};

function toSubmission(doc: SubmissionDoc): Submission {
  return {
    id: doc._id.toString(),
    property_type: doc.property_type ?? "",
    listing_type: doc.listing_type ?? "",
    details: doc.details ?? null,
    // `images` is the pre-Cloudinary field name; read both so old rows still show.
    media: doc.media ?? doc.images ?? [],
    user_type: doc.user_type ?? null,
    owner_name: doc.owner_name ?? null,
    owner_email: doc.owner_email ?? null,
    owner_phone: doc.owner_phone ?? null,
    source: doc.source ?? "",
    created_at: (doc.created_at ?? new Date()).toISOString(),
  };
}

/** Newest leads first — the calling team works top-down. */
export async function listSubmissions({ page = 1, q = "" } = {}) {
  const submissions = await getPropertySubmissionsCollection();

  const trimmed = q.trim();
  const filter = trimmed
    ? {
        $or: [
          { owner_name: { $regex: trimmed, $options: "i" } },
          { owner_email: { $regex: trimmed, $options: "i" } },
          { owner_phone: { $regex: trimmed, $options: "i" } },
        ],
      }
    : {};

  const total = await submissions.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pages);

  const docs = await submissions
    .find(filter)
    .sort({ created_at: -1 })
    .skip((current - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .toArray();

  return {
    items: (docs as SubmissionDoc[]).map(toSubmission),
    total,
    page: current,
    pages,
  };
}

export async function getSubmission(id: string) {
  if (!ObjectId.isValid(id)) return null;

  const submissions = await getPropertySubmissionsCollection();
  const doc = await submissions.findOne({ _id: new ObjectId(id) });

  return doc ? toSubmission(doc as SubmissionDoc) : null;
}
