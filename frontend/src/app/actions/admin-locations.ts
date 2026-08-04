"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth/admin";
import { getAuthDbErrorMessage } from "@/lib/auth/db";
import {
  collectionFor,
  idFilter,
  isPageKind,
  pathFor,
  type PageKind,
} from "@/lib/admin/location-collections";

export type ToggleState = { error?: string; success?: string };

/**
 * Retires a page, or brings it back.
 *
 * Deactivating is what makes the public URL answer 410 instead of 200 — the
 * proxy reads the retired set from the API, so a change can take up to its
 * cache TTL to show up for visitors.
 */
export async function toggleLocationActiveAction(
  _prev: ToggleState,
  formData: FormData,
): Promise<ToggleState> {
  const session = await getAdminSession();
  if (!session) return { error: "Not authorised." };

  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";

  if (!isPageKind(kind)) return { error: "Unknown page type." };
  if (!id) return { error: "Missing page." };

  try {
    const collection = await collectionFor(kind as PageKind);
    const filter = idFilter(id);
    const doc = await collection.findOne(filter);

    if (!doc) return { error: "This page no longer exists." };

    await collection.updateOne(filter, { $set: { is_active: active } });

    // Drop the cached render so the page stops (or starts) serving right away.
    revalidatePath(pathFor(kind, doc));
    revalidatePath("/admin/locations");
  } catch (error) {
    return { error: getAuthDbErrorMessage(error) };
  }

  return {
    success: active ? "Page is live again." : "Page retired — it now returns 410.",
  };
}
