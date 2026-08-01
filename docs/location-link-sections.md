# Location link sections on state pages — parked

Status: **needs rework.** The first pass is built and live on state pages, but the
layout/approach is not what we want. Parked to pick up later.

## What was asked

On a state page (e.g. `/explore-haryana`) show the generated location-page URLs in a
defined order, in two sections:

1. **Property type pages built on the state name** — e.g. showroom, shop, pg, flat …
   pages for Haryana.
2. **Hierarchy pages by district** — each district under the state, plus the cities
   that carry that district in their hierarchy.

Decisions taken during the first pass:

- Section 1 grouped into **For Sale / For Rent**.
- Section 2 shows **district name + its cities** (no per-property-type links inside).

## What exists today

### Backend

`GET /location-pages/links/{state}` — [`backend/routers/location_pages.py`](../backend/routers/location_pages.py)

Reads every active `location_pages` doc for the state and groups them:

```json
{
  "state": "Haryana",
  "property_pages": [{ "slug": "...", "property_type": "flat", "listing_type": "sale" }],
  "districts": [
    { "name": "Ambala", "slug": "flats-for-sale-in-ambala-haryana",
      "cities": [{ "name": "Ambala Sadar", "slug": "flats-for-sale-in-ambala-sadar" }] }
  ]
}
```

Each district/city has ~14 pages (property type × listing type), so the endpoint picks a
representative slug — preferring `flat` + `sale`, else the first one found.

### Frontend

- [`src/components/site/location-link-sections.tsx`](../frontend/src/components/site/location-link-sections.tsx)
  — `PropertyTypeLinks` and `DistrictCityLinks`.
- [`src/app/(marketing)/[state]/page.tsx`](../frontend/src/app/(marketing)/[state]/page.tsx)
  — fetches via `getLocationLinkSections()` and renders both sections right after
  "Top Builders". District pages skip these sections.

## Data notes (Haryana sample)

| Level | Pages |
| --- | --- |
| state | 14 |
| district | 294 (~21 districts × 14) |
| city | 252 |

- Districts found: 22. Several (Fatehabad, Gurgaon, Mewat, Jind) have **no city pages**
  in the DB yet, so their cards show only the district name.
- `Gurgaon` and `Gurugram` both exist as separate districts in the data — duplicates like
  this need cleaning up when we revisit.

## Open questions for the rework

- What ordering/grouping is actually wanted instead of the current two cards?
- Should each district expose all 14 property-type links (accordion?) rather than one
  representative link?
- Should these sections also appear on district and city pages, with the level below?
- Do we keep the "pick a representative slug" behaviour, or link to a district landing
  page that does not exist yet?

## To hide it in the meantime

Remove the two `linkSections && …` blocks in `[state]/page.tsx`; the endpoint and the
component can stay untouched.
