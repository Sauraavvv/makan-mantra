import { NextRequest, NextResponse } from "next/server";

import { getRecentSearchesCollection, type RecentSearchEntry } from "@/lib/auth/db";
import { getLiveSession } from "@/lib/auth/session";
import { mergeSearches, readSearches } from "@/lib/recent-searches";

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
    const history = readSearches(doc?.searches);

    return NextResponse.json(
      {
        items: history.map((entry, index) => ({
          id: `search-${index}`,
          label: entry.label,
          tab: entry.tab,
          category: entry.category,
          query: entry.query,
          // Epoch stands for "we never recorded this", which the client reads as
          // an unknown time rather than as 1970.
          searchedAt:
            entry.searched_at.getTime() === 0 ? "" : entry.searched_at.toISOString(),
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

  const searchedAt = new Date(text(body.searchedAt) || Date.now());

  const entry: RecentSearchEntry = {
    label,
    tab: text(body.tab),
    category: text(body.category),
    query: text(body.query) || label,
    searched_at: Number.isNaN(searchedAt.getTime()) ? new Date() : searchedAt,
  };

  try {
    const searches = await getRecentSearchesCollection();

    // Read then write, rather than one update pipeline: the stored array mixes
    // entries with the older plain strings, and normalizing both inside Mongo
    // costs more than reading ten items back.
    const doc = await searches.findOne({ user_id: session.userId });
    const next = mergeSearches([entry], readSearches(doc?.searches));

    await searches.updateOne(
      { user_id: session.userId },
      { $set: { user_id: session.userId, searches: next, updated_at: new Date() } },
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
    const doc = await searches.findOne({ user_id: session.userId });
    const current = readSearches(doc?.searches);
    const next = clearAll
      ? []
      : current.filter((entry) => entry.label.toLowerCase() !== label.toLowerCase());

    const result = await searches.updateOne(
      { user_id: session.userId },
      { $set: { searches: next, updated_at: new Date() } },
    );

    return NextResponse.json({ updated: result.modifiedCount > 0 }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Could not update search history" }, { status: 503 });
  }
}
