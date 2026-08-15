"use client";

import { useActionState, useState } from "react";
import { Check, ImageOff, X } from "lucide-react";
import { approveNewsAction, rejectNewsAction, type ReviewState } from "@/app/actions/admin-news";

/**
 * The yes / no on one staged story.
 *
 * Approve goes through on a single click — publishing is undoable by retiring
 * the article later. Reject asks first, because it also destroys the banner and
 * there is no copy of it anywhere else.
 */
export function NewsReviewActions({
  slug,
  needsImage,
}: {
  slug: string;
  needsImage: boolean;
}) {
  const empty: ReviewState = {};
  const [approveState, approve, approving] = useActionState(approveNewsAction, empty);
  const [rejectState, reject, rejecting] = useActionState(rejectNewsAction, empty);
  const [confirming, setConfirming] = useState(false);

  const busy = approving || rejecting;
  const error = approveState.error || rejectState.error;

  return (
    <div className="space-y-3">
      {needsImage && (
        <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
          <ImageOff className="mt-0.5 size-3.5 shrink-0" />
          No banner was generated for this story, so it cannot be published. Reject it, or
          run the generator&apos;s image retry and refresh this page.
        </p>
      )}

      {!confirming ? (
        <div className="flex flex-wrap gap-2">
          <form action={approve}>
            <input type="hidden" name="slug" value={slug} />
            <button
              type="submit"
              disabled={busy || needsImage}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              <Check className="size-4" />
              {approving ? "Publishing…" : "Approve & publish"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg border border-destructive/40 px-4 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            <X className="size-4" />
            Reject
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-xs font-medium">
            Reject this story? The article and its banner are deleted for good.
          </p>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={rejecting}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-60"
            >
              Keep it
            </button>

            <form action={reject} className="flex-1">
              <input type="hidden" name="slug" value={slug} />
              <button
                type="submit"
                disabled={rejecting}
                className="w-full rounded-lg bg-destructive px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-destructive/90 disabled:opacity-60"
              >
                {rejecting ? "Deleting…" : "Yes, reject"}
              </button>
            </form>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
