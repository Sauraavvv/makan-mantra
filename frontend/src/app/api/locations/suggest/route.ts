import { NextRequest, NextResponse } from "next/server";
import { getLocationPagesCollection } from "@/lib/auth/db";

/**
 * Type-ahead over the location pages themselves.
 *
 * Every row in `location_pages` is one combination of place, property type and
 * listing type, and it already carries the slug of the page that combination
 * leads to. So the search bar's tabs are not decoration applied after the
 * fact: the property type and Buy/Rent narrow the search here, and what comes
 * back is the exact page for that place under those filters. Switching from
 * Flat to Villa really does change where "Gurugram" goes.
 *
 * `location_name` is what is matched. It holds the place's own name for every
 * category — checked across all 13,790 rows, no state, district or city page
 * disagrees with its own `location.*` field — so one field answers all three.
 */

/** Short of this a search matches most of the country, which helps nobody. */
const MIN_QUERY_LENGTH = 3;

const MAX_RESULTS = 8;

/**
 * What a place's link points at when the search is not narrowed to a type.
 *
 * Every row is one place under one property type and one listing type, so with
 * neither chosen a place has up to sixteen rows and the de-duplication below
 * has to keep one of them. It keeps this pair — the same default the rest of
 * the site links to — rather than whichever row the database happened to
 * return first.
 */
const PREFERRED_PROPERTY_TYPE = "flat";
const PREFERRED_LISTING_TYPE = "sale";

/** What the site stores, so a hand-typed query cannot reach for anything else. */
const PROPERTY_TYPES = new Set([
  "flat",
  "villa",
  "pg",
  "plot",
  "shop",
  "showroom",
  "office_space",
  "builder_floor",
]);

const LISTING_TYPES = new Set(["sale", "rent"]);

/**
 * City first, then district, then state.
 *
 * Someone typing a place name almost always means the town they would live in
 * rather than the district it is administered from, and a district page named
 * close to its own city — Gurgaon the district, Gurugram the city — would
 * otherwise sit above the page they meant.
 */
const CATEGORY_RANK: Record<string, number> = { city: 0, district: 1, state: 2 };

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type Row = {
  slug?: string;
  location_name?: string;
  location_category?: string;
  property_type?: string;
  listing_type?: string;
  location?: { state?: string; district?: string };
};

/** Lower is kept. Ties are left alone, so the database's own order decides. */
function preferenceRank(row: Row) {
  return (
    (row.property_type === PREFERRED_PROPERTY_TYPE ? 0 : 2) +
    (row.listing_type === PREFERRED_LISTING_TYPE ? 0 : 1)
  );
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = (params.get("q") ?? "").trim();
  // Comma-separated, because property type is many-choice in the bar: a
  // visitor can ask for flats and builder floors at once. Unknown values are
  // dropped rather than refused — a hand-typed query cannot reach for
  // anything the site does not store.
  const propertyTypes = (params.get("type") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => PROPERTY_TYPES.has(value));
  const listingType = params.get("listing") ?? "";

  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ suggestions: [] });
  }

  // Both narrow the search and neither is required. Left off, the search is
  // over every page for the place — which is what the bar's filters mean when
  // they are cleared, and what they used to be unable to say: an absent type
  // returned nothing at all rather than everything.
  const narrowed: Record<string, unknown> = {};
  if (propertyTypes.length === 1) narrowed.property_type = propertyTypes[0];
  else if (propertyTypes.length > 1)
    narrowed.property_type = { $in: propertyTypes };
  if (LISTING_TYPES.has(listingType)) narrowed.listing_type = listingType;

  // A place has one row per type-and-listing pair — eight types by two
  // listings. Whatever is not pinned down multiplies the rows a place brings
  // back, so the budget is sized by what is left open rather than by how many
  // clauses were written: asking for three types is looser than asking for
  // one. Enough room that the cut below still has eight distinct places.
  const typeSpread = propertyTypes.length || PROPERTY_TYPES.size;
  const listingSpread = LISTING_TYPES.has(listingType) ? 1 : LISTING_TYPES.size;
  const rowLimit = MAX_RESULTS * 6 * typeSpread * listingSpread;

  try {
    const collection = await getLocationPagesCollection();

    // Anchored, not "contains": a leading wildcard would pull "Bangalore Rural"
    // into a search for "ang" and "New Delhi" into one for "del", which reads
    // as noise.
    const rows = (await collection
      .find(
        {
          is_active: true,
          ...narrowed,
          location_name: { $regex: `^${escapeRegex(query)}`, $options: "i" },
        },
        {
          projection: {
            _id: 0,
            slug: 1,
            location_name: 1,
            location_category: 1,
            property_type: 1,
            listing_type: 1,
            "location.state": 1,
            "location.district": 1,
          },
        },
      )
      // Room to sort and de-duplicate before the cut, rather than cutting first
      // and finding the eight rows were three places repeated.
      .limit(Math.ceil(rowLimit))
      .toArray()) as unknown as Row[];

    const seen = new Set<string>();
    const suggestions = rows
      // Ahead of the de-duplication, not after it: the first row for a place
      // is the one that survives, so the preferred pair has to be first.
      .sort((a, b) => preferenceRank(a) - preferenceRank(b))
      .map((row) => {
        const category = row.location_category ?? "";
        const name = row.location_name ?? "";
        const state = row.location?.state ?? "";
        const district = row.location?.district ?? "";

        return {
          name,
          category,
          slug: row.slug ?? "",
          // What tells two same-named places apart. A district is named by its
          // state; a city by its district, but only when that differs from the
          // city's own name — so Gurugram does not read "Gurugram, Gurugram".
          context:
            category === "state"
              ? "India"
              : category === "district"
                ? state
                : [district && district !== name ? district : "", state]
                    .filter(Boolean)
                    .join(", "),
        };
      })
      .filter((item) => {
        if (!item.name || !item.slug) return false;

        const key = `${item.category}${item.name.toLowerCase()}${item.context}`;
        if (seen.has(key)) return false;

        seen.add(key);
        return true;
      })
      .sort(
        (a, b) =>
          (CATEGORY_RANK[a.category] ?? 9) - (CATEGORY_RANK[b.category] ?? 9) ||
          a.name.localeCompare(b.name),
      )
      .slice(0, MAX_RESULTS);

    return NextResponse.json({ suggestions });
  } catch {
    // A dead lookup should leave the visitor typing, not staring at an error.
    return NextResponse.json({ suggestions: [] });
  }
}
