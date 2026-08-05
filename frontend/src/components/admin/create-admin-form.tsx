"use client";

import { useActionState } from "react";
import { createAdminAction } from "@/app/actions/admin-auth";

const fieldClass =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary";
const labelClass = "mb-1.5 block text-[13px] font-semibold";

export function CreateAdminForm() {
  const [state, formAction, pending] = useActionState(createAdminAction, {});

  return (
    <section className="rounded-xl border border-border bg-background p-5">
      <h2 className="text-sm font-bold">Add an admin</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        They will be able to sign in at /admin/login straight away.
      </p>

      <form action={formAction} className="mt-4 space-y-3">
        <div>
          <label className={labelClass} htmlFor="admin-name">
            Name
          </label>
          <input id="admin-name" name="name" required className={fieldClass} />
        </div>

        <div>
          <label className={labelClass} htmlFor="admin-email">
            Email
          </label>
          <input id="admin-email" name="email" type="email" required className={fieldClass} />
        </div>

        <div>
          <label className={labelClass} htmlFor="admin-password">
            Password
          </label>
          <input
            id="admin-password"
            name="password"
            type="password"
            required
            className={fieldClass}
            autoComplete="new-password"
          />
          <p className="mt-1 text-xs text-muted-foreground">At least 10 characters.</p>
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
          className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add admin"}
        </button>
      </form>
    </section>
  );
}
