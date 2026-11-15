"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { getAdminSession } from "@/lib/auth/admin";
import { getAuthDbErrorMessage, getContactQuestionsCollection } from "@/lib/auth/db";

export type DeleteQuestionState = { error?: string; done?: boolean };

/** Removes a question from the FAQ inbox for good. Admins only. */
export async function deleteContactQuestionAction(
  _prev: DeleteQuestionState,
  formData: FormData,
): Promise<DeleteQuestionState> {
  const session = await getAdminSession();
  if (!session) return { error: "Not authorised." };

  const id = String(formData.get("id") ?? "");
  if (!ObjectId.isValid(id)) return { error: "Invalid question." };

  try {
    const questions = await getContactQuestionsCollection();
    const { deletedCount } = await questions.deleteOne({ _id: new ObjectId(id) });
    if (deletedCount === 0) return { error: "This question no longer exists." };
  } catch (error) {
    return { error: getAuthDbErrorMessage(error) };
  }

  revalidatePath("/admin/questions");
  revalidatePath("/admin");
  return { done: true };
}
