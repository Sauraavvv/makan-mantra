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

export type SavedSnapshot = {
  title: string;
  price: string;
  locality: string;
  city: string;
  image: string;
  config?: string;
  area?: string;
};

export type SavedItem = SavedSnapshot & {
  propertyId: string;
};

type ToggleResult = "saved" | "removed" | "signin" | "error";

type SavedValue = {
  items: SavedItem[];
  ids: string[];
  isSaved: (propertyId: string) => boolean;
  toggle: (propertyId: string, snapshot: SavedSnapshot) => Promise<ToggleResult>;
  /** False until the first read settles, so hearts do not flicker off then on. */
  loaded: boolean;
};

const SavedContext = createContext<SavedValue>({
  items: [],
  ids: [],
  isSaved: () => false,
  toggle: async () => "signin",
  loaded: false,
});

export function useSaved() {
  return useContext(SavedContext);
}

export function SavedProvider({ children }: { children: ReactNode }) {
  const { user, loaded: sessionLoaded } = useSession();
  const [fetched, setFetched] = useState<SavedItem[]>([]);
  const [fetchedIds, setFetchedIds] = useState<string[]>([]);
  const [fetchSettled, setFetchSettled] = useState(false);

  // Signed-out visitors have no shortlist to speak of, so it is derived rather
  // than stored — no effect has to race the session to clear it.
  const signedOut = sessionLoaded && !user;
  const items = useMemo(() => (signedOut ? [] : fetched), [signedOut, fetched]);
  const ids = useMemo(() => (signedOut ? [] : fetchedIds), [signedOut, fetchedIds]);
  const loaded = signedOut || fetchSettled;

  useEffect(() => {
    if (!sessionLoaded || !user) return;

    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/saved", { cache: "no-store" });
        const data = (await res.json()) as { items?: SavedItem[]; ids?: string[] };
        if (!cancelled) {
          setFetched(data.items ?? []);
          setFetchedIds(data.ids ?? []);
        }
      } catch {
        // A failed read should not empty a shortlist that is already on screen.
      } finally {
        if (!cancelled) setFetchSettled(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionLoaded, user]);

  const isSaved = useCallback(
    (propertyId: string) => ids.includes(propertyId),
    [ids],
  );

  const toggle = useCallback(
    async (propertyId: string, snapshot: SavedSnapshot): Promise<ToggleResult> => {
      if (!user) return "signin";

      const wasSaved = ids.includes(propertyId);
      const previousItems = items;
      const previousIds = ids;

      // Move the heart first; the request only confirms it.
      setFetchedIds(
        wasSaved
          ? previousIds.filter((id) => id !== propertyId)
          : [propertyId, ...previousIds.filter((id) => id !== propertyId)],
      );
      setFetched(
        wasSaved
          ? previousItems.filter((item) => item.propertyId !== propertyId)
          : [
              { propertyId, ...snapshot },
              ...previousItems.filter((item) => item.propertyId !== propertyId),
            ],
      );

      try {
        const res = wasSaved
          ? await fetch(`/api/saved?propertyId=${encodeURIComponent(propertyId)}`, {
              method: "DELETE",
            })
          : await fetch("/api/saved", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ propertyId }),
            });

        if (!res.ok) {
          setFetched(previousItems);
          setFetchedIds(previousIds);
          return res.status === 401 ? "signin" : "error";
        }

        return wasSaved ? "removed" : "saved";
      } catch {
        setFetched(previousItems);
        setFetchedIds(previousIds);
        return "error";
      }
    },
    [ids, items, user],
  );

  return (
    <SavedContext.Provider value={{ items, ids, isSaved, toggle, loaded }}>
      {children}
    </SavedContext.Provider>
  );
}
