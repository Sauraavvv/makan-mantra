import { NextRequest, NextResponse } from "next/server";

import { getUsersCollection } from "@/lib/auth/db";
import { PURGE_AFTER_DAYS, purgeCutoff } from "@/lib/auth/deactivation";
import { deleteAccount } from "@/lib/auth/delete-account";

/**
 * Erases accounts that have sat deactivated past the grace period.
 *
 * Meant to be hit by a scheduler; `?dry=1` reports what it would remove without
 * touching anything. Failures are collected rather than thrown: one account
 * whose files will not delete must not stop the rest of the run.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get("dry") === "1";
  const cutoff = purgeCutoff();

  try {
    const users = await getUsersCollection();
    const due = await users
      .find(
        { is_active: false, deactivated_at: { $lt: cutoff } },
        { projection: { _id: 1, email: 1, deactivated_at: 1 } },
      )
      .toArray();

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        graceDays: PURGE_AFTER_DAYS,
        cutoff,
        due: due.length,
        accounts: due.map((u) => ({ email: u.email, deactivatedAt: u.deactivated_at })),
      });
    }

    const purged: string[] = [];
    const failed: { email: string; error: string }[] = [];

    for (const user of due) {
      const result = await deleteAccount(user._id.toString(), user.email);
      if (result.ok) purged.push(user.email);
      else failed.push({ email: user.email, error: result.error ?? "unknown" });
    }

    return NextResponse.json({
      dryRun: false,
      graceDays: PURGE_AFTER_DAYS,
      cutoff,
      due: due.length,
      purged: purged.length,
      failed,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Purge failed" },
      { status: 500 },
    );
  }
}
