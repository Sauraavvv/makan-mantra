"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BadgeCheck, Loader2, RotateCcw, Trash2 } from "lucide-react";

type Action = "sold" | "relist" | "delete";

/**
 * Mark sold / delete, for the owner of a posted property.
 *
 * Deleting asks twice — inline rather than through a browser confirm, which is
 * easy to dismiss by reflex — and it is final: the row and its uploads go.
 */
export function PropertyActions({ pid, status }: { pid: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  const run = async (action: Action) => {
    setBusy(action);
    setError("");

    try {
      const res =
        action === "delete"
          ? await fetch(`/api/my-properties?pid=${encodeURIComponent(pid)}`, { method: "DELETE" })
          : await fetch("/api/my-properties", {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ pid, action }),
            });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Could not update this property");
        return;
      }

      setConfirming(false);
      router.refresh();
    } catch {
      setError("Could not reach the server");
    } finally {
      setBusy(null);
    }
  };

  const buttonClass =
    "inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold transition-colors disabled:opacity-60";

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-foreground">
          Delete this property and its photos? This cannot be undone.
        </span>
        <button
          type="button"
          onClick={() => run("delete")}
          disabled={busy !== null}
          className={`${buttonClass} border-destructive/40 text-destructive hover:bg-destructive/10`}
        >
          {busy === "delete" && <Loader2 className="size-3.5 animate-spin" />}
          Yes, delete
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className={`${buttonClass} text-muted-foreground hover:bg-accent`}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "sold" ? (
        <button
          type="button"
          onClick={() => run("relist")}
          disabled={busy !== null}
          className={`${buttonClass} text-foreground hover:bg-accent`}
        >
          {busy === "relist" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RotateCcw className="size-3.5" strokeWidth={1.9} />
          )}
          Mark as available
        </button>
      ) : (
        <button
          type="button"
          onClick={() => run("sold")}
          disabled={busy !== null}
          className={`${buttonClass} text-foreground hover:bg-accent`}
        >
          {busy === "sold" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <BadgeCheck className="size-3.5" strokeWidth={1.9} />
          )}
          Mark as sold out
        </button>
      )}

      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={busy !== null}
        className={`${buttonClass} text-muted-foreground hover:bg-destructive/10 hover:text-destructive`}
      >
        <Trash2 className="size-3.5" strokeWidth={1.9} />
        Delete
      </button>

      {error && <span className="text-xs font-medium text-destructive">{error}</span>}
    </div>
  );
}
