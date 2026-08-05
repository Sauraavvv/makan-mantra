/**
 * One spelling of an address, everywhere.
 *
 * Sign-up, sign-in and the post-property form all reach the same `users`
 * documents, so they have to agree on casing — otherwise an account created
 * from one entry point cannot be found from another.
 */
export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}
