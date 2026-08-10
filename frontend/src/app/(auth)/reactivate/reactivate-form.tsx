"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CircleCheckBig, Loader2, TriangleAlert } from "lucide-react";

type State =
  | { kind: "working" }
  | { kind: "done"; email: string }
  | { kind: "failed"; message: string };

/** Runs the link the moment the page opens — there is nothing to decide here. */
export function ReactivateForm({ token }: { token: string }) {
  const [state, setState] = useState<State>({ kind: "working" });

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/reactivate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json()) as { error?: string; email?: string };

        if (cancelled) return;
        if (!res.ok) {
          setState({ kind: "failed", message: data.error ?? "Could not reactivate your account" });
          return;
        }

        setState({ kind: "done", email: data.email ?? "" });
      } catch {
        if (!cancelled) setState({ kind: "failed", message: "Could not reach the server" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // A link with no code at all never needs a request, so it is answered here
  // rather than by setting state from inside the effect.
  const resolved: State = token
    ? state
    : { kind: "failed", message: "This link is missing its code." };

  if (resolved.kind === "working") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Bringing your account back…
      </p>
    );
  }

  if (resolved.kind === "failed") {
    return (
      <div>
        <div className="flex items-start gap-2.5">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" strokeWidth={1.9} />
          <div>
            <p className="font-semibold text-foreground">We could not use this link</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{resolved.message}</p>
          </div>
        </div>
        <Link
          href="/"
          className="mt-5 inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-semibold transition-colors hover:bg-accent"
        >
          Back to Makan Mantraa
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start gap-2.5">
        <CircleCheckBig className="mt-0.5 size-5 shrink-0 text-[#0F8B8D]" strokeWidth={1.9} />
        <div>
          <p className="font-semibold text-foreground">Your account is back</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Everything is where you left it — your properties, saved listings and profile.
            {resolved.email ? ` Sign in with ${resolved.email} to pick up.` : ""}
          </p>
        </div>
      </div>
      <Link
        href="/?auth=login"
        className="mt-5 inline-flex h-10 items-center rounded-full bg-saffron px-5 text-sm font-semibold text-saffron-foreground transition-opacity hover:opacity-90"
      >
        Sign in
      </Link>
    </div>
  );
}
