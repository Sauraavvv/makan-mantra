"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { getAuthDbErrorMessage, getUsersCollection } from "@/lib/auth/db";
import { sendSetPasswordEmail } from "@/lib/auth/email";
import { normalizeEmail } from "@/lib/auth/normalize";
import { createSession } from "@/lib/auth/session";
import {
  createSetPasswordToken,
  hashSetPasswordToken,
  MIN_PASSWORD_LENGTH,
  setPasswordUrl,
} from "@/lib/auth/set-password";

export type SetPasswordState = { error?: string } | undefined;

export type ResendState = { error?: string; sent?: boolean; devUrl?: string } | undefined;

async function origin() {
  const list = await headers();
  const host = list.get("host") ?? "localhost:3000";
  const protocol = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

/**
 * Issues a new set-password link for an account that never activated.
 *
 * This is the way out of the dead end: a post-property account sits in `users`
 * unverified, so signing in is refused and signing up says the email is taken.
 */
export async function requestSetPasswordLinkAction(
  _prev: ResendState,
  formData: FormData,
): Promise<ResendState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));

  if (!email) return { error: "Enter your email address." };

  try {
    const users = await getUsersCollection();
    const user = await users.findOne({ email });

    // Nothing to do for unknown or already-active accounts — but the caller is
    // told the same thing either way.
    if (!user || user.email_verified) return { sent: true };

    const setPassword = createSetPasswordToken();

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          set_password_token: setPassword.hash,
          set_password_expires: setPassword.expires,
        },
      },
    );

    const link = setPasswordUrl(await origin(), setPassword.token);

    try {
      await sendSetPasswordEmail(email, user.name || "there", link);
    } catch (error) {
      console.error("[set-password] resend failed:", error);
      if (process.env.NODE_ENV !== "production") {
        return { sent: true, devUrl: link };
      }
      return { error: "We could not send the email just now. Please try again shortly." };
    }

    return { sent: true };
  } catch (error) {
    return { error: getAuthDbErrorMessage(error) };
  }
}

/**
 * Finishes an account that was opened from the post-property form.
 *
 * Holding a live token proves the mailbox belongs to the owner, so this is also
 * where the email is marked verified — until then `loginAction` keeps them out.
 */
export async function setPasswordAction(
  _prev: SetPasswordState,
  formData: FormData,
): Promise<SetPasswordState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!token) return { error: "This link is not valid." };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  if (password !== confirm) return { error: "Both passwords must match" };

  let session;

  try {
    const users = await getUsersCollection();
    const user = await users.findOne({
      set_password_token: hashSetPasswordToken(token),
      set_password_expires: { $gt: new Date() },
    });

    if (!user) {
      return { error: "This link has expired or has already been used." };
    }

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          password: await bcrypt.hash(password, 12),
          email_verified: true,
          verified_at: new Date(),
        },
        // One link, one use.
        $unset: { set_password_token: "", set_password_expires: "" },
      },
    );

    session = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role || "user",
    };
  } catch (error) {
    return { error: getAuthDbErrorMessage(error) };
  }

  await createSession(session);
  redirect("/");
}
