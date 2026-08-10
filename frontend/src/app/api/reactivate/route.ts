import { NextRequest, NextResponse } from "next/server";

import { getUsersCollection } from "@/lib/auth/db";
import { hashReactivateToken } from "@/lib/auth/deactivation";

const NO_STORE = { "cache-control": "no-store" };

/**
 * Turns a deactivated account back on from the emailed link.
 *
 * No session is required — the whole point is that the owner is signed out —
 * and none is granted either: holding the link proves the mailbox, not the
 * password, so they still sign in the normal way afterwards.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json({ error: "This link is not valid" }, { status: 400 });
  }

  try {
    const users = await getUsersCollection();
    const user = await users.findOne({ reactivate_token: hashReactivateToken(token) });

    if (!user) {
      return NextResponse.json(
        { error: "This link is not valid — it may already have been used." },
        { status: 404 },
      );
    }

    if (user.reactivate_expires && new Date() > new Date(user.reactivate_expires)) {
      return NextResponse.json(
        { error: "This link has expired. Write to us and we can still put your account back." },
        { status: 410 },
      );
    }

    await users.updateOne(
      { _id: user._id },
      {
        $set: { is_active: true },
        $unset: { deactivated_at: "", reactivate_token: "", reactivate_expires: "" },
      },
    );

    return NextResponse.json({ reactivated: true, email: user.email }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Could not reactivate your account" }, { status: 503 });
  }
}
