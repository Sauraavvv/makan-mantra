import { NextRequest, NextResponse } from "next/server";

import { getRecentSearchesCollection } from "@/lib/auth/db";
import { getLiveSession } from "@/lib/auth/session";

const HISTORY_LIMIT = 10;
const NO_STORE = { "cache-control": "no-store" };

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  const session = await getLiveSession();
  if (!session) return NextResponse.json({ items: [] }, { headers: NO_STORE });

  try {
    const searches = await getRecentSearchesCollection();
    const doc = await searches.findOne({ user_id: session.userId });
    const history = Array.isArray(doc?.searches) ? doc.searches.slice(0, HISTORY_LIMIT) : [];

    return NextResponse.json(
      {
        items: history.map((label, index) => ({
          id: `search-${index}`,
          label,
          tab: "Buy",
          category: "All Residential",
          query: label,
          searchedAt: "",
        })),
      },
      { headers: NO_STORE },
    );
  } catch {
    return NextResponse.json({ error: "Could not load recent searches" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getLiveSession();
  if (!session) return NextResponse.json({ saved: false }, { status: 200, headers: NO_STORE });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const label = text(body.label);
  if (!label) return NextResponse.json({ error: "Missing search keyword" }, { status: 400 });

  try {
    const searches = await getRecentSearchesCollection();
    await searches.updateOne(
      { user_id: session.userId },
      [
        {
          $set: {
            user_id: session.userId,
            searches: {
              $slice: [
                {
                  $concatArrays: [
                    [label],
                    {
                      $filter: {
                        input: { $ifNull: ["$searches", []] },
                        as: "search",
                        cond: { $ne: [{ $toLower: "$$search" }, label.toLowerCase()] },
                      },
                    },
                  ],
                },
                HISTORY_LIMIT,
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
    return NextResponse.json({ error: "Could not save recent search" }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getLiveSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to manage search history" }, { status: 401 });
  }

  const clearAll = request.nextUrl.searchParams.get("all") === "1";
  const label = text(request.nextUrl.searchParams.get("label"));

  if (!clearAll && !label) {
    return NextResponse.json({ error: "Missing search" }, { status: 400 });
  }

  try {
    const searches = await getRecentSearchesCollection();
    const result = await searches.updateOne(
      { user_id: session.userId },
      [
        {
          $set: {
            searches: clearAll
              ? []
              : {
                  $filter: {
                    input: { $ifNull: ["$searches", []] },
                    as: "search",
                    cond: { $ne: [{ $toLower: "$$search" }, label.toLowerCase()] },
                  },
                },
            updated_at: "$$NOW",
          },
        },
      ],
    );

    return NextResponse.json({ updated: result.modifiedCount > 0 }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Could not update search history" }, { status: 503 });
  }
}
