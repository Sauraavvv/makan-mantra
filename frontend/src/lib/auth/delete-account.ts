import { ObjectId } from "mongodb";

import {
  getPropertySubmissionsCollection,
  getRecentPropertiesCollection,
  getRecentSearchesCollection,
  getSavedPropertiesCollection,
  getUsersCollection,
} from "@/lib/auth/db";
import { deleteAsset, type UploadedAsset } from "@/lib/cloudinary";

export type DeleteAccountResult = {
  ok: boolean;
  error?: string;
  removed?: Record<string, number>;
};

/**
 * Erases an account and everything hanging off it.
 *
 * Cloudinary goes first, for the same reason the admin enquiry delete does it
 * that way: if a file cannot be removed we stop with every record still in
 * place, so the owner can retry. Dropping the rows first would strand assets
 * nobody can find their way back to.
 */
export async function deleteAccount(userId: string, email: string): Promise<DeleteAccountResult> {
  if (!ObjectId.isValid(userId)) return { ok: false, error: "Invalid account" };

  const _id = new ObjectId(userId);
  const users = await getUsersCollection();
  const user = await users.findOne({ _id });
  if (!user) return { ok: false, error: "Account not found" };

  const submissions = await getPropertySubmissionsCollection();
  // Email is matched alongside the id to catch properties posted before the
  // account existed — the same rule the dashboard lists them by.
  const ownedProperties = {
    $or: [{ user_id: userId }, { user_email: email }, { owner_email: email }],
  };
  const properties = await submissions.find(ownedProperties).toArray();

  const assets: UploadedAsset[] = [];
  for (const property of properties) {
    for (const asset of (property.media ?? property.images ?? []) as UploadedAsset[]) {
      if (asset?.public_id) assets.push(asset);
    }
  }
  if (user.profile_image?.public_id) {
    assets.push({ public_id: user.profile_image.public_id, kind: "image" } as UploadedAsset);
  }

  const failed: string[] = [];
  for (const asset of assets) {
    const ok = await deleteAsset(
      asset.public_id,
      asset.kind === "video" ? "video" : "image",
    ).catch(() => false);

    if (!ok) failed.push(asset.public_id);
  }

  if (failed.length > 0) {
    return {
      ok: false,
      error: `Could not delete ${failed.length} file${
        failed.length === 1 ? "" : "s"
      } from storage. Nothing was removed — please try again.`,
    };
  }

  const [saved, recentProperties, recentSearches] = await Promise.all([
    getSavedPropertiesCollection(),
    getRecentPropertiesCollection(),
    getRecentSearchesCollection(),
  ]);

  const removed = {
    properties: (await submissions.deleteMany(ownedProperties)).deletedCount,
    saved: (await saved.deleteMany({ user_id: userId })).deletedCount,
    recentlyViewed: (await recentProperties.deleteMany({ user_id: userId })).deletedCount,
    recentSearches: (await recentSearches.deleteMany({ user_id: userId })).deletedCount,
    files: assets.length,
  };

  // The account row goes last: while it exists, a retry can still find
  // everything above through it.
  await users.deleteOne({ _id });

  return { ok: true, removed: { ...removed, account: 1 } };
}
