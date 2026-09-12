import { NextRequest, NextResponse } from "next/server";

import { getLocationReviewsCollection } from "@/lib/auth/db";
import { getSession } from "@/lib/auth/session";

/**
 * What a place is rated on.
 *
 * Four scores rather than one, because "how is it here" is four questions a
 * visitor answers differently: a locality can be well connected and choked
 * with traffic at once, and an average of the two says neither.
 *
 * The keys are what goes in the database; the labels are the panel's business,
 * so a wording change never has to touch stored rows.
 */
export const REVIEW_CATEGORIES = [
  "connectivity",
  "lifestyle",
  "safety",
  "environment",
  "value",
  "civic",
] as const;

/** How the reviewer knows the place. Stored as given, checked against this. */
const RELATIONSHIPS = new Set([
  "prospective_buyer",
  "property_owner",
  "tenant",
  "current_resident",
  "former_resident",
  "real_estate_agent",
  "frequent_visitor",
]);

const TENURES = new Set([
  "under_6_months",
  "6_24_months",
  "2_5_years",
  "5_plus_years",
]);

/** A byline, or none. Anonymous still stores the author — it only hides them. */
const DISPLAY_MODES = new Set(["name", "anonymous"]);

function oneOf(value: unknown, allowed: Set<string>) {
  return typeof value === "string" && allowed.has(value) ? value : "";
}

type Category = (typeof REVIEW_CATEGORIES)[number];

const MAX_STARS = 5;

/** Long enough to say something, short of an essay nobody will read. */
const MAX_REVIEW_LENGTH = 1500;

function cleanRatings(value: unknown) {
  if (!value || typeof value !== "object") return null;

  const source = value as Record<string, unknown>;
  const ratings: Partial<Record<Category, number>> = {};

  for (const category of REVIEW_CATEGORIES) {
    const score = source[category];
    if (score === undefined || score === null) continue;

    const stars = Number(score);
    if (!Number.isInteger(stars) || stars < 1 || stars > MAX_STARS) return null;

    ratings[category] = stars;
  }

  return ratings;
}

/**
 * The scores a place has collected, averaged per category.
 *
 * Averaged here rather than in the page: the rows are the only place that
 * knows how many there are, and a category nobody has rated has to come back
 * absent rather than as a zero, which would read as a score of nothing.
 */
export async function GET(request: NextRequest) {
  const slug = (request.nextUrl.searchParams.get("slug") ?? "").trim();
  if (!slug)
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  try {
    const reviews = await getLocationReviewsCollection();
    const rows = await reviews
      .find({ slug }, { projection: { _id: 0, ratings: 1 } })
      .limit(5000)
      .toArray();

    const totals: Partial<Record<Category, { sum: number; count: number }>> =
      {};

    for (const row of rows) {
      const ratings =
        (row as { ratings?: Record<string, number> }).ratings ?? {};

      for (const category of REVIEW_CATEGORIES) {
        const stars = ratings[category];
        if (typeof stars !== "number") continue;

        const total = (totals[category] ??= { sum: 0, count: 0 });
        total.sum += stars;
        total.count += 1;
      }
    }

    const averages: Partial<Record<Category, number>> = {};
    for (const category of REVIEW_CATEGORIES) {
      const total = totals[category];
      if (total)
        averages[category] = Number((total.sum / total.count).toFixed(1));
    }

    return NextResponse.json({ slug, total: rows.length, averages });
  } catch {
    // A place with no scores to show and a place we could not reach look the
    // same to the panel, which simply shows nothing either way.
    return NextResponse.json({ slug, total: 0, averages: {} });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Please sign in to leave a review" },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  if (!slug) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }

  const ratings = cleanRatings(body.ratings);
  if (!ratings) {
    return NextResponse.json(
      { error: `Ratings must be between 1 and ${MAX_STARS} stars` },
      { status: 400 },
    );
  }

  // Two halves, asked separately: what was good and what was not. A single
  // box gets one or the other, and the half left out is the half a reader
  // most wants.
  const positive =
    typeof body.positive === "string" ? body.positive.trim() : "";
  const negative =
    typeof body.negative === "string" ? body.negative.trim() : "";

  if (
    positive.length > MAX_REVIEW_LENGTH ||
    negative.length > MAX_REVIEW_LENGTH
  ) {
    return NextResponse.json(
      { error: `Please keep each part under ${MAX_REVIEW_LENGTH} characters` },
      { status: 400 },
    );
  }

  // Something to go on, not nothing: a row with no scores and no words is a
  // submission that says nothing.
  if (Object.keys(ratings).length === 0 && !positive && !negative) {
    return NextResponse.json(
      { error: "Rate at least one thing, or write a line" },
      { status: 400 },
    );
  }

  try {
    const reviews = await getLocationReviewsCollection();

    // One review per person per place, replaced rather than added to. Someone
    // coming back has changed their mind about somewhere they already rated,
    // and two rows from one visitor would weigh twice in the averages.
    await reviews.updateOne(
      { slug, user_id: session.userId },
      {
        $set: {
          slug,
          user_id: session.userId,
          author_name: session.name,
          state: typeof body.state === "string" ? body.state.trim() : "",
          district:
            typeof body.district === "string" ? body.district.trim() : "",
          relationship: oneOf(body.relationship, RELATIONSHIPS),
          tenure: oneOf(body.tenure, TENURES),
          // Anonymous hides the byline, it does not drop the author: a review
          // still has to be traceable to one account, which is what keeps it
          // to one per person.
          display_as: oneOf(body.display_as, DISPLAY_MODES) || "name",
          recommends:
            typeof body.recommends === "boolean" ? body.recommends : null,
          ratings,
          positive,
          negative,
          updated_at: new Date(),
        },
        $setOnInsert: { created_at: new Date() },
      },
      { upsert: true },
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not save your review. Please try again." },
      { status: 503 },
    );
  }
}
