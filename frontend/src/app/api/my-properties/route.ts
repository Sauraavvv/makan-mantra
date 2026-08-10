import { NextRequest, NextResponse } from "next/server";

import { getPropertySubmissionsCollection } from "@/lib/auth/db";
import { getLiveSession } from "@/lib/auth/session";
import { deleteAsset, type UploadedAsset } from "@/lib/cloudinary";

const NO_STORE = { "cache-control": "no-store" };

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Ownership is part of the filter, so someone else's PID simply matches nothing
 * rather than needing a second round trip to check.
 */
function ownedBy(pid: string, userId: string, email: string) {
  return {
    pid,
    $or: [{ user_id: userId }, { user_email: email }, { owner_email: email }],
  };
}

/** Marking a property sold, or putting it back on the market. */
export async function PATCH(req: NextRequest) {
  const session = await getLiveSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const pid = text(body.pid);
  const action = text(body.action);

  if (!pid) {
    return NextResponse.json({ error: "Missing property" }, { status: 400 });
  }
  if (action !== "sold" && action !== "relist") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  try {
    const submissions = await getPropertySubmissionsCollection();
    const updates =
      action === "sold"
        ? { status: "sold", sold_at: new Date() }
        : { status: "pending_review", sold_at: null };

    const result = await submissions.updateOne(
      ownedBy(pid, session.userId, session.email),
      { $set: updates },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    return NextResponse.json({ status: updates.status }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Could not update that property" }, { status: 503 });
  }
}

/**
 * Removes a property for good — its media on Cloudinary and then the document,
 * the same order the admin panel uses.
 *
 * Media goes first: if a delete fails the document stays, so the owner can
 * retry. Dropping the document first would leave assets nobody can find, and
 * the draft sweeper ignores them once they carry a `listing_` tag.
 */
export async function DELETE(req: NextRequest) {
  const session = await getLiveSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }

  const pid = text(req.nextUrl.searchParams.get("pid"));
  if (!pid) {
    return NextResponse.json({ error: "Missing property" }, { status: 400 });
  }

  try {
    const submissions = await getPropertySubmissionsCollection();
    const filter = ownedBy(pid, session.userId, session.email);
    const doc = await submissions.findOne(filter);

    if (!doc) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const media: UploadedAsset[] = doc.media ?? doc.images ?? [];
    const failed: string[] = [];

    for (const asset of media) {
      if (!asset?.public_id) continue;

      const ok = await deleteAsset(
        asset.public_id,
        asset.kind === "video" ? "video" : "image",
      ).catch(() => false);

      if (!ok) failed.push(asset.public_id);
    }

    if (failed.length > 0) {
      return NextResponse.json(
        {
          error: `Could not delete ${failed.length} file${
            failed.length === 1 ? "" : "s"
          } from storage. Nothing was removed — please try again.`,
        },
        { status: 502 },
      );
    }

    await submissions.deleteOne(filter);

    return NextResponse.json({ deleted: true }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Could not remove that property" }, { status: 503 });
  }
}
