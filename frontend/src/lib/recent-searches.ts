import type { RecentSearchEntry } from "@/lib/auth/db";

/** Ten is what the history page shows and what the client keeps locally. */
export const SEARCH_HISTORY_LIMIT = 10;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Reads either shape a stored search can be in: the entry written today, or the
 * bare label string written before the tab, category and time were kept.
 *
 * An older string keeps its label and admits it knows nothing else — the tab it
 * was made on is gone, and inventing "Buy" for it would put a fact in the
 * history that never happened. `searched_at` of epoch means the same: unknown.
 */
export function normalizeSearch(value: unknown): RecentSearchEntry | null {
  if (typeof value === "string") {
    const label = value.trim();
    return label ? { label, tab: "", category: "", query: label, searched_at: new Date(0) } : null;
  }

  if (!value || typeof value !== "object") return null;

  const entry = value as Record<string, unknown>;
  const label = text(entry.label);
  if (!label) return null;

  const raw = entry.searched_at ?? entry.searchedAt;
  const searchedAt = raw ? new Date(raw as string) : new Date(0);

  return {
    label,
    tab: text(entry.tab),
    category: text(entry.category),
    query: text(entry.query) || label,
    searched_at: Number.isNaN(searchedAt.getTime()) ? new Date(0) : searchedAt,
  };
}

export function readSearches(searches: unknown): RecentSearchEntry[] {
  if (!Array.isArray(searches)) return [];
  return searches
    .map(normalizeSearch)
    .filter((entry): entry is RecentSearchEntry => entry !== null);
}

/**
 * Newest first, one entry per label, capped. Groups are passed in the order
 * they should win ties, which is how a search just made beats the stored copy
 * of the same words.
 */
export function mergeSearches(...groups: RecentSearchEntry[][]) {
  const seen = new Set<string>();

  return groups
    .flat()
    .sort((left, right) => right.searched_at.getTime() - left.searched_at.getTime())
    .filter((entry) => {
      const key = entry.label.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, SEARCH_HISTORY_LIMIT);
}
