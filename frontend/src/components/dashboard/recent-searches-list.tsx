"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Clock3, Loader2, Search, Trash2 } from "lucide-react";

import { useSearchHistory } from "@/context/search-history-context";

function formatSearchTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function RecentSearchesList() {
  const { items, loaded, remove } = useSearchHistory();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const removeSearch = async (id: string, label: string) => {
    setBusy(id);
    setError("");
    const removed = await remove({ id, label });
    if (!removed) setError("Could not remove that search. Please try again.");
    setBusy(null);
  };

  if (!loaded) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((row) => (
          <div
            key={row}
            className="h-[78px] animate-pulse rounded-lg border border-border bg-muted/40"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-14 text-center">
        <Search className="mx-auto size-8 text-muted-foreground" strokeWidth={1.5} />
        <p className="mt-3 font-semibold text-foreground">No recent searches yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your property search keywords will appear here.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex h-9 items-center rounded-full bg-saffron px-4 text-sm font-semibold text-saffron-foreground transition-opacity hover:opacity-90"
        >
          Browse properties
        </Link>
      </div>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        {items.map((item) => {
          const query = item.query.trim() || item.label;
          const removing = busy === item.id;

          return (
            <li key={item.id} className="flex min-w-0 items-center bg-background">
              <Link
                href={`/?q=${encodeURIComponent(query)}`}
                className="grid min-h-[78px] min-w-0 flex-1 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:px-5"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Search className="size-[18px]" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0">
                    <span
                      className="block truncate text-sm font-bold text-foreground"
                      title={item.label}
                    >
                      {item.label}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      {item.tab && <span>{item.tab}</span>}
                      {item.tab && item.category && <span aria-hidden>/</span>}
                      {item.category && <span>{item.category}</span>}
                    </span>
                  </span>
                </span>

                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock3 className="size-3.5 shrink-0" strokeWidth={1.8} />
                  {formatSearchTime(item.searchedAt)}
                </span>

                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-saffron">
                  Search again
                  <ArrowUpRight className="size-3.5" strokeWidth={2} />
                </span>
              </Link>

              <button
                type="button"
                onClick={() => void removeSearch(item.id, item.label)}
                disabled={busy !== null}
                aria-label={`Remove ${item.label} from search history`}
                title="Remove search"
                className="mr-3 grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              >
                {removing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" strokeWidth={1.8} />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {error && <p className="mt-3 text-right text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
