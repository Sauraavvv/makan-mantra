import { ObjectId } from "mongodb";
import { getContactQuestionsCollection } from "@/lib/auth/db";

export type ContactQuestion = {
  id: string;
  email: string;
  question: string;
  page: string | null;
  created_at: string;
};

type ContactQuestionDoc = {
  _id: ObjectId;
  email?: string;
  question?: string;
  page?: string | null;
  created_at?: Date;
};

export const QUESTIONS_PAGE_SIZE = 25;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Newest first, optionally filtered by email or question text. */
export async function listContactQuestions({ page = 1, q = "" } = {}) {
  const questions = await getContactQuestionsCollection();

  const trimmed = q.trim();
  const filter = trimmed
    ? {
        $or: [
          { email: { $regex: escapeRegex(trimmed), $options: "i" } },
          { question: { $regex: escapeRegex(trimmed), $options: "i" } },
        ],
      }
    : {};

  const total = await questions.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / QUESTIONS_PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pages);

  const docs = await questions
    .find(filter)
    .sort({ created_at: -1 })
    .skip((current - 1) * QUESTIONS_PAGE_SIZE)
    .limit(QUESTIONS_PAGE_SIZE)
    .toArray();

  return {
    items: (docs as ContactQuestionDoc[]).map((doc) => ({
      id: doc._id.toString(),
      email: doc.email ?? "",
      question: doc.question ?? "",
      page: doc.page ?? null,
      created_at: (doc.created_at ?? new Date()).toISOString(),
    })),
    total,
    page: current,
    pages,
  };
}

export async function countContactQuestions() {
  const questions = await getContactQuestionsCollection();
  return questions.countDocuments();
}
