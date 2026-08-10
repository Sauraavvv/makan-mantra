"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";

/**
 * Closing the account, gated on a code sent to the address already on file —
 * so a stolen session alone cannot switch someone off.
 */
export function DeactivateAccount({ email }: { email: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirming" | "code">("idle");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const sendCode = async () => {
    setBusy(true);
    setNote(null);

    try {
      const res = await fetch("/api/account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "deactivate" }),
      });
      const data = (await res.json()) as { error?: string; sent?: boolean; devOtp?: string };

      if (!res.ok) {
        setNote({ tone: "error", text: data.error ?? "Could not send the code" });
        return;
      }

      setDevOtp(data.devOtp ?? null);
      setStep("code");
      setNote({
        tone: "ok",
        text: data.sent
          ? `We sent a 6-digit code to ${email}.`
          : "We could not email the code just now.",
      });
    } catch {
      setNote({ tone: "error", text: "Could not reach the server" });
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setNote(null);

    try {
      const res = await fetch("/api/account", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ otp }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setNote({ tone: "error", text: data.error ?? "Could not deactivate your account" });
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setNote({ tone: "error", text: "Could not reach the server" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex items-start gap-2.5">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" strokeWidth={1.9} />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-foreground">Deactivate account</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Your shortlist and posted properties stay with us, but you will be signed out and
            will not be able to sign in again. Write to us to reopen the account.
          </p>

          {step === "idle" && (
            <button
              type="button"
              onClick={() => setStep("confirming")}
              className="mt-3 h-9 rounded-full border border-destructive/40 px-4 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
            >
              Deactivate account
            </button>
          )}

          {step === "confirming" && (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-foreground">
                We will email a 6-digit code to {email} to confirm it is you.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={busy}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-destructive px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  Email me the code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("idle");
                    setNote(null);
                  }}
                  className="h-9 rounded-full border border-border px-4 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {step === "code" && (
            <div className="mt-3 space-y-2">
              <input
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder="6-digit code"
                className="h-10 w-full max-w-xs rounded-lg border border-border bg-background px-3 text-sm tracking-[0.3em] outline-none focus:border-destructive"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={confirm}
                  disabled={busy || otp.length < 6}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-destructive px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  Confirm deactivation
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("idle");
                    setOtp("");
                    setNote(null);
                  }}
                  className="h-9 rounded-full border border-border px-4 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {note && (
            <p
              className={`mt-2 text-xs font-medium ${
                note.tone === "ok" ? "text-[#0F8B8D]" : "text-destructive"
              }`}
            >
              {note.text}
            </p>
          )}

          {devOtp && (
            <p className="mt-1 text-[11px] font-medium text-saffron">Dev only — code {devOtp}</p>
          )}
        </div>
      </div>
    </section>
  );
}
