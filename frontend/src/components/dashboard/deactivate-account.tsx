"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, PauseCircle } from "lucide-react";

/**
 * Switching the account off for a while.
 *
 * Nothing is destroyed here, so it asks once rather than for a code — the
 * emailed link is the safety net, and it reaches the mailbox rather than
 * whoever happens to be holding the session.
 */
export function DeactivateAccount({
  email,
  reactivateDays,
  purgeDays,
}: {
  email: string;
  reactivateDays: number;
  purgeDays: number;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const deactivate = async () => {
    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/account", { method: "PATCH" });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Could not deactivate your account");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Could not reach the server");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-border p-4">
      <div className="flex items-start gap-2.5">
        <PauseCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.9} />

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-foreground">Deactivate account</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Take a break without losing anything. You are signed out and your listings stop
            showing, but your properties, saved listings and profile all stay put.
          </p>

          {confirming ? (
            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                  <li>
                    We email {email} a link that brings your account back — good for{" "}
                    <strong>{reactivateDays} days</strong>.
                  </li>
                  <li>
                    Leave it {purgeDays} days and everything is deleted for good, exactly as if
                    you had deleted the account yourself.
                  </li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={deactivate}
                  disabled={busy}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-60"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  Deactivate my account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirming(false);
                    setError("");
                  }}
                  className="h-9 rounded-full border border-border px-4 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="mt-3 h-9 rounded-full border border-border px-4 text-sm font-semibold transition-colors hover:bg-accent"
            >
              Deactivate account
            </button>
          )}

          {error && <p className="mt-2 text-xs font-medium text-destructive">{error}</p>}
        </div>
      </div>
    </section>
  );
}
