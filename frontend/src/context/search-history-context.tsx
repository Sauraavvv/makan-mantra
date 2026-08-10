"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useSession } from "@/context/session-context";

const STORAGE_KEY = "mm-recent-searches";
const HISTORY_LIMIT = 10;

export type SearchHistoryInput = {
  label: string;
  tab: string;
  category: string;
  query: string;
};

export type SearchHistoryItem = SearchHistoryInput & {
  id: string;
  searchedAt: string;
};

type SearchHistoryValue = {
  items: SearchHistoryItem[];
  loaded: boolean;
  track: (search: SearchHistoryInput) => Promise<void>;
  remove: (search: Pick<SearchHistoryItem, "id" | "label">) => Promise<boolean>;
  clearAll: () => Promise<boolean>;
};

const SearchHistoryContext = createContext<SearchHistoryValue>({
  items: [],
  loaded: false,
  track: async () => {},
  remove: async () => false,
  clearAll: async () => false,
});

function readLocalSearches(): SearchHistoryItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, HISTORY_LIMIT).map((item) => ({
      id: String(item.id || Date.now()),
      label: String(item.label || ""),
      tab: String(item.tab || "Buy"),
      category: String(item.category || "All Residential"),
      query: String(item.query || ""),
      searchedAt: String(item.searchedAt || item.createdAt || new Date().toISOString()),
    })).filter((item) => item.label);
  } catch {
    return [];
  }
}

function writeLocalSearches(items: SearchHistoryItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, HISTORY_LIMIT)));
}

function newestFirst(items: SearchHistoryItem[]) {
  return [...items].sort(
    (left, right) => {
      const leftTime = Date.parse(left.searchedAt);
      const rightTime = Date.parse(right.searchedAt);
      return (Number.isFinite(rightTime) ? rightTime : 0) -
        (Number.isFinite(leftTime) ? leftTime : 0);
    },
  );
}

export function useSearchHistory() {
  return useContext(SearchHistoryContext);
}

export function SearchHistoryProvider({ children }: { children: ReactNode }) {
  const { user, loaded: sessionLoaded } = useSession();
  const [localItems, setLocalItems] = useState<SearchHistoryItem[]>([]);
  const [serverItems, setServerItems] = useState<SearchHistoryItem[]>([]);
  const [localLoaded, setLocalLoaded] = useState(false);
  const [serverLoaded, setServerLoaded] = useState(false);

  useEffect(() => {
    const syncLocal = () => {
      setLocalItems(readLocalSearches());
      setLocalLoaded(true);
    };
    syncLocal();
    window.addEventListener("storage", syncLocal);
    return () => window.removeEventListener("storage", syncLocal);
  }, []);

  useEffect(() => {
    if (!sessionLoaded || !user) return;
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/recent-searches", { cache: "no-store" });
        const data = (await response.json()) as { items?: SearchHistoryItem[] };
        if (!cancelled) setServerItems(data.items ?? []);
      } catch {
        // Local history remains available if the account read fails.
      } finally {
        if (!cancelled) setServerLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionLoaded, user]);

  const items = useMemo(() => {
    if (!user) return localItems;
    const seen = new Set<string>();
    return newestFirst([...serverItems, ...localItems])
      .filter((item) => {
        const key = item.label.trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, HISTORY_LIMIT);
  }, [localItems, serverItems, user]);

  const track = useCallback(async (search: SearchHistoryInput) => {
    const label = search.label.trim();
    if (!label) return;

    const item: SearchHistoryItem = {
      ...search,
      label,
      id: `${Date.now()}-${label}`,
      searchedAt: new Date().toISOString(),
    };
    setLocalItems((current) => {
      const next = [item, ...current.filter((entry) => entry.label.toLowerCase() !== label.toLowerCase())]
        .slice(0, HISTORY_LIMIT);
      writeLocalSearches(next);
      return next;
    });

    if (user) {
      setServerItems((current) => [item, ...current.filter((entry) => entry.label.toLowerCase() !== label.toLowerCase())]
        .slice(0, HISTORY_LIMIT));
      await fetch("/api/recent-searches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(item),
      }).catch(() => {});
    }
  }, [user]);

  const remove = useCallback(
    async (search: Pick<SearchHistoryItem, "id" | "label">) => {
      if (user) {
        try {
          const params = new URLSearchParams({ id: search.id, label: search.label });
          const response = await fetch(`/api/recent-searches?${params}`, { method: "DELETE" });
          if (!response.ok) return false;
        } catch {
          return false;
        }
      }

      const normalizedLabel = search.label.trim().toLowerCase();
      setLocalItems((current) => {
        const next = current.filter(
          (item) =>
            item.id !== search.id && item.label.trim().toLowerCase() !== normalizedLabel,
        );
        writeLocalSearches(next);
        return next;
      });
      setServerItems((current) =>
        current.filter(
          (item) =>
            item.id !== search.id && item.label.trim().toLowerCase() !== normalizedLabel,
        ),
      );
      return true;
    },
    [user],
  );

  const clearAll = useCallback(async () => {
    if (user) {
      try {
        const response = await fetch("/api/recent-searches?all=1", { method: "DELETE" });
        if (!response.ok) return false;
      } catch {
        return false;
      }
    }

    setLocalItems([]);
    setServerItems([]);
    writeLocalSearches([]);
    return true;
  }, [user]);

  const loaded = localLoaded && (!user || serverLoaded);

  return (
    <SearchHistoryContext.Provider value={{ items, loaded, track, remove, clearAll }}>
      {children}
    </SearchHistoryContext.Provider>
  );
}
