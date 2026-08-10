import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { getUsersCollection } from "@/lib/auth/db";
import {
  createReactivateToken,
  PURGE_AFTER_DAYS,
  REACTIVATE_WINDOW_DAYS,
  reactivateUrl,
} from "@/lib/auth/deactivation";
import { deleteAccount } from "@/lib/auth/delete-account";
import { sendAccountDeactivatedEmail, sendOTPEmail } from "@/lib/auth/email";
import { normalizeEmail } from "@/lib/auth/normalize";
import { deleteSession, getLiveSession } from "@/lib/auth/session";

const NO_STORE = { "cache-control": "no-store" };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_TTL_MS = 10 * 60 * 1000;

type Action = "email_change" | "delete_account";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function newOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Starts a change that has to be proved through the mailbox.
 *
 * For an email change the code goes to the *new* address — that is the address
 * whose ownership is in question. For a deletion it goes to the current one, so
 * losing a mailbox cannot cost someone their account.
 */
export async function POST(req: NextRequest) {
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

  const action = text(body.action) as Action;
  if (action !== "email_change" && action !== "delete_account") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const newEmail = action === "email_change" ? normalizeEmail(text(body.newEmail)) : "";

  if (action === "email_change") {
    if (!EMAIL_PATTERN.test(newEmail)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (newEmail === normalizeEmail(session.email)) {
      return NextResponse.json({ error: "That is already your email" }, { status: 400 });
    }
  }

  try {
    const users = await getUsersCollection();

    if (action === "email_change") {
      const taken = await users.findOne({ email: newEmail }, { projection: { _id: 1 } });
      if (taken) {
        return NextResponse.json({ error: "That email is already in use" }, { status: 409 });
      }
    }

    const otp = newOtp();
    await users.updateOne(
      { _id: new ObjectId(session.userId) },
      {
        $set: {
          account_action: {
            kind: action,
            otp,
            expires: new Date(Date.now() + OTP_TTL_MS),
            ...(action === "email_change" ? { new_email: newEmail } : {}),
          },
        },
      },
    );

    const target = action === "email_change" ? newEmail : session.email;
    let sent = false;
    let devOtp: string | undefined;

    try {
      await sendOTPEmail(target, session.name || "there", otp);
      sent = true;
    } catch (error) {
      console.error("[account] otp email failed:", error);
      // Same fallback the signup flow uses, so the change can still be walked
      // through before a sending domain is verified.
      if (process.env.NODE_ENV !== "production") devOtp = otp;
    }

    return NextResponse.json({ sent, sentTo: target, devOtp }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Could not start that change" }, { status: 503 });
  }
}

/**
 * Switches the account off without destroying anything.
 *
 * No code is asked for here, unlike deleting: this is reversible, and the email
 * that goes out is itself the safety net — whoever owns the mailbox can undo it
 * even if they were not the one who pressed the button.
 */
export async function PATCH(req: NextRequest) {
  const session = await getLiveSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }

  try {
    const users = await getUsersCollection();
    const reactivate = createReactivateToken();

    await users.updateOne(
      { _id: new ObjectId(session.userId) },
      {
        $set: {
          is_active: false,
          deactivated_at: new Date(),
          reactivate_token: reactivate.hash,
          reactivate_expires: reactivate.expires,
          account_action: null,
        },
      },
    );

    const link = reactivateUrl(req.nextUrl.origin, reactivate.token);
    let sent = false;
    let devLink: string | undefined;

    try {
      await sendAccountDeactivatedEmail(session.email, session.name || "there", {
        link,
        reactivateDays: REACTIVATE_WINDOW_DAYS,
        purgeDays: PURGE_AFTER_DAYS,
      });
      sent = true;
    } catch (error) {
      console.error("[account] deactivation email failed:", error);
      if (process.env.NODE_ENV !== "production") devLink = link;
    }

    await deleteSession();

    return NextResponse.json(
      { done: "deactivated", signedOut: true, emailSent: sent, reactivateBy: reactivate.expires, devLink },
      { headers: NO_STORE },
    );
  } catch {
    return NextResponse.json({ error: "Could not deactivate your account" }, { status: 503 });
  }
}

/** Confirms the code and applies the change. */
export async function PUT(req: NextRequest) {
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

  const otp = text(body.otp);
  if (!otp) {
    return NextResponse.json({ error: "Enter the code we emailed you" }, { status: 400 });
  }

  try {
    const users = await getUsersCollection();
    const user = await users.findOne({ _id: new ObjectId(session.userId) });
    const pending = user?.account_action;

    if (!pending) {
      return NextResponse.json({ error: "Nothing is waiting to be confirmed" }, { status: 400 });
    }
    if (new Date() > new Date(pending.expires)) {
      return NextResponse.json({ error: "That code has expired — send a new one" }, { status: 400 });
    }
    if (pending.otp !== otp) {
      return NextResponse.json({ error: "That code is not right" }, { status: 400 });
    }

    if (pending.kind === "email_change") {
      // Taken in the meantime? Better to fail here than to collide on write.
      const taken = await users.findOne(
        { email: pending.new_email, _id: { $ne: new ObjectId(session.userId) } },
        { projection: { _id: 1 } },
      );
      if (taken) {
        return NextResponse.json({ error: "That email is already in use" }, { status: 409 });
      }

      await users.updateOne(
        { _id: new ObjectId(session.userId) },
        {
          // The new address just proved itself, so it lands verified.
          $set: { email: pending.new_email, email_verified: true, account_action: null },
        },
      );

      // The session still carries the old address; a fresh sign-in reissues it.
      await deleteSession();
      return NextResponse.json({ done: "email_change", signedOut: true }, { headers: NO_STORE });
    }

    // Erases the account outright — properties, shortlist, history and every
    // file they uploaded. A storage failure leaves everything in place and is
    // reported, so the owner can try again rather than half-lose an account.
    const result = await deleteAccount(session.userId, session.email);

    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Could not close your account" }, { status: 502 });
    }

    await deleteSession();
    return NextResponse.json(
      { done: "deleted", signedOut: true, removed: result.removed },
      { headers: NO_STORE },
    );
  } catch {
    return NextResponse.json({ error: "Could not confirm that change" }, { status: 503 });
  }
}
