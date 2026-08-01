import { NextRequest, NextResponse } from "next/server";
import { getLocationPagesCollection } from "@/lib/auth/db";
import { canonicalStateName } from "@/lib/state-routes";

/**
 * Cities we cover in a state, read from the `location_pages` SEO corpus.
 * Many pages only carry a district, so districts fill in when city data is thin.
 */
export async function GET(req: NextRequest) {
  const requested = req.nextUrl.searchParams.get("state")?.trim();

  if (!requested) {
    return NextResponse.json({ error: "state is required" }, { status: 400 });
  }

  const state = canonicalStateName(requested);

  if (!state) {
    return NextResponse.json({ error: "Unknown state" }, { status: 400 });
  }

  try {
    const pages = await getLocationPagesCollection();
    const filter = {
      "location.state": { $regex: `^${state.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
      is_active: { $ne: false },
    };

    const [cities, districts] = await Promise.all([
      pages.distinct("location.city", filter),
      pages.distinct("location.district", filter),
    ]);

    const names = new Set<string>();
    for (const value of [...cities, ...districts]) {
      const name = typeof value === "string" ? value.trim() : "";
      if (name) names.add(name);
    }

    return NextResponse.json({
      state,
      cities: [...names].sort((a, b) => a.localeCompare(b)),
    });
  } catch {
    return NextResponse.json({ state, cities: [] });
  }
}
