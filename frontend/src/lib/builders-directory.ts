import allBuilders from "@/data/all-builders.json";
import { stateExploreHref } from "@/lib/state-routes";

/**
 * Data behind `/top-builders-in-india`.
 *
 * `src/data/all-builders.json` is the researched version of the state-page
 * builder file: same shape (state → builder key → record), but with the fields
 * actually filled in. Only 96 of the 350 records are complete, and the
 * directory shows those — a card with three empty rows says nothing.
 *
 * Records stay state-wise, so a builder present in three states gets three
 * cards: the cities and projects differ per state, and merging them would
 * claim, say, that DLF builds the same set of projects everywhere.
 */

type BuilderRecord = {
  name: string;
  logo?: string;
  since?: string | number;
  /** Project names — the state-page file stores a count string here instead. */
  projects?: string[] | string;
  cities?: string[];
  categories?: string[];
  href?: string;
};

export type DirectoryBuilder = {
  /** Unique across the list: the same builder appears once per state. */
  id: string;
  name: string;
  state: string;
  stateHref: string;
  since: string;
  /** Years of operation, or null when `since` is not a usable year. */
  experience: number | null;
  projects: string[];
  cities: string[];
  categories: string[];
  logo?: string;
  href?: string;
};

const BUILDERS_BY_STATE = allBuilders as Record<string, Record<string, BuilderRecord>>;

/** A record earns a card only when every detail row on it has something to show. */
function isComplete(record: BuilderRecord) {
  return Boolean(
    record.since &&
      Array.isArray(record.projects) &&
      record.projects.length > 0 &&
      record.cities?.length &&
      record.categories?.length,
  );
}

function yearsSince(since: string) {
  const year = Number(since);
  const currentYear = new Date().getFullYear();

  return Number.isFinite(year) && year > 1800 && year <= currentYear ? currentYear - year : null;
}

function buildDirectory(): DirectoryBuilder[] {
  const builders: DirectoryBuilder[] = [];

  for (const [state, records] of Object.entries(BUILDERS_BY_STATE)) {
    for (const [key, record] of Object.entries(records)) {
      if (!isComplete(record)) continue;

      const since = String(record.since);

      builders.push({
        id: `${state}:${key}`,
        name: record.name,
        state,
        stateHref: stateExploreHref(state),
        since,
        experience: yearsSince(since),
        projects: record.projects as string[],
        cities: record.cities ?? [],
        categories: record.categories ?? [],
        ...(record.logo ? { logo: record.logo } : {}),
        ...(record.href ? { href: record.href } : {}),
      });
    }
  }

  return builders.sort((a, b) => a.name.localeCompare(b.name) || a.state.localeCompare(b.state));
}

export const DIRECTORY_BUILDERS = buildDirectory();

/** States that actually have a card, so the filter never offers an empty result. */
export const DIRECTORY_STATES = [...new Set(DIRECTORY_BUILDERS.map((builder) => builder.state))].sort(
  (a, b) => a.localeCompare(b),
);

/**
 * Categories ordered by how many builders carry them. The tail is long and very
 * thin — "Tunneling Works" belongs to one builder — so the filter takes the top
 * slice and leaves the rest to the search box.
 */
export const DIRECTORY_CATEGORIES = (() => {
  const counts = new Map<string, number>();

  for (const builder of DIRECTORY_BUILDERS) {
    for (const category of builder.categories) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([category]) => category);
})();

export const DIRECTORY_STATS = {
  builders: DIRECTORY_BUILDERS.length,
  states: DIRECTORY_STATES.length,
  cities: new Set(DIRECTORY_BUILDERS.flatMap((builder) => builder.cities)).size,
  projects: DIRECTORY_BUILDERS.reduce((total, builder) => total + builder.projects.length, 0),
};
