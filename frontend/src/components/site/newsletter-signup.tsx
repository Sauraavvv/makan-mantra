"use client";

import { useActionState } from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { subscribeToNewsletterAction } from "@/app/actions/newsletter";

export function NewsletterSignup() {
  const [state, formAction, pending] = useActionState(subscribeToNewsletterAction, undefined);

  return (
    <div className="w-full">
      {state?.done ? (
        <p className="rounded-xl border border-saffron/40 bg-saffron/10 px-4 py-3.5 text-sm font-medium text-white">
          You&apos;re on the list — we&apos;ll be in touch with new listings.
        </p>
      ) : (
        <form action={formAction} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/45" />
            <input
              name="email"
              type="email"
              required
              aria-label="Email address"
              placeholder="Enter your email address"
              className="h-12 w-full rounded-xl border border-white/15 bg-white/[0.06] pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-white/40 focus:border-saffron/60"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="h-12 shrink-0 rounded-xl bg-saffron px-7 text-sm font-semibold text-saffron-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Subscribing…" : "Subscribe"}
          </button>
        </form>
      )}

      <p className="mt-3 flex items-center gap-2 text-xs text-white/50">
        <ShieldCheck className="size-3.5 shrink-0" strokeWidth={1.8} />
        {state?.error ? (
          <span className="font-medium text-destructive">{state.error}</span>
        ) : (
          "We respect your privacy. Unsubscribe anytime."
        )}
      </p>
    </div>
  );
}
