"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { deletePublishedNewsAction, type ReviewState } from "@/app/actions/admin-news";

/**
 * Removes a live article. Always asks first: this deletes the banner too, and
 * the story's URL starts returning a 404 the moment it goes through.
 */
export function DeletePublishedNewsButton({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(deletePublishedNewsAction, {} as ReviewState);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
        >
          <Trash2 className="size-3.5" />
          Delete
        </button>

        {state.error && (
          <p className="text-[11px] font-medium text-destructive">{state.error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <p className="text-[11px] font-medium">Delete this article and its banner?</p>

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-60"
        >
          Cancel
        </button>

        <form action={formAction}>
          <input type="hidden" name="slug" value={slug} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-destructive/90 disabled:opacity-60"
          >
            {pending ? "Deleting…" : "Yes, delete"}
          </button>
        </form>
      </div>

      {state.error && (
        <p className="text-[11px] font-medium text-destructive">{state.error}</p>
      )}
    </div>
  );
}
