import { NextRequest, NextResponse } from "next/server";

import { rankReels, type ReelSearch } from "@/lib/reels";

const NO_STORE = { "cache-control": "no-store" };
const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;

function text(value: unknown, max = 120) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * One page of the Reels feed.
 *
 * POST because the ranking input is the visitor's search history, which for a
 * signed-out visitor exists only on their device — the client sends it along.
 *
 * Body: { searches?: ReelSearch[], cursor?: number, limit?: number, start?: string }
 * `start` (first page only) pins one property to the top — the reel a shared
 * `/reels?p=<id>` link points at.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // An empty or malformed body is just an unpersonalised first page.
  }

  const searches: ReelSearch[] = (Array.isArray(body.searches) ? body.searches : [])
    .slice(0, 10)
    .map((raw) => {
      const entry = (raw ?? {}) as Record<string, unknown>;
      return {
        label: text(entry.label),
        tab: text(entry.tab, 20),
        category: text(entry.category, 40),
        query: text(entry.query),
      };
    })
    .filter((entry) => entry.label);

  const cursor = Math.max(0, Math.floor(Number(body.cursor) || 0));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(Number(body.limit) || DEFAULT_LIMIT)));
  const start = text(body.start, 80);

  let ranked = rankReels(searches);

  if (start) {
    const pinned = ranked.find((reel) => reel.id === start);
    if (pinned) ranked = [{ ...pinned, because: null }, ...ranked.filter((reel) => reel !== pinned)];
  }

  const items = ranked.slice(cursor, cursor + limit);
  const next = cursor + items.length;

  return NextResponse.json(
    { items, nextCursor: next < ranked.length ? next : null, total: ranked.length },
    { headers: NO_STORE },
  );
}
