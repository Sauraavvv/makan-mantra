import { ObjectId } from "mongodb";
import {
  getDistrictOverviewCollection,
  getLocationPagesCollection,
  getStateOverviewCollection,
} from "@/lib/auth/db";

/** The three collections that back a public page and can be retired. */
export const PAGE_KINDS = ["location", "district", "state"] as const;

export type PageKind = (typeof PAGE_KINDS)[number];

export const KIND_LABELS: Record<PageKind, string> = {
  location: "Location Pages",
  district: "Districts",
  state: "States",
};

export function isPageKind(value: string | undefined): value is PageKind {
  return PAGE_KINDS.includes(value as PageKind);
}

export function collectionFor(kind: PageKind) {
  if (kind === "state") return getStateOverviewCollection();
  if (kind === "district") return getDistrictOverviewCollection();
  return getLocationPagesCollection();
}

/**
 * The public URL segment for a document.
 *
 * Overview pages live under their `explore-` route slug; location pages are
 * served straight off their own slug.
 */
export function pathFor(kind: PageKind, doc: Record<string, unknown>) {
  const segment = kind === "location" ? doc.slug : doc.route_slug || doc.slug;
  return `/${String(segment ?? "")}`;
}

export function labelFor(kind: PageKind, doc: Record<string, unknown>) {
  if (kind === "state") return String(doc.state_name ?? doc.slug ?? "");

  if (kind === "district") {
    const district = String(doc.district_name ?? doc.slug ?? "");
    const state = doc.state_name ? `, ${String(doc.state_name)}` : "";
    return `${district}${state}`;
  }

  const seo = doc.seo as { on_page_title?: string } | undefined;
  return seo?.on_page_title || String(doc.slug ?? "").replace(/-/g, " ");
}

/**
 * Matches a page by its id in either spelling.
 *
 * `ObjectId.isValid` also accepts any 12-character string, so the hex
 * round-trip is what tells a real ObjectId from a slug-shaped id.
 */
export function idFilter(id: string) {
  const asObjectId =
    ObjectId.isValid(id) && new ObjectId(id).toHexString() === id
      ? new ObjectId(id)
      : null;

  return asObjectId ? { $or: [{ _id: id }, { _id: asObjectId }] } : { _id: id };
}

/** Fields worth matching a search box against, per collection. */
export function searchFilter(kind: PageKind, term: string) {
  const rx = { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

  if (kind === "state") return { $or: [{ slug: rx }, { state_name: rx }] };

  if (kind === "district") {
    return { $or: [{ slug: rx }, { district_name: rx }, { state_name: rx }] };
  }

  return { $or: [{ slug: rx }, { "seo.on_page_title": rx }, { location_name: rx }] };
}
