"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteSubmissionAction } from "@/app/actions/admin-submissions";

export function DeleteSubmissionButton({
  id,
  mediaCount,
}: {
  id: string;
  mediaCount: number;
}) {
  const [state, formAction, pending] = useActionState(deleteSubmissionAction, {});
  const [confirming, setConfirming] = useState(false);

  return (
    <section className="rounded-xl border border-destructive/30 bg-background p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-destructive">
        Danger zone
      </h2>

      {!confirming ? (
        <>
          <p className="mt-2 text-xs text-muted-foreground">
            Deletes this enquiry and its {mediaCount} file{mediaCount === 1 ? "" : "s"} from
            storage. This cannot be undone.
          </p>

          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/40 px-4 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2 className="size-4" />
            Delete enquiry
          </button>
        </>
      ) : (
        <>
          <p className="mt-2 text-xs font-medium">
            Delete this enquiry and its {mediaCount} file{mediaCount === 1 ? "" : "s"}? The
            owner&apos;s details will be gone for good.
          </p>

          <form action={formAction} className="mt-3 flex gap-2">
            <input type="hidden" name="id" value={id} />

            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="flex-1 rounded-lg border border-border px-3 py-2.5 text-sm font-medium hover:bg-secondary disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-lg bg-destructive px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-destructive/90 disabled:opacity-60"
            >
              {pending ? "Deleting…" : "Yes, delete"}
            </button>
          </form>
        </>
      )}

      {state.error && (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          {state.error}
        </p>
      )}
    </section>
  );
}
