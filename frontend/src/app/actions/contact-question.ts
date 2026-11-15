"use server";

import { revalidatePath } from "next/cache";
import { getContactQuestionsCollection } from "@/lib/auth/db";
import { normalizeEmail } from "@/lib/auth/normalize";

export type ContactQuestionState = { error?: string; done?: boolean } | undefined;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const QUESTION_MIN = 10;
const QUESTION_MAX = 2000;

/** One address may send this many questions per window before being told to wait. */
const RATE_LIMIT_COUNT = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

/**
 * Saves a question from the FAQ section's "Contact Us" card. The admin panel
 * lists them under /admin/questions so the team can reply by email.
 */
export async function submitContactQuestionAction(
  _prev: ContactQuestionState,
  formData: FormData,
): Promise<ContactQuestionState> {
  // Honeypot: hidden from people, filled in by naive bots. Pretend it worked.
  if (String(formData.get("website") ?? "").trim()) return { done: true };

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const question = String(formData.get("question") ?? "").trim();
  // Which page the FAQ sat on, so the team knows the context of the question.
  const page = String(formData.get("page") ?? "").slice(0, 300);

  if (!EMAIL_PATTERN.test(email)) {
    return { error: "Please enter a valid email address." };
  }
  if (question.length < QUESTION_MIN) {
    return { error: "Please add a little more detail." };
  }
  if (question.length > QUESTION_MAX) {
    return { error: `Please keep it under ${QUESTION_MAX} characters.` };
  }

  try {
    const questions = await getContactQuestionsCollection();

    const recent = await questions.countDocuments({
      email,
      created_at: { $gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
    });
    if (recent >= RATE_LIMIT_COUNT) {
      return { error: "Too many questions sent. Please try again later." };
    }

    await questions.insertOne({
      email,
      question,
      page: page.startsWith("/") ? page : null,
      created_at: new Date(),
    });
  } catch (error) {
    console.error("[contact-question] save failed:", error);
    return { error: "Couldn't send right now. Please try again." };
  }

  revalidatePath("/admin/questions");
  revalidatePath("/admin");
  return { done: true };
}
