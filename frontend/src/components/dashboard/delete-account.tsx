"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";

/**
 * Deleting the account, gated on a code sent to the address already on file —
 * so a stolen session alone cannot wipe someone out.
 *
 * The warning comes before the code, not after: someone should know exactly
 * what they are losing while they can still walk away, rather than finding out
 * once a code is already sitting in their inbox.
 */
const LOSSES = [
  "Every property you posted, along with its photos and videos",
  "Your saved listings",
  "Recently viewed properties and recent searches",
  "Your profile details and profile picture",
];

export function DeleteAccount({ email }: { email: string }) {
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
        body: JSON.stringify({ action: "delete_account" }),
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
        setNote({ tone: "error", text: data.error ?? "Could not delete your account" });
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

  const reset = () => {
    setStep("idle");
    setOtp("");
    setNote(null);
    setDevOtp(null);
  };

  return (
    <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex items-start gap-2.5">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" strokeWidth={1.9} />

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-foreground">Delete account permanently</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            This is irreversible. Everything tied to this account is erased and cannot be
            recovered — not by you, and not by us.
          </p>

          {step === "idle" && (
            <button
              type="button"
              onClick={() => setStep("confirming")}
              className="mt-3 h-9 rounded-full border border-destructive/40 px-4 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
            >
              Delete account permanently
            </button>
          )}

          {step === "confirming" && (
            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-destructive/30 bg-background p-3">
                <p className="text-sm font-bold text-destructive">
                  This cannot be undone. You will permanently lose:
                </p>
                <ul className="mt-2 space-y-1.5">
                  {LOSSES.map((loss) => (
                    <li key={loss} className="flex gap-2 text-sm leading-relaxed text-foreground">
                      <span aria-hidden className="text-destructive">
                        &bull;
                      </span>
                      {loss}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  There is no way to restore any of it afterwards. If you only want to stop
                  hearing from us, write to us instead of deleting.
                </p>
              </div>

              <p className="text-sm font-medium text-foreground">
                To confirm it is really you, we will email a 6-digit code to {email}.
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={busy}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-destructive px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  I understand — email me the code
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="h-9 rounded-full border border-border px-4 text-sm font-medium"
                >
                  Keep my account
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
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={confirm}
                  disabled={busy || otp.length < 6}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-destructive px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  Delete my account permanently
                </button>
                <button
                  type="button"
                  onClick={reset}
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
