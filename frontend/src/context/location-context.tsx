"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { getStateMeta } from "@/lib/state-cities";

type LocationMeta = {
  label: string;
  from: [string, string, string];
};

type LocationContextType = {
  /** The state the visitor picked in the header. Remembered in this browser. */
  setStateByName: (state: string | null) => void;
  /**
   * A guess from the browser's geolocation. It fills an empty slot but never
   * overrides a state the visitor picked by hand.
   */
  setDetectedState: (state: string | null) => void;
  meta: LocationMeta;
};

const STORAGE_KEY = "mm-location-state";

const DEFAULT: LocationMeta = {
  label: "India",
  from: ["Mumbai", "Bangalore", "Delhi"],
};

const LocationContext = createContext<LocationContextType>({
  meta: DEFAULT,
  setStateByName: () => {},
  setDetectedState: () => {},
});

function readStoredState() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function writeStoredState(state: string | null) {
  try {
    if (state) localStorage.setItem(STORAGE_KEY, state);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private browsing can refuse writes; the pick still holds for this page.
  }
}

/**
 * Which state the site is showing right now.
 *
 * Two inputs, and only two: the browser's geolocation guess, and the header
 * picker. The account is deliberately not one of them — the State on the
 * profile is the visitor's own address, not a request to be shown that market.
 *
 * A hand-picked state is kept in `localStorage` rather than on the account, so
 * it survives a reload without following anyone to another device or writing
 * anything to their profile.
 */
export function LocationProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<LocationMeta>(DEFAULT);
  // Set once the visitor picks by hand — or once a stored pick is restored — so
  // a slower geolocation callback cannot drag them somewhere they left.
  const chosen = useRef(false);

  useEffect(() => {
    // Restoring happens here rather than in the initial state so the server and
    // the first client render agree; other tabs stay in step through `storage`.
    const sync = () => {
      const stored = readStoredState();
      if (!stored) return;

      chosen.current = true;
      setMeta(getStateMeta(stored));
    };

    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  function setStateByName(state: string | null) {
    chosen.current = Boolean(state);
    setMeta(getStateMeta(state));
    writeStoredState(state);
  }

  function setDetectedState(state: string | null) {
    if (chosen.current) return;
    setMeta(getStateMeta(state));
  }

  return (
    <LocationContext.Provider value={{ meta, setStateByName, setDetectedState }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}
