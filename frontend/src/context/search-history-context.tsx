"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useSession } from "@/context/session-context";
import {
  readGuestSearches,
  subscribeGuestActivity,
  writeGuestSearches,
  type GuestSearch,
} from "@/lib/guest-activity";

const HISTORY_LIMIT = 10;

export type SearchHistoryInput = {
  label: string;
  tab: string;
  category: string;
  query: string;
};

/** Same shape the device store keeps, so one is the other with no mapping. */
export type SearchHistoryItem = GuestSearch;

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
      setLocalItems(readGuestSearches());
      setLocalLoaded(true);
    };
    syncLocal();
    return subscribeGuestActivity(syncLocal);
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
    // Only a signed-out search goes to the device store. Writing one there while
    // signed in would leave something for the next sign-in to claim on every
    // page it visits, when the account already has it.
    // Read the store rather than the state to build the next list: the write
    // below announces itself to every provider listening, and doing that inside
    // a state updater would have React setting state mid-render.
    if (!user) {
      const next = [
        item,
        ...readGuestSearches().filter((entry) => entry.label.toLowerCase() !== label.toLowerCase()),
      ].slice(0, HISTORY_LIMIT);

      writeGuestSearches(next);
      setLocalItems(next);
    }

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
      const next = readGuestSearches().filter(
        (item) => item.id !== search.id && item.label.trim().toLowerCase() !== normalizedLabel,
      );

      writeGuestSearches(next);
      setLocalItems(next);
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
    writeGuestSearches([]);
    return true;
  }, [user]);

  const loaded = localLoaded && (!user || serverLoaded);

  return (
    <SearchHistoryContext.Provider value={{ items, loaded, track, remove, clearAll }}>
      {children}
    </SearchHistoryContext.Provider>
  );
}
