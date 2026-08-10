import { NextRequest, NextResponse } from "next/server";

import { getSavedPropertiesCollection } from "@/lib/auth/db";
import { getLiveSession } from "@/lib/auth/session";
import { resolvePropertySummary } from "@/lib/property-summary";

const NO_STORE = { "cache-control": "no-store" };

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * The visitor's shortlist.
 *
 * `ids` alone is enough to light up every heart on a listing page, so the
 * cards do not have to carry the whole saved payload around.
 */
export async function GET() {
  const session = await getLiveSession();
  if (!session) {
    return NextResponse.json({ items: [], ids: [] }, { headers: NO_STORE });
  }

  try {
    const saved = await getSavedPropertiesCollection();
    const doc = await saved.findOne({ user_id: session.userId });
    const ids = Array.isArray(doc?.property_ids)
      ? [...new Set(doc.property_ids.filter((id) => typeof id === "string" && id.trim()))]
      : [];

    return NextResponse.json(
      {
        ids,
        items: ids.map(resolvePropertySummary).filter((item) => item !== null),
      },
      { headers: NO_STORE },
    );
  } catch {
    return NextResponse.json({ error: "Could not load your shortlist" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getLiveSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to save properties" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const propertyId = text(body.propertyId);
  if (!propertyId) {
    return NextResponse.json({ error: "Missing property" }, { status: 400 });
  }

  try {
    const saved = await getSavedPropertiesCollection();
    await saved.updateOne(
      { user_id: session.userId },
      [
        {
          $set: {
            user_id: session.userId,
            property_ids: {
              $concatArrays: [
                [propertyId],
                {
                  $filter: {
                    input: { $ifNull: ["$property_ids", []] },
                    as: "propertyId",
                    cond: { $ne: ["$$propertyId", propertyId] },
                  },
                },
              ],
            },
            updated_at: "$$NOW",
          },
        },
      ],
      { upsert: true },
    );

    return NextResponse.json({ saved: true }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Could not save this property" }, { status: 503 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getLiveSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to manage your shortlist" }, { status: 401 });
  }

  const propertyId = text(req.nextUrl.searchParams.get("propertyId"));
  if (!propertyId) {
    return NextResponse.json({ error: "Missing property" }, { status: 400 });
  }

  try {
    const saved = await getSavedPropertiesCollection();
    await saved.updateOne(
      { user_id: session.userId },
      {
        $pull: { property_ids: propertyId },
        $set: { updated_at: new Date() },
      },
    );

    return NextResponse.json({ saved: false }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Could not update your shortlist" }, { status: 503 });
  }
}
