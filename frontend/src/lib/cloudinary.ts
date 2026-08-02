import { v2 as cloudinary } from "cloudinary";

/**
 * Server-only Cloudinary client. Never import this from a "use client" file —
 * it carries the API secret.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/** Everything the browser uploads lands here so cleanup stays predictable. */
export const UPLOAD_FOLDER = "makan-mantraa/properties";

/** Fresh uploads carry this tag until the submission they belong to is saved. */
export const DRAFT_TAG = "draft";

export type UploadedAsset = {
  kind: "image" | "video";
  public_id: string;
  url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
};

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

/**
 * Confirms an asset really exists on Cloudinary and returns its true metadata.
 * The browser reports what it uploaded, but a client can claim anything — the
 * size and dimensions we store must come from Cloudinary itself.
 */
export async function verifyAsset(publicId: string, kind: "image" | "video") {
  const resource = await cloudinary.api.resource(publicId, {
    resource_type: kind,
  });

  return {
    kind,
    public_id: resource.public_id as string,
    url: resource.secure_url as string,
    width: resource.width as number,
    height: resource.height as number,
    format: resource.format as string,
    bytes: resource.bytes as number,
  } satisfies UploadedAsset;
}

/** Drops the draft tag once the submission owning these assets is stored. */
export async function markAssetsSaved(assets: UploadedAsset[], submissionId: string) {
  await Promise.all(
    ["image" as const, "video" as const].map(async (kind) => {
      const ids = assets.filter((asset) => asset.kind === kind).map((asset) => asset.public_id);
      if (ids.length === 0) return;

      await cloudinary.uploader.remove_tag(DRAFT_TAG, ids, { resource_type: kind });
      await cloudinary.uploader.add_tag(`listing_${submissionId}`, ids, { resource_type: kind });
    }),
  );
}

/**
 * Removes an asset from Cloudinary. An asset that is already gone counts as
 * success — the caller only wants it to not exist.
 */
export async function deleteAsset(publicId: string, kind: "image" | "video") {
  const res = await cloudinary.uploader.destroy(publicId, { resource_type: kind });
  return res.result === "ok" || res.result === "not found";
}

/**
 * Sweeps uploads that were never attached to a submission — someone picked
 * files and then abandoned the form.
 *
 * The one-day floor matters: anything newer may belong to a form a visitor is
 * still filling in, and deleting it would pull the media out from under them.
 */
export async function deleteAbandonedDrafts({ dryRun = false } = {}) {
  const expression = `folder="${UPLOAD_FOLDER}" AND tags="${DRAFT_TAG}" AND uploaded_at<1d`;

  const found: { public_id: string; resource_type: string }[] = [];
  let cursor: string | undefined;

  do {
    const search = cloudinary.search.expression(expression).max_results(100);
    if (cursor) search.next_cursor(cursor);

    const page = await search.execute();
    found.push(...page.resources);
    cursor = page.next_cursor;
  } while (cursor);

  if (dryRun || found.length === 0) {
    return { deleted: 0, found: found.length, ids: found.map((r) => r.public_id) };
  }

  let deleted = 0;

  for (const type of ["image", "video"] as const) {
    const ids = found.filter((r) => r.resource_type === type).map((r) => r.public_id);

    // The Admin API caps deletions at 100 ids per call.
    for (let i = 0; i < ids.length; i += 100) {
      await cloudinary.api.delete_resources(ids.slice(i, i + 100), { resource_type: type });
      deleted += ids.slice(i, i + 100).length;
    }
  }

  return { deleted, found: found.length, ids: found.map((r) => r.public_id) };
}

export { cloudinary };
