"use client";

import { useState } from "react";
import { Loader2, Trash2, X } from "lucide-react";

import { useSearchHistory } from "@/context/search-history-context";

export function RecentSearchesClearAction() {
  const { items, loaded, clearAll } = useSearchHistory();
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");

  if (!loaded || items.length === 0) return null;

  const clearSearches = async () => {
    setClearing(true);
    setError("");
    const cleared = await clearAll();
    if (!cleared) {
      setError("Could not clear search history");
    } else {
      setConfirming(false);
    }
    setClearing(false);
  };

  if (confirming) {
    return (
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="hidden text-xs font-medium text-foreground sm:inline">Clear history?</span>
        <button
          type="button"
          onClick={() => void clearSearches()}
          disabled={clearing}
          title={error || "Clear all searches"}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-destructive px-3 text-xs font-semibold text-destructive-foreground disabled:opacity-60"
        >
          {clearing && <Loader2 className="size-3.5 animate-spin" />}
          Clear
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setError("");
          }}
          disabled={clearing}
          aria-label="Cancel clearing search history"
          title="Cancel"
          className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-muted/40 disabled:opacity-60"
        >
          <X className="size-4" strokeWidth={1.8} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
    >
      <Trash2 className="size-3.5" strokeWidth={1.8} />
      Clear all
    </button>
  );
}
