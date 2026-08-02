import { NextRequest, NextResponse } from "next/server";
import { deleteAbandonedDrafts, isCloudinaryConfigured } from "@/lib/cloudinary";

/**
 * Deletes uploads older than a day that never made it onto a submission.
 * Meant to be hit by a scheduler; `?dry=1` reports what it would remove
 * without touching anything.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: "Cloudinary is not configured" }, { status: 503 });
  }

  const dryRun = request.nextUrl.searchParams.get("dry") === "1";

  try {
    const result = await deleteAbandonedDrafts({ dryRun });
    return NextResponse.json({ dryRun, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cleanup failed" },
      { status: 500 },
    );
  }
}
