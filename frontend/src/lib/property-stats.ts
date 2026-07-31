import { getPropertySubmissionsCollection } from "@/lib/auth/db";
import { canonicalStateName } from "@/lib/state-routes";

export type PropertyStats = {
  properties: number;
  cities: number;
  states: number;
};

type SubmissionLocation = {
  location?: string | null;
  city?: string | null;
  state?: string | null;
};

/**
 * Submissions from the short form only carry a free-text location such as
 * "Powai, Mumbai, Maharashtra", so the city/state are derived from it when the
 * dedicated fields are absent.
 */
function splitLocation({ location, city, state }: SubmissionLocation) {
  const parts = (location ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  let resolvedState = state?.trim() ? canonicalStateName(state.trim()) : null;
  let resolvedCity = city?.trim() || null;

  if (!resolvedState && parts.length) {
    const last = parts[parts.length - 1];
    const matched = canonicalStateName(last);

    if (matched) {
      resolvedState = matched;
      resolvedCity = resolvedCity ?? parts[parts.length - 2] ?? null;
    }
  }

  if (!resolvedCity && parts.length) {
    const candidate = parts[parts.length - 1];
    resolvedCity = canonicalStateName(candidate) ? (parts[parts.length - 2] ?? null) : candidate;
  }

  return {
    state: resolvedState,
    city: resolvedCity ? resolvedCity.toLowerCase() : null,
  };
}

/** Live totals for the post-property hero. Returns null when the database is unreachable. */
export async function getPropertyStats(): Promise<PropertyStats | null> {
  try {
    const submissions = await getPropertySubmissionsCollection();

    const docs = await submissions
      .find({}, { projection: { location: 1, city: 1, state: 1 } })
      .toArray();

    const cities = new Set<string>();
    const states = new Set<string>();

    for (const doc of docs) {
      const { city, state } = splitLocation(doc as SubmissionLocation);
      if (city) cities.add(city);
      if (state) states.add(state);
    }

    return { properties: docs.length, cities: cities.size, states: states.size };
  } catch {
    return null;
  }
}
