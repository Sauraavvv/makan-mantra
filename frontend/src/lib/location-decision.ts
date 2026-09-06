import type { StoredLocation } from "@/lib/geo";

/**
 * What to do with a state the visitor's IP has just been read as.
 *
 * `adopt` takes it silently, `suggest` offers it, `keep` does nothing.
 */
export type LocationDecision =
  | { kind: "adopt"; state: string }
  | { kind: "suggest"; state: string }
  | { kind: "keep" };

const KEEP: LocationDecision = { kind: "keep" };

/**
 * The site's whole policy on acting — or not acting — on an IP reading.
 *
 * Silence is the default and the rule has one exception: a visitor we hold
 * nothing for. They are looking at the all-India view, so there is no market to
 * pull them out of and adopting the reading can only help.
 *
 * Everyone else is already somewhere, and moving them is never automatic:
 *
 *   - A hand-picked state is the visitor's own answer. It is not overridden and
 *     not questioned, however far the IP says they have travelled.
 *   - A state we detected earlier can be *offered* against a newer reading, but
 *     never swapped underneath them. Indian IP geolocation is not accurate
 *     enough to act on — the large mobile carriers route entire states through
 *     a handful of gateways, so a Jio subscriber standing in Delhi commonly
 *     resolves to Mumbai — and on a property site the state is the market being
 *     shopped rather than the ground being stood on: a Delhi buyer spending a
 *     week in Haryana still wants Delhi listings.
 *   - An offer already turned down is not made again.
 *
 * Kept apart from the provider that calls it so the policy can be read, and
 * tested, without a browser.
 */
export function decideOnLiveState(
  settled: StoredLocation | null,
  live: string | null,
  dismissed: string | null,
): LocationDecision {
  if (!live) return KEEP;
  if (!settled) return { kind: "adopt", state: live };

  if (settled.source !== "detected") return KEEP;
  if (live === settled.state || live === dismissed) return KEEP;

  return { kind: "suggest", state: live };
}
