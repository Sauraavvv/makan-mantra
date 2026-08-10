import { NextResponse } from "next/server";

import { getLocationPagesCollection } from "@/lib/auth/db";

const NO_STORE = { "cache-control": "no-store" };

export async function GET() {
  try {
    const pages = await getLocationPagesCollection();
    const values = await pages.distinct("location.state", { is_active: { $ne: false } });
    const names = new Map<string, string>();

    for (const value of values) {
      const state = typeof value === "string" ? value.trim() : "";
      if (state) names.set(state.toLowerCase(), state);
    }

    return NextResponse.json(
      { states: [...names.values()].sort((a, b) => a.localeCompare(b)) },
      { headers: NO_STORE },
    );
  } catch {
    return NextResponse.json({ states: [] }, { headers: NO_STORE });
  }
}
