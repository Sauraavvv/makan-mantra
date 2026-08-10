import { NextRequest, NextResponse } from "next/server";

import { getRecentPropertiesCollection } from "@/lib/auth/db";
import { getLiveSession } from "@/lib/auth/session";

const NO_STORE = { "cache-control": "no-store" };
const HISTORY_LIMIT = 12;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  const session = await getLiveSession();
  if (!session) return NextResponse.json({ items: [] }, { headers: NO_STORE });

  try {
    const recent = await getRecentPropertiesCollection();
    const docs = await recent
      .find({ user_id: session.userId })
      .sort({ viewed_at: -1 })
      .limit(HISTORY_LIMIT)
      .toArray();

    return NextResponse.json(
      {
        items: docs.map((doc) => ({
          propertyId: doc.property_id,
          viewedAt: doc.viewed_at,
          ...doc.snapshot,
        })),
      },
      { headers: NO_STORE },
    );
  } catch {
    return NextResponse.json({ error: "Could not load recent properties" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getLiveSession();
  if (!session) return NextResponse.json({ error: "Sign in to save recent activity" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const propertyId = text(body.propertyId);
  if (!propertyId) return NextResponse.json({ error: "Missing property" }, { status: 400 });

  const snapshot = (body.snapshot ?? {}) as Record<string, unknown>;
  const viewedAt = new Date();

  try {
    const recent = await getRecentPropertiesCollection();
    await recent.updateOne(
      { user_id: session.userId, property_id: propertyId },
      {
        $set: {
          snapshot: {
            title: text(snapshot.title),
            price: text(snapshot.price),
            locality: text(snapshot.locality),
            city: text(snapshot.city),
            image: text(snapshot.image),
            config: text(snapshot.config),
            area: text(snapshot.area),
          },
          viewed_at: viewedAt,
        },
        $setOnInsert: { user_id: session.userId, property_id: propertyId },
      },
      { upsert: true },
    );

    const stale = await recent
      .find({ user_id: session.userId })
      .sort({ viewed_at: -1 })
      .skip(HISTORY_LIMIT)
      .project({ _id: 1 })
      .toArray();
    if (stale.length > 0) {
      await recent.deleteMany({ _id: { $in: stale.map((item) => item._id) } });
    }

    return NextResponse.json({ saved: true }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Could not save recent property" }, { status: 503 });
  }
}
