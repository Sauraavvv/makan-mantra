"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useSession } from "@/context/session-context";
import type { SavedSnapshot } from "@/context/saved-context";
import {
  readGuestViews,
  subscribeGuestActivity,
  writeGuestViews,
  type GuestView,
} from "@/lib/guest-activity";

const HISTORY_LIMIT = 12;

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

function fromGuest(view: GuestView): RecentPropertyItem {
  return { propertyId: view.propertyId, viewedAt: view.viewedAt, ...view.snapshot };
}

export function RecentPropertiesProvider({ children }: { children: ReactNode }) {
  const { user, loaded: sessionLoaded } = useSession();
  const [fetched, setFetched] = useState<RecentPropertyItem[]>([]);
  const [fetchSettled, setFetchSettled] = useState(false);
  const [guest, setGuest] = useState<GuestView[]>([]);
  const signedOut = sessionLoaded && !user;

  // Signed out, the history is whatever this device recorded; the account's own
  // copy takes over the moment there is one, and the device's copy is handed to
  // it on sign-in rather than shown alongside.
  const items = useMemo(
    () => (signedOut ? guest.map(fromGuest) : fetched),
    [signedOut, guest, fetched],
  );
  const loaded = signedOut || fetchSettled;

  useEffect(() => {
    const syncGuest = () => setGuest(readGuestViews());
    syncGuest();
    return subscribeGuestActivity(syncGuest);
  }, []);

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
      if (!propertyId) return;

      const viewedAt = new Date().toISOString();

      if (!user) {
        const next = [
          { propertyId, snapshot, viewedAt },
          ...readGuestViews().filter((view) => view.propertyId !== propertyId),
        ].slice(0, HISTORY_LIMIT);

        writeGuestViews(next);
        setGuest(next);
        return;
      }

      const next: RecentPropertyItem = { propertyId, viewedAt, ...snapshot };
      setFetched((current) =>
        [next, ...current.filter((item) => item.propertyId !== propertyId)].slice(0, HISTORY_LIMIT),
      );

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
