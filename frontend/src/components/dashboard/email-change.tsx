"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

type Step = "idle" | "editing" | "code";

/**
 * Swapping the account email, gated on a code sent to the new address.
 *
 * Confirming ends the session: the cookie still names the old address, and a
 * fresh sign-in is the cheapest way to reissue it honestly.
 */
export function EmailChange({
  currentEmail,
  provider,
}: {
  currentEmail: string;
  provider: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [newEmail, setNewEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  if (provider === "google") {
    return (
      <div className="mt-2">
        <p className="text-sm text-foreground">{currentEmail}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Managed by your Google account, so it cannot be changed here.
        </p>
      </div>
    );
  }

  const sendCode = async () => {
    setBusy(true);
    setNote(null);

    try {
      const res = await fetch("/api/account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "email_change", newEmail }),
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
          ? `We sent a 6-digit code to ${newEmail}.`
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
        setNote({ tone: "error", text: data.error ?? "Could not confirm the change" });
        return;
      }

      router.push("/?auth=login");
      router.refresh();
    } catch {
      setNote({ tone: "error", text: "Could not reach the server" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 truncate text-sm text-foreground">{currentEmail}</p>
        {step === "idle" && (
          <button
            type="button"
            onClick={() => setStep("editing")}
            className="shrink-0 text-sm font-semibold text-saffron hover:underline"
          >
            Change email
          </button>
        )}
      </div>

      {step === "editing" && (
        <div className="space-y-2">
          <input
            type="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            placeholder="New email address"
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-saffron"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={sendCode}
              disabled={busy || !newEmail}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-saffron px-4 text-sm font-semibold text-saffron-foreground disabled:opacity-60"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Send code
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
        <div className="space-y-2">
          <input
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="6-digit code"
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm tracking-[0.3em] outline-none focus:border-saffron"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirm}
              disabled={busy || otp.length < 6}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-saffron px-4 text-sm font-semibold text-saffron-foreground disabled:opacity-60"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Confirm change
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("editing");
                setOtp("");
                setNote(null);
              }}
              className="h-9 rounded-full border border-border px-4 text-sm font-medium"
            >
              Back
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Confirming signs you out — sign back in with the new address.
          </p>
        </div>
      )}

      {note && (
        <p
          className={`text-xs font-medium ${
            note.tone === "ok" ? "text-[#0F8B8D]" : "text-destructive"
          }`}
        >
          {note.text}
        </p>
      )}

      {devOtp && <p className="text-[11px] font-medium text-saffron">Dev only — code {devOtp}</p>}
    </div>
  );
}
