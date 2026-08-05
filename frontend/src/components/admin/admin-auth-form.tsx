"use client";

import { useActionState } from "react";
import { ShieldCheck } from "lucide-react";
import type { AdminAuthState } from "@/app/actions/admin-auth";

const fieldClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary";
const labelClass = "mb-1.5 block text-[13px] font-semibold";

export function AdminAuthForm({
  action,
  title,
  subtitle,
  submitLabel,
  withName = false,
}: {
  action: (state: AdminAuthState, formData: FormData) => Promise<AdminAuthState>;
  title: string;
  subtitle: string;
  submitLabel: string;
  withName?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-sm">
        <span className="grid size-11 place-items-center rounded-full bg-violet-50 text-violet-600">
          <ShieldCheck className="size-5" strokeWidth={1.8} />
        </span>

        <h1 className="mt-4 text-xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

        <form action={formAction} className="mt-5 space-y-3">
          {withName && (
            <div>
              <label className={labelClass} htmlFor="name">
                Name
              </label>
              <input id="name" name="name" required className={fieldClass} autoComplete="name" />
            </div>
          )}

          <div>
            <label className={labelClass} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className={fieldClass}
              autoComplete="email"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className={fieldClass}
              autoComplete={withName ? "new-password" : "current-password"}
            />
            {withName && (
              <p className="mt-1 text-xs text-muted-foreground">At least 10 characters.</p>
            )}
          </div>

          {state.error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {state.error}
            </p>
          )}

          {state.success && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
              {state.success}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {pending ? "Please wait…" : submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
