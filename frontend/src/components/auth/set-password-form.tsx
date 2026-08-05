"use client";

import { useActionState } from "react";
import { setPasswordAction } from "@/app/actions/set-password";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/set-password";

const fieldClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary";
const labelClass = "mb-1.5 block text-[13px] font-semibold";

export function SetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(setPasswordAction, undefined);

  return (
    <form action={formAction} className="mt-5 space-y-3">
      <input type="hidden" name="token" value={token} />

      <div>
        <label className={labelClass} htmlFor="sp-password">
          New password
        </label>
        <input
          id="sp-password"
          name="password"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          className={fieldClass}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          At least {MIN_PASSWORD_LENGTH} characters.
        </p>
      </div>

      <div>
        <label className={labelClass} htmlFor="sp-confirm">
          Confirm password
        </label>
        <input
          id="sp-confirm"
          name="confirm"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          className={fieldClass}
        />
      </div>

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
        {pending ? "Saving…" : "Set password and sign in"}
      </button>
    </form>
  );
}
