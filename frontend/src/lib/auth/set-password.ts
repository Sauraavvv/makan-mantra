import { createHash, randomBytes } from "node:crypto";

/** A set-password link is worth an account, so it does not linger. */
export const SET_PASSWORD_TTL_MS = 24 * 60 * 60 * 1000;

export const MIN_PASSWORD_LENGTH = 8;

/**
 * The raw token goes out in the email; only its digest is stored. A leaked
 * database dump then hands nobody a working link.
 */
export function createSetPasswordToken() {
  const token = randomBytes(32).toString("hex");

  return {
    token,
    hash: hashSetPasswordToken(token),
    expires: new Date(Date.now() + SET_PASSWORD_TTL_MS),
  };
}

export function hashSetPasswordToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * A placeholder secret for accounts created from the post-property form. It is
 * never shown to anyone — the owner replaces it through the emailed link — but
 * storing a real hash keeps the password column non-null like every other user.
 */
export function randomPassword() {
  return randomBytes(24).toString("base64url");
}

export function setPasswordUrl(origin: string, token: string) {
  return `${origin}/set-password?token=${encodeURIComponent(token)}`;
}

/**
 * Shown whether or not the address exists, so the form cannot be used to probe
 * for accounts.
 */
export const RESEND_DONE =
  "If that email needs a password, we have just sent a fresh link to it.";
