import { cookies, headers } from "next/headers";
import { LOCATION_COOKIE, parseLocation, stateFromEdgeHeaders, type StoredLocation } from "@/lib/geo";

export type ResolvedLocation = {
  /** What to render with, or `null` when this visitor is new to us. */
  initial: StoredLocation | null;
  /**
   * Where the visitor's IP says they are *right now*, when the host tells us.
   *
   * Kept apart from `initial` on purpose: it is never rendered with, only
   * compared against what we already had. See `LocationProvider` for why a
   * visitor is offered the move rather than moved.
   */
  edgeState: string | null;
};

/**
 * The state to render this request with, settled before anything is sent.
 *
 * The cookie comes first because it is the only source that can hold a
 * decision — a state the visitor picked, or one we detected on an earlier
 * visit — and honouring it is what makes a reload reproduce the page instead
 * of guessing again.
 *
 * With no cookie we take whatever the host resolved from the IP at the edge,
 * which costs nothing and means even a first-time visitor's first paint is
 * already their state. Off Vercel or Cloudflare there is no such header, and
 * the client falls back to `/api/geo` once, after mount.
 */
export async function resolveLocation(): Promise<ResolvedLocation> {
  const [store, headerList] = await Promise.all([cookies(), headers()]);
  const edgeState = stateFromEdgeHeaders(headerList);
  const stored = parseLocation(store.get(LOCATION_COOKIE)?.value);

  if (stored) return { initial: stored, edgeState };

  return {
    initial: edgeState ? { state: edgeState, source: "detected" } : null,
    edgeState,
  };
}
