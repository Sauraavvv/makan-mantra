"use client";

import { useActionState } from "react";
import { requestSetPasswordLinkAction } from "@/app/actions/set-password";
import { RESEND_DONE } from "@/lib/auth/set-password";

export function ResendSetPasswordForm({
  defaultEmail = "",
  compact = false,
}: {
  defaultEmail?: string;
  /** Inside the sign-in modal the copy is already set by the surrounding error. */
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState(requestSetPasswordLinkAction, undefined);

  if (state?.sent) {
    return (
      <div className="mt-3 space-y-2">
        <p className="rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
          {RESEND_DONE}
        </p>

        {state.devUrl && (
          <a
            href={state.devUrl}
            className="block break-all text-[11px] font-medium text-saffron underline"
          >
            Dev only — open set-password link
          </a>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className={compact ? "mt-2 space-y-2" : "mt-5 space-y-3"}>
      {!compact && (
        <label className="mb-1.5 block text-[13px] font-semibold" htmlFor="resend-email">
          Your email
        </label>
      )}

      <input
        id="resend-email"
        name="email"
        type="email"
        required
        defaultValue={defaultEmail}
        placeholder="you@example.com"
        className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      />

      {state?.error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Email me a new link"}
      </button>
    </form>
  );
}
