"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { getStateMeta } from "@/lib/state-cities";
import { useSession } from "@/context/session-context";

type LocationMeta = {
  label: string;
  from: [string, string, string];
};

type LocationContextType = {
  /** A deliberate choice: remembered on the account and honoured everywhere. */
  setStateByName: (state: string | null) => void;
  /**
   * A guess from the browser's geolocation. It fills an empty slot but never
   * overrides a saved preference, and is never written back to the account.
   */
  setDetectedState: (state: string | null) => void;
  meta: LocationMeta;
};

const DEFAULT: LocationMeta = {
  label: "India",
  from: ["Mumbai", "Bangalore", "Delhi"],
};

const LocationContext = createContext<LocationContextType>({
  meta: DEFAULT,
  setStateByName: () => {},
  setDetectedState: () => {},
});

export function LocationProvider({ children }: { children: ReactNode }) {
  const { user, loaded: sessionLoaded } = useSession();
  const [meta, setMeta] = useState<LocationMeta>(DEFAULT);
  // Set once a deliberate choice lands — by hand or from the saved profile —
  // so a slower geolocation callback cannot overwrite it.
  const chosen = useRef(false);

  function setStateByName(state: string | null) {
    chosen.current = true;
    setMeta(getStateMeta(state));

    // Signed-in visitors carry the choice to their other devices. Fire and
    // forget: a failed save is not worth interrupting the browse over.
    if (user) {
      void fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ preferredState: state ?? "" }),
      }).catch(() => {});
    }
  }

  function setDetectedState(state: string | null) {
    if (chosen.current) return;
    setMeta(getStateMeta(state));
  }

  useEffect(() => {
    if (!sessionLoaded || !user || chosen.current) return;

    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        const data = (await res.json()) as { profile?: { preferredState?: string } | null };
        const preferred = data.profile?.preferredState;

        if (!cancelled && preferred && !chosen.current) {
          chosen.current = true;
          setMeta(getStateMeta(preferred));
        }
      } catch {
        // No preference simply means the browser's own guess still applies.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionLoaded, user]);

  return (
    <LocationContext.Provider value={{ meta, setStateByName, setDetectedState }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}
