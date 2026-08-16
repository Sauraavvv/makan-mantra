import { NextRequest, NextResponse } from "next/server";

import {
  getRecentPropertiesCollection,
  getRecentSearchesCollection,
  getSavedPropertiesCollection,
  type RecentSearchEntry,
} from "@/lib/auth/db";
import { getLiveSession } from "@/lib/auth/session";
import { mergeSearches, readSearches } from "@/lib/recent-searches";

const NO_STORE = { "cache-control": "no-store" };

/** Matches the client's caps; the account keeps no more than the device did. */
const VIEW_LIMIT = 12;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function date(value: unknown) {
  const parsed = new Date(text(value) || Date.now());
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function list(value: unknown) {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

/**
 * Takes what a visitor did before they had an account and files it under the
 * one they now have.
 *
 * Merged, never replaced: someone who signed in on a second device already has
 * a history there, and this device's copy joins it rather than wiping it. Every
 * merge is by key — search label, property id — so a repeated call changes
 * nothing, which is what lets the client retry a failed claim safely.
 */
export async function POST(request: NextRequest) {
  const session = await getLiveSession();
  if (!session) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const guestSearches: RecentSearchEntry[] = list(body.searches)
    .map((search) => {
      const label = text(search.label);
      if (!label) return null;

      return {
        label,
        tab: text(search.tab),
        category: text(search.category),
        query: text(search.query) || label,
        searched_at: date(search.searchedAt),
      } satisfies RecentSearchEntry;
    })
    .filter((search): search is RecentSearchEntry => search !== null);

  const guestViews = list(body.views)
    .map((view) => ({
      propertyId: text(view.propertyId),
      snapshot: (view.snapshot ?? {}) as Record<string, unknown>,
      viewedAt: date(view.viewedAt),
    }))
    .filter((view) => view.propertyId);

  const guestSaves = list(body.saves)
    .map((save) => ({ propertyId: text(save.propertyId), savedAt: date(save.savedAt) }))
    .filter((save) => save.propertyId)
    .sort((left, right) => right.savedAt.getTime() - left.savedAt.getTime());

  try {
    if (guestSearches.length > 0) {
      const searches = await getRecentSearchesCollection();
      const doc = await searches.findOne({ user_id: session.userId });

      // The account's own history wins a tie: a search made while signed in is
      // the more recent fact about the same words.
      await searches.updateOne(
        { user_id: session.userId },
        {
          $set: {
            user_id: session.userId,
            searches: mergeSearches(readSearches(doc?.searches), guestSearches),
            updated_at: new Date(),
          },
        },
        { upsert: true },
      );
    }

    if (guestViews.length > 0) {
      const recent = await getRecentPropertiesCollection();

      await Promise.all(
        guestViews.map((view) =>
          recent.updateOne(
            { user_id: session.userId, property_id: view.propertyId },
            {
              // A view already on the account is the later one, so only the
              // snapshot is refreshed and its own timestamp stands.
              $setOnInsert: {
                user_id: session.userId,
                property_id: view.propertyId,
                viewed_at: view.viewedAt,
              },
              $set: {
                snapshot: {
                  title: text(view.snapshot.title),
                  price: text(view.snapshot.price),
                  locality: text(view.snapshot.locality),
                  city: text(view.snapshot.city),
                  image: text(view.snapshot.image),
                  config: text(view.snapshot.config),
                  area: text(view.snapshot.area),
                },
              },
            },
            { upsert: true },
          ),
        ),
      );

      const stale = await recent
        .find({ user_id: session.userId })
        .sort({ viewed_at: -1 })
        .skip(VIEW_LIMIT)
        .project({ _id: 1 })
        .toArray();

      if (stale.length > 0) {
        await recent.deleteMany({ _id: { $in: stale.map((item) => item._id) } });
      }
    }

    if (guestSaves.length > 0) {
      const saved = await getSavedPropertiesCollection();
      const doc = await saved.findOne({ user_id: session.userId });
      const existing = Array.isArray(doc?.property_ids) ? doc.property_ids : [];

      // Account first: the shortlist's order is the order it is read back in,
      // and what the visitor saved while signed in belongs at the top.
      const ids = [...new Set([...existing, ...guestSaves.map((save) => save.propertyId)])];

      await saved.updateOne(
        { user_id: session.userId },
        { $set: { user_id: session.userId, property_ids: ids, updated_at: new Date() } },
        { upsert: true },
      );
    }

    return NextResponse.json(
      {
        claimed: {
          searches: guestSearches.length,
          views: guestViews.length,
          saves: guestSaves.length,
        },
      },
      { headers: NO_STORE },
    );
  } catch {
    // The client keeps its copy on anything but a 200, so this is a retry, not a loss.
    return NextResponse.json({ error: "Could not move your activity" }, { status: 503 });
  }
}
