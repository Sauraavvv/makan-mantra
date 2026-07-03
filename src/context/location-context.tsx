"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { getStateMeta } from "@/lib/state-cities";

type LocationMeta = {
  label: string;
  from: [string, string, string];
};

type LocationContextType = {
  meta: LocationMeta;
  setStateByName: (state: string | null) => void;
};

const DEFAULT: LocationMeta = {
  label: "India",
  from: ["Mumbai", "Bangalore", "Delhi"],
};

const LocationContext = createContext<LocationContextType>({
  meta: DEFAULT,
  setStateByName: () => {},
});

export function LocationProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<LocationMeta>(DEFAULT);

  function setStateByName(state: string | null) {
    setMeta(getStateMeta(state));
  }

  return (
    <LocationContext.Provider value={{ meta, setStateByName }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}
