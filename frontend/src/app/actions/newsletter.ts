"use server";

import { headers } from "next/headers";
import { getAuthDbErrorMessage, getNewsletterCollection } from "@/lib/auth/db";
import { sendNewsletterWelcomeEmail } from "@/lib/auth/email";
import { normalizeEmail } from "@/lib/auth/normalize";

export type NewsletterState = { error?: string; done?: boolean } | undefined;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function origin() {
  const list = await headers();
  const host = list.get("host") ?? "localhost:3000";
  const protocol = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

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

  // The address is already saved, so a mail failure must not read as one — it
  // is logged and the subscription still stands.
  try {
    // Lands on the home page with the sign-up modal open and the address
    // pre-filled, so the link joins the ordinary registration flow.
    const createAccountUrl = `${await origin()}/?auth=register&email=${encodeURIComponent(email)}`;
    await sendNewsletterWelcomeEmail(email, createAccountUrl);
  } catch (error) {
    console.error("[newsletter] welcome email failed:", error);
  }

  return { done: true };
}
