"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteContactQuestionAction } from "@/app/actions/admin-questions";

/**
 * Two-step delete for one row of the Questions table: the bin icon asks for
 * confirmation first, so a stray click can't remove anything.
 */
export function DeleteQuestionButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(deleteContactQuestionAction, {});
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label="Delete question"
        title="Delete question"
        className="grid size-8 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      <form action={formAction} className="flex items-center gap-1.5">
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-destructive px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-destructive/90 disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Yes, delete"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-60"
        >
          Cancel
        </button>
      </form>
      {state.error && <p className="text-xs font-medium text-destructive">{state.error}</p>}
    </div>
  );
}
