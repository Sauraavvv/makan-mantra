import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * The header's Buy and Rent columns, for the visitor's state when there is one.
 *
 * A pass-through rather than its own Mongo query, though this app has the
 * collection to hand: the set is drawn with a day-based seed, and the explore
 * pages below the header already read theirs from the backend. Querying it
 * twice would mean two shuffles of the same pool and a nav that disagrees with
 * the page under it about what today's links are.
 *
 * An hour of caching, matching the explore pages — the pool only turns over at
 * midnight IST. The state rides in the URL, so each one is cached apart from
 * the others rather than the first visitor's state being served to everyone.
 */
export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get("state")?.trim();
  const url = new URL(`${API}/location-pages/quick-links-nav`);
  if (state) url.searchParams.set("state", state);

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(String(res.status));

    return NextResponse.json(await res.json());
  } catch {
    // Empty rather than an error shape: the nav renders the columns either
    // way, and a panel with nothing under a heading says as much as a panel
    // that failed to say anything.
    return NextResponse.json({ groups: [] }, { status: 503 });
  }
}
