"use server";

import { getAuthDbErrorMessage, getNewsletterCollection } from "@/lib/auth/db";
import { normalizeEmail } from "@/lib/auth/normalize";

export type NewsletterState = { error?: string; done?: boolean } | undefined;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribeToNewsletterAction(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));

  if (!EMAIL_PATTERN.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  try {
    const subscribers = await getNewsletterCollection();

    // Re-subscribing is not an error worth showing — upsert keeps one row per
    // address and quietly refreshes it.
    await subscribers.updateOne(
      { email },
      {
        $set: { email, updated_at: new Date() },
        $setOnInsert: { created_at: new Date(), source: "footer" },
      },
      { upsert: true },
    );
  } catch (error) {
    return { error: getAuthDbErrorMessage(error) };
  }

  return { done: true };
}
