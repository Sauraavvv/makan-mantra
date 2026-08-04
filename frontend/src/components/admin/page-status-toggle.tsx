"use client";

import { useActionState } from "react";
import { toggleLocationActiveAction } from "@/app/actions/admin-locations";
import type { PageKind } from "@/lib/admin/location-collections";

export function PageStatusToggle({
  kind,
  id,
  active,
}: {
  kind: PageKind;
  id: string;
  active: boolean;
}) {
  const [state, formAction, pending] = useActionState(toggleLocationActiveAction, {});

  return (
    <form action={formAction} className="flex items-center justify-end gap-2">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      {/* Submitting flips the current state. */}
      <input type="hidden" name="active" value={String(!active)} />

      {state.error && (
        <span className="text-xs font-medium text-destructive">{state.error}</span>
      )}

      <button
        type="submit"
        disabled={pending}
        className={
          active
            ? "rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-60"
            : "rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        }
      >
        {pending ? "Saving…" : active ? "Retire" : "Restore"}
      </button>
    </form>
  );
}
