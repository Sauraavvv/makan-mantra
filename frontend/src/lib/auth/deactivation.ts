import { createHash, randomBytes } from "node:crypto";

const DAY_MS = 24 * 60 * 60 * 1000;

/** How long the emailed link keeps working. */
export const REACTIVATE_WINDOW_DAYS = 15;

/**
 * How long the data itself survives.
 *
 * The extra fortnight past the reactivation window is deliberate: it is the
 * margin in which someone who missed the link can still write in and be put
 * back, before anything is actually destroyed.
 */
export const PURGE_AFTER_DAYS = 30;

export const REACTIVATE_WINDOW_MS = REACTIVATE_WINDOW_DAYS * DAY_MS;
export const PURGE_AFTER_MS = PURGE_AFTER_DAYS * DAY_MS;

/**
 * The raw token goes out in the email; only its digest is stored, so a leaked
 * database dump hands nobody a working link.
 */
export function createReactivateToken() {
  const token = randomBytes(32).toString("hex");

  return {
    token,
    hash: hashReactivateToken(token),
    expires: new Date(Date.now() + REACTIVATE_WINDOW_MS),
  };
}

export function hashReactivateToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function reactivateUrl(origin: string, token: string) {
  return `${origin}/reactivate?token=${encodeURIComponent(token)}`;
}

/** The cut-off a purge run compares `deactivated_at` against. */
export function purgeCutoff(now = new Date()) {
  return new Date(now.getTime() - PURGE_AFTER_MS);
}
