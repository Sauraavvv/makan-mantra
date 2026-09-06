import { STATES } from "@/lib/states";

/**
 * Where the site's current state lives between requests.
 *
 * A cookie rather than `localStorage` because the server renders the header,
 * the hero and the market snapshot for that state: the value has to be in hand
 * *before* the first byte goes out, or every visit starts on "India" and flips
 * a moment later. A cookie is the only client-owned store the server can read.
 */
export const LOCATION_COOKIE = "mm-location";

/** Six months — long enough that a returning visitor never re-detects. */
export const LOCATION_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

/**
 * How we came by the state.
 *
 * `picked` is the visitor saying it themselves in the header, and it is final:
 * detection never overwrites it, not on this page and not on any later visit.
 * `detected` is our guess, which a pick replaces.
 */
export type LocationSource = "picked" | "detected";

export type StoredLocation = {
  /** A canonical state name, or "" for an explicit "All India". */
  state: string;
  source: LocationSource;
};

/**
 * ISO 3166-2:IN subdivision codes, which is what every IP geolocation source
 * we might sit behind reports — Vercel, Cloudflare and MaxMind alike.
 *
 * Dadra and Nagar Haveli (IN-DH) is deliberately absent: we publish no pages
 * for it, so a visitor there is better served by the all-India default than by
 * a state label that matches nothing.
 */
const STATE_BY_REGION_CODE: Record<string, string> = {
  AN: "Andaman and Nicobar Islands", AP: "Andhra Pradesh", AR: "Arunachal Pradesh",
  AS: "Assam", BR: "Bihar", CH: "Chandigarh", CT: "Chhattisgarh",
  DL: "Delhi", GA: "Goa", GJ: "Gujarat", HR: "Haryana", HP: "Himachal Pradesh",
  JK: "Jammu and Kashmir", JH: "Jharkhand", KA: "Karnataka", KL: "Kerala",
  LA: "Ladakh", LD: "Lakshadweep", MP: "Madhya Pradesh", MH: "Maharashtra",
  MN: "Manipur", ML: "Meghalaya", MZ: "Mizoram", NL: "Nagaland", OR: "Odisha",
  PY: "Puducherry", PB: "Punjab", RJ: "Rajasthan", SK: "Sikkim",
  TN: "Tamil Nadu", TG: "Telangana", TR: "Tripura", UP: "Uttar Pradesh",
  UT: "Uttarakhand", WB: "West Bengal",
};

/**
 * Names that arrive spelled differently from ours.
 *
 * Geocoders and GeoIP databases disagree on the renamed states and on how to
 * write Delhi, and a name we fail to match costs the visitor their state.
 */
const STATE_BY_ALIAS: Record<string, string> = {
  "orissa": "Odisha",
  "pondicherry": "Puducherry",
  "nct of delhi": "Delhi",
  "national capital territory of delhi": "Delhi",
  "new delhi": "Delhi",
  "delhi ncr": "Delhi",
  "jammu & kashmir": "Jammu and Kashmir",
  "uttaranchal": "Uttarakhand",
  "andaman & nicobar islands": "Andaman and Nicobar Islands",
  "andaman and nicobar": "Andaman and Nicobar Islands",
};

const STATE_BY_LOWERCASE_NAME = new Map(STATES.map((state) => [state.toLowerCase(), state]));

/**
 * A canonical state name from whatever a location source reported — a
 * subdivision code (`MH`, `IN-MH`) or a written-out name.
 *
 * Returns `null` for anything we do not publish pages for, which the callers
 * read as "we did not learn the state" rather than as an error.
 */
export function stateFromRegion(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;

  const code = raw.replace(/^IN-/i, "").toUpperCase();
  if (code.length === 2 && STATE_BY_REGION_CODE[code]) return STATE_BY_REGION_CODE[code];

  const name = raw.toLowerCase();
  return STATE_BY_LOWERCASE_NAME.get(name) ?? STATE_BY_ALIAS[name] ?? null;
}

/**
 * The state the hosting platform already worked out from the visitor's IP.
 *
 * Vercel and Cloudflare both resolve it at the edge and hand it over as a
 * header, which costs nothing and needs no lookup of our own. Anything else
 * falls through to `/api/geo`. `x-geo-region` is the escape hatch for a proxy
 * we put the region on ourselves (nginx's GeoIP module, say).
 */
export function stateFromEdgeHeaders(headers: Headers): string | null {
  const country = (headers.get("x-vercel-ip-country") ?? headers.get("cf-ipcountry") ?? "").toUpperCase();
  // A non-Indian visitor gets the all-India view rather than a state they are
  // nowhere near; an unknown country is not evidence either way, so it passes.
  if (country && country !== "IN") return null;

  return (
    stateFromRegion(headers.get("x-vercel-ip-country-region")) ??
    stateFromRegion(headers.get("cf-region-code")) ??
    stateFromRegion(headers.get("cf-region")) ??
    stateFromRegion(headers.get("x-geo-region"))
  );
}

/**
 * The visitor's own address, as opposed to the last proxy's.
 *
 * `x-forwarded-for` is a chain and the client is its first entry; everything
 * after it was added by something in front of us.
 */
export function clientIpFromHeaders(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();

  return first || headers.get("x-real-ip")?.trim() || null;
}

/** Addresses no geolocation service can say anything useful about. */
export function isPrivateIp(ip: string) {
  return (
    ip === "::1" ||
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("169.254.") ||
    ip.startsWith("fc") ||
    ip.startsWith("fd") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
}

export function serializeLocation(location: StoredLocation) {
  return `${location.source}:${encodeURIComponent(location.state)}`;
}

/**
 * Reads the cookie back, tolerating anything that is not ours.
 *
 * An empty state with `picked` is meaningful — it is the visitor choosing
 * "All India" by hand, which has to survive a refresh exactly like a state
 * does, or detection would quietly put them back somewhere they left.
 */
export function parseLocation(value: string | null | undefined): StoredLocation | null {
  if (!value) return null;

  const separator = value.indexOf(":");
  if (separator === -1) return null;

  const source = value.slice(0, separator);
  if (source !== "picked" && source !== "detected") return null;

  let state: string;
  try {
    state = decodeURIComponent(value.slice(separator + 1)).trim();
  } catch {
    return null;
  }

  if (!state) return source === "picked" ? { state: "", source } : null;

  const canonical = STATE_BY_LOWERCASE_NAME.get(state.toLowerCase());
  return canonical ? { state: canonical, source } : null;
}
