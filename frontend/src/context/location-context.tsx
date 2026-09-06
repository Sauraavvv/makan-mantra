"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { getStateMeta } from "@/lib/state-cities";
import { decideOnLiveState } from "@/lib/location-decision";
import {
  LOCATION_COOKIE,
  LOCATION_COOKIE_MAX_AGE,
  serializeLocation,
  stateFromRegion,
  type StoredLocation,
} from "@/lib/geo";

type LocationMeta = {
  label: string;
  from: [string, string, string];
};

type LocationContextType = {
  /** The state the visitor picked in the header. `null` means "All India". */
  setStateByName: (state: string | null) => void;
  /**
   * Asks the browser for a precise position and resolves it to a state.
   *
   * Only ever called from something the visitor clicked — see the comment on
   * the permission prompt below.
   */
  requestPreciseLocation: () => Promise<void>;
  /** True while `requestPreciseLocation` is waiting on the browser. */
  locating: boolean;
  /**
   * A state the IP now reads as, different from the one being shown — an
   * offer, never a change. `null` whenever there is nothing to ask about.
   */
  suggestion: string | null;
  acceptSuggestion: () => void;
  dismissSuggestion: () => void;
  meta: LocationMeta;
};

/** The key the state used to live under, read once so existing picks survive. */
const LEGACY_STORAGE_KEY = "mm-location-state";

/** Tells the site's other open tabs that the state changed. */
const BROADCAST_CHANNEL = "mm-location";

/** A suggestion the visitor turned down, so we stop asking. */
const DISMISSED_KEY = "mm-location-dismissed";

/**
 * Long enough that nobody is nagged about the same state twice in a trip,
 * short enough that someone who really has moved is asked again eventually.
 */
const DISMISSED_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Marks that this tab has already asked `/api/geo` where the visitor is. */
const CHECKED_KEY = "mm-location-checked";

const DEFAULT: LocationMeta = {
  label: "India",
  from: ["Mumbai", "Bangalore", "Delhi"],
};

const LocationContext = createContext<LocationContextType>({
  meta: DEFAULT,
  setStateByName: () => {},
  requestPreciseLocation: async () => {},
  locating: false,
  suggestion: null,
  acceptSuggestion: () => {},
  dismissSuggestion: () => {},
});

function writeCookie(location: StoredLocation) {
  try {
    document.cookie = `${LOCATION_COOKIE}=${serializeLocation(location)}; path=/; max-age=${LOCATION_COOKIE_MAX_AGE}; samesite=lax`;
  } catch {
    // Nothing to do: the pick still holds for this page.
  }
}

function readLegacyPick() {
  try {
    const state = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (state) localStorage.removeItem(LEGACY_STORAGE_KEY);
    return state?.trim() || null;
  } catch {
    return null;
  }
}

function readDismissed() {
  try {
    const [state, at] = (localStorage.getItem(DISMISSED_KEY) ?? "").split("|");
    if (!state) return null;

    if (Date.now() - Number(at) > DISMISSED_TTL_MS) {
      localStorage.removeItem(DISMISSED_KEY);
      return null;
    }

    return state;
  } catch {
    return null;
  }
}

function writeDismissed(state: string) {
  try {
    localStorage.setItem(DISMISSED_KEY, `${state}|${Date.now()}`);
  } catch {
    // The offer simply comes back on the next visit.
  }
}

/**
 * Whether this tab has already looked the visitor up.
 *
 * Session-scoped, so the check costs one request per visit rather than one per
 * page — and on Vercel or Cloudflare it costs nothing at all, because the
 * header the server already read answers the same question.
 */
function claimSessionCheck() {
  try {
    if (sessionStorage.getItem(CHECKED_KEY)) return false;

    sessionStorage.setItem(CHECKED_KEY, "1");
    return true;
  } catch {
    return true;
  }
}

async function reverseGeocode(lat: number, lng: number) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" } },
    );
    const address = (await res.json())?.address as Record<string, string> | undefined;
    if (!address) return null;

    // Most states come back as `state`; the union territories only carry the
    // subdivision code, which `stateFromRegion` reads just as well.
    return stateFromRegion(address.state) ?? stateFromRegion(address["ISO3166-2-lvl4"]);
  } catch {
    return null;
  }
}

/**
 * Which state the site is showing right now.
 *
 * The value is settled before the page renders: the server reads it off the
 * cookie (or off the host's own IP lookup) and hands it in as `initial`, so
 * the first paint is already the visitor's state and a reload reproduces it
 * exactly. Only a visitor we know nothing about — no cookie, no edge header —
 * costs a round trip to `/api/geo`, and its answer is then written to the
 * cookie so it never happens twice.
 *
 * What the site never does is move someone on its own. An IP that now reads a
 * different state raises a `suggestion` — an offer in the corner of the page —
 * and nothing changes until the visitor takes it. Two reasons for that. The
 * first is that Indian IP geolocation is not accurate enough to act on: the
 * large mobile carriers route whole states through a handful of gateways, so a
 * Jio subscriber standing in Delhi commonly resolves to Mumbai, and switching
 * on that signal would flip the page under someone who never moved. The second
 * is that on a property site the state is the market being shopped, not the
 * ground being stood on — a Delhi buyer spending a week in Haryana still wants
 * Delhi listings.
 *
 * A hand-picked state outranks every guess, permanently, and is never even
 * asked about. The account is deliberately not an input: the State on a profile
 * is the visitor's own address, not a request to be shown that market.
 */
export function LocationProvider({
  children,
  initial = null,
  edgeState = null,
}: {
  children: ReactNode;
  initial?: StoredLocation | null;
  edgeState?: string | null;
}) {
  const [location, setLocation] = useState<StoredLocation | null>(initial);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  // Mirrors the state for the callbacks below, which must not be rebuilt when
  // it changes: the detection request and the permission prompt are both
  // awaited, and both have to see what has settled since they started.
  const current = useRef(location);

  const commit = useCallback((next: StoredLocation) => {
    current.current = next;
    setLocation(next);
    // Whatever we were about to ask about is moot once the state changes.
    setSuggestion(null);
  }, []);

  const apply = useCallback(
    (next: StoredLocation) => {
      commit(next);
      writeCookie(next);

      try {
        new BroadcastChannel(BROADCAST_CHANNEL).postMessage(next);
      } catch {
        // Older browsers simply keep their tabs independent.
      }
    },
    [commit],
  );

  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(BROADCAST_CHANNEL);
      // The sending tab has already written the cookie, so this only catches up.
      channel.onmessage = (event) => commit(event.data as StoredLocation);
    } catch {
      channel = null;
    }

    return () => channel?.close();
  }, [commit]);

  useEffect(() => {
    // A pick made before this browser had the cookie. Carrying it over here
    // rather than dropping it means nobody who chose a state loses it.
    const legacy = readLegacyPick();
    if (legacy && !current.current) {
      apply({ state: legacy, source: "picked" });
      return;
    }

    let cancelled = false;

    const consider = (live: string | null) => {
      if (cancelled) return;

      const decision = decideOnLiveState(current.current, live, readDismissed());
      if (decision.kind === "adopt") apply({ state: decision.state, source: "detected" });
      if (decision.kind === "suggest") setSuggestion(decision.state);
    };

    // The host already answered from the edge, for free.
    if (edgeState) {
      consider(edgeState);
      return;
    }

    // Off Vercel and Cloudflare there is no header to read, so ask ourselves —
    // once for the whole visit, and only while there is something to learn.
    if (current.current?.source === "picked") return;
    if (!claimSessionCheck()) return;

    void (async () => {
      try {
        const res = await fetch("/api/geo", { cache: "no-store" });
        consider(((await res.json()) as { state?: string | null }).state ?? null);
      } catch {
        // Whatever we had stands, and the next visit tries again.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apply, edgeState]);

  const setStateByName = useCallback(
    (state: string | null) => {
      // An explicit "All India" is a pick like any other, stored as an empty
      // state so detection cannot put the visitor back where they just left.
      apply({ state: state ?? "", source: "picked" });
    },
    [apply],
  );

  /**
   * Taking the offer is stored as a detection, not a pick.
   *
   * The visitor confirmed our reading rather than overriding it, so the next
   * real move should raise the same offer again — which marking it `picked`
   * would silence for good.
   */
  const acceptSuggestion = useCallback(() => {
    if (suggestion) apply({ state: suggestion, source: "detected" });
  }, [apply, suggestion]);

  const dismissSuggestion = useCallback(() => {
    if (suggestion) writeDismissed(suggestion);
    setSuggestion(null);
  }, [suggestion]);

  /**
   * The browser's own geolocation, which is accurate to the locality where the
   * IP is only accurate to the state — and which costs a permission prompt.
   *
   * Asking on arrival, as this used to, spent that prompt on every visitor for
   * a guess the IP already covers. It is offered in the header instead, so the
   * prompt only ever follows someone asking for it.
   */
  const requestPreciseLocation = useCallback(async () => {
    if (!navigator.geolocation) return;

    setLocating(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 8000,
          // A fix from the last half hour is as good as a new one here, and it
          // comes back immediately instead of waking the phone's GPS.
          maximumAge: 30 * 60 * 1000,
        });
      });

      const state = await reverseGeocode(position.coords.latitude, position.coords.longitude);
      // Stored as a pick: it was one, and it should outlast the IP guess.
      if (state) apply({ state, source: "picked" });
    } catch {
      // Denied, unavailable or timed out — whatever we had already stands.
    } finally {
      setLocating(false);
    }
  }, [apply]);

  const meta = getStateMeta(location?.state || null);

  return (
    <LocationContext.Provider
      value={{
        meta,
        setStateByName,
        requestPreciseLocation,
        locating,
        suggestion,
        acceptSuggestion,
        dismissSuggestion,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}
