"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { SavedSnapshot } from "@/context/saved-context";
import { useSession } from "@/context/session-context";

export type RecentPropertyItem = SavedSnapshot & {
  propertyId: string;
  viewedAt: string;
};

type RecentPropertiesValue = {
  items: RecentPropertyItem[];
  loaded: boolean;
  track: (propertyId: string, snapshot: SavedSnapshot) => Promise<void>;
};

const RecentPropertiesContext = createContext<RecentPropertiesValue>({
  items: [],
  loaded: false,
  track: async () => {},
});

export function useRecentProperties() {
  return useContext(RecentPropertiesContext);
}

export function RecentPropertiesProvider({ children }: { children: ReactNode }) {
  const { user, loaded: sessionLoaded } = useSession();
  const [fetched, setFetched] = useState<RecentPropertyItem[]>([]);
  const [fetchSettled, setFetchSettled] = useState(false);
  const signedOut = sessionLoaded && !user;
  const items = useMemo(() => (signedOut ? [] : fetched), [signedOut, fetched]);
  const loaded = signedOut || fetchSettled;

  useEffect(() => {
    if (!sessionLoaded || !user) return;

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/recent-properties", { cache: "no-store" });
        const data = (await response.json()) as { items?: RecentPropertyItem[] };
        if (!cancelled) setFetched(data.items ?? []);
      } catch {
        // Keep the latest in-memory history if the account read briefly fails.
      } finally {
        if (!cancelled) setFetchSettled(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionLoaded, user]);

  const track = useCallback(
    async (propertyId: string, snapshot: SavedSnapshot) => {
      if (!user || !propertyId) return;

      const next: RecentPropertyItem = {
        propertyId,
        viewedAt: new Date().toISOString(),
        ...snapshot,
      };
      setFetched((current) => [next, ...current.filter((item) => item.propertyId !== propertyId)].slice(0, 12));

      await fetch("/api/recent-properties", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ propertyId, snapshot }),
      }).catch(() => {});
    },
    [user],
  );

  return (
    <RecentPropertiesContext.Provider value={{ items, loaded, track }}>
      {children}
    </RecentPropertiesContext.Provider>
  );
}
