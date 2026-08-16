/**
 * What a signed-out visitor leaves behind, kept on their own device until there
 * is an account to attach it to.
 *
 * Deliberately client-side only. The alternative — an anonymous id in a cookie
 * with rows in the database — would mean a row for every crawler that ever
 * touches the 25 lakh location pages, and would buy nothing a visitor can see:
 * without an account there is no second device to carry the history to.
 *
 * Each store is capped, so the whole of it stays a few kilobytes and can be
 * posted in one request when the visitor signs in.
 */

export type GuestSnapshot = {
  title: string;
  price: string;
  locality: string;
  city: string;
  image: string;
  config?: string;
  area?: string;
};

export type GuestSearch = {
  id: string;
  label: string;
  tab: string;
  category: string;
  query: string;
  searchedAt: string;
};

export type GuestView = {
  propertyId: string;
  snapshot: GuestSnapshot;
  viewedAt: string;
};

export type GuestSave = {
  propertyId: string;
  snapshot: GuestSnapshot;
  savedAt: string;
};

/**
 * Bumped only when a shape changes in a way older data cannot be read as. A
 * store written under a different version is dropped rather than migrated —
 * this is a convenience copy, and the account has the version that matters.
 */
const VERSION = 1;

const STORE = {
  searches: { key: "mm-recent-searches", limit: 10 },
  views: { key: "mm-recent-viewed", limit: 12 },
  saves: { key: "mm-shortlist", limit: 50 },
} as const;

type Kind = keyof typeof STORE;

/** Fired on our own writes too, which `storage` alone does not do for the tab that wrote. */
const CHANGE_EVENT = "mm-guest-activity";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readRaw(kind: Kind): unknown[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(localStorage.getItem(STORE[kind].key) || "null");

    // The searches store predates the version wrapper and is a bare array on
    // devices that have not written since; those entries are still good.
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object" && (parsed as { v?: number }).v === VERSION) {
      const items = (parsed as { items?: unknown }).items;
      return Array.isArray(items) ? items : [];
    }
    return [];
  } catch {
    return [];
  }
}

function write(kind: Kind, items: unknown[]) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      STORE[kind].key,
      JSON.stringify({ v: VERSION, items: items.slice(0, STORE[kind].limit) }),
    );
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // A full or blocked store is not worth breaking a click over; the visitor
    // simply gets no history until they sign in.
  }
}

function snapshot(value: unknown): GuestSnapshot {
  const raw = (value ?? {}) as Record<string, unknown>;

  return {
    title: text(raw.title),
    price: text(raw.price),
    locality: text(raw.locality),
    city: text(raw.city),
    image: text(raw.image),
    config: text(raw.config) || undefined,
    area: text(raw.area) || undefined,
  };
}

export function readGuestSearches(): GuestSearch[] {
  return readRaw("searches")
    .map((value) => {
      const raw = (value ?? {}) as Record<string, unknown>;
      const label = text(raw.label);
      if (!label) return null;

      return {
        id: text(raw.id) || `${Date.now()}-${label}`,
        label,
        tab: text(raw.tab),
        category: text(raw.category),
        query: text(raw.query) || label,
        searchedAt: text(raw.searchedAt) || text(raw.createdAt) || new Date().toISOString(),
      } satisfies GuestSearch;
    })
    .filter((item): item is GuestSearch => item !== null)
    .slice(0, STORE.searches.limit);
}

export function writeGuestSearches(items: GuestSearch[]) {
  write("searches", items);
}

function readProperties<T extends GuestView | GuestSave>(kind: "views" | "saves", stamp: keyof T) {
  return readRaw(kind)
    .map((value) => {
      const raw = (value ?? {}) as Record<string, unknown>;
      const propertyId = text(raw.propertyId);
      if (!propertyId) return null;

      return {
        propertyId,
        snapshot: snapshot(raw.snapshot),
        [stamp]: text(raw[stamp as string]) || new Date().toISOString(),
      } as T;
    })
    .filter((item): item is T => item !== null)
    .slice(0, STORE[kind].limit);
}

export function readGuestViews() {
  return readProperties<GuestView>("views", "viewedAt");
}

export function writeGuestViews(items: GuestView[]) {
  write("views", items);
}

export function readGuestSaves() {
  return readProperties<GuestSave>("saves", "savedAt");
}

export function writeGuestSaves(items: GuestSave[]) {
  write("saves", items);
}

/** Both halves of "something changed": another tab, and this one. */
export function subscribeGuestActivity(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(CHANGE_EVENT, listener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}

function clearGuestActivity() {
  for (const kind of Object.keys(STORE) as Kind[]) {
    localStorage.removeItem(STORE[kind].key);
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * Hands everything this device collected while signed out to the account that
 * just signed in, then forgets it locally.
 *
 * The local copy is only dropped once the server has confirmed it holds the
 * data, so a failed request costs a retry on the next page rather than the
 * history itself. The server merges by key, so retrying is harmless.
 */
export async function claimGuestActivity() {
  const searches = readGuestSearches();
  const views = readGuestViews();
  const saves = readGuestSaves();

  if (searches.length === 0 && views.length === 0 && saves.length === 0) return;

  try {
    const response = await fetch("/api/account/claim-guest-activity", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ searches, views, saves }),
    });

    if (response.ok) clearGuestActivity();
  } catch {
    // Kept for the next attempt.
  }
}
