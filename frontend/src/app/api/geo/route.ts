import { NextRequest, NextResponse } from "next/server";
import {
  clientIpFromHeaders,
  isPrivateIp,
  stateFromEdgeHeaders,
  stateFromRegion,
} from "@/lib/geo";

export const dynamic = "force-dynamic";

/**
 * Where to ask when the host does not resolve the region for us.
 *
 * `{ip}` is substituted. The default needs no key and answers in the shape
 * `stateFromLookup` reads, but its free tier is metered per calling IP — and
 * off a serverless host that is one quota shared by every visitor. A
 * deployment doing real traffic should point `GEOIP_ENDPOINT` at its own
 * account, or at a MaxMind lookup on our backend.
 */
const GEOIP_ENDPOINT = process.env.GEOIP_ENDPOINT || "https://ipwho.is/{ip}";

/** Long enough to outlast a person reloading, short enough to stay true. */
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Misses expire far sooner than hits.
 *
 * A miss is usually the service being rate-limited or slow rather than a real
 * "we don't know", and caching that for an hour would hold a whole city on the
 * all-India view long after the service recovered.
 */
const MISS_TTL_MS = 5 * 60 * 1000;
const CACHE_LIMIT = 5000;

/**
 * One lookup per address per hour, rather than one per visit.
 *
 * Per-process and lost on a restart, which is the right trade here: the answer
 * is also written to the visitor's cookie, so a cold cache costs one request
 * from each address, not one from each page view.
 */
const cache = new Map<string, { state: string | null; expires: number }>();

function readCache(ip: string) {
  const hit = cache.get(ip);
  if (!hit) return undefined;

  if (hit.expires < Date.now()) {
    cache.delete(ip);
    return undefined;
  }

  return hit.state;
}

function writeCache(ip: string, state: string | null) {
  // Oldest first, because Map iterates in insertion order.
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }

  cache.set(ip, { state, expires: Date.now() + (state ? CACHE_TTL_MS : MISS_TTL_MS) });
}

/**
 * The region field, whatever this particular service calls it.
 *
 * `stateFromRegion` takes codes and names alike, so every candidate can be
 * tried in turn without knowing which shape the service answered in.
 */
function stateFromLookup(payload: Record<string, unknown>) {
  // Several of these services answer 200 with a failure in the body — a rate
  // limit, a bad address — rather than a status code.
  if (payload.success === false || payload.error === true) return null;

  // Code where there is one, name where there is not — some services report
  // only "India", and rejecting that would throw away a good answer.
  const country = payload.country_code ?? payload.countryCode ?? payload.country;
  if (typeof country === "string" && !["IN", "INDIA"].includes(country.toUpperCase())) {
    return null;
  }

  const candidates = [
    payload.region_code,
    payload.region,
    payload.regionName,
    payload.subdivision,
    payload.principalSubdivision,
    payload.state,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;

    const state = stateFromRegion(candidate);
    if (state) return state;
  }

  return null;
}

async function lookupState(ip: string) {
  const cached = readCache(ip);
  if (cached !== undefined) return cached;

  let state: string | null = null;
  try {
    const res = await fetch(GEOIP_ENDPOINT.replace("{ip}", encodeURIComponent(ip)), {
      headers: { Accept: "application/json" },
      // A visitor should not wait on this; a miss just means the all-India view.
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });

    if (res.ok) state = stateFromLookup((await res.json()) as Record<string, unknown>);
  } catch {
    // Down, rate-limited or too slow: the default view stands, and the failure
    // is cached below so the next visitor does not wait on it again.
  }

  writeCache(ip, state);
  return state;
}

/**
 * The visitor's state, worked out from their IP address.
 *
 * Free of any browser permission prompt, which is the point: the geolocation
 * API only answers for the minority who accept it, and asking on arrival is a
 * poor first impression. Precise location stays available in the header for
 * anyone who wants it.
 */
export async function GET(req: NextRequest) {
  const edgeState = stateFromEdgeHeaders(req.headers);
  if (edgeState) return NextResponse.json({ state: edgeState, source: "edge" });

  const ip = clientIpFromHeaders(req.headers);
  if (!ip || isPrivateIp(ip)) return NextResponse.json({ state: null, source: "none" });

  return NextResponse.json({ state: await lookupState(ip), source: "lookup" });
}
