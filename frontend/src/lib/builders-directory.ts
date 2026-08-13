import stateBuilders from "@/data/state-builders.json";
import { stateExploreHref, stateSlug } from "@/lib/state-routes";

/**
 * Data behind `/top-builders-in-india` and the home page's builder section.
 *
 * `src/data/state-builders.json` is state → array of builders, five per state
 * across all 35 states and UTs, every field filled in. It replaced an earlier
 * file where only 96 of 350 records were usable, so nothing is filtered out
 * here any more.
 *
 * Records stay state-wise, so a builder present in three states gets three
 * cards: the cities and projects differ per state, and merging them would
 * claim, say, that DLF builds the same set of projects everywhere.
 */

type BuilderRecord = {
  builder_name: string;
  established_date: string;
  summary: string;
  projects_built: string[];
  cities_of_operation: string[];
};

export type DirectoryBuilder = {
  /** Unique across the list: the same builder appears once per state. */
  id: string;
  /** Registered name, kept for search and for the title attribute on a card. */
  name: string;
  /** What the site shows: the same name without its legal suffix. */
  displayName: string;
  state: string;
  stateHref: string;
  since: string;
  /** Years of operation, or null when `since` is not a usable year. */
  experience: number | null;
  /** A paragraph on the builder — shown clamped, with the rest behind a click. */
  summary: string;
  projects: string[];
  cities: string[];
  /** Neither is in the data yet; both are here for when logos arrive. */
  logo?: string;
  href?: string;
};

const BUILDERS_BY_STATE = stateBuilders as Record<string, BuilderRecord[]>;

/**
 * Trailing company form — "Private Limited", "Pvt. Ltd.", "LLP" and friends.
 * Anchored to the end so a builder actually called "Limited Edition Homes"
 * keeps its name.
 */
const LEGAL_SUFFIX = /[\s,.]*\b(?:(?:private|pvt\.?)\s+)?(?:limited|ltd\.?|llp|inc\.?)\.?\s*$/i;

/** Most builders carry one, and none of them read well on a card. */
function withoutLegalSuffix(name: string) {
  const trimmed = name.replace(LEGAL_SUFFIX, "").trim();

  // A name that is nothing but its suffix stays as it was.
  return trimmed || name;
}

/**
 * Project names carry a locality in brackets — "DLF Avenue (Saket)". The card
 * names the builder's cities a row below, so the bracket only lengthens a name
 * that has to fit a fixed number of rows.
 *
 * Stripping them makes a couple of names collide — Omaxe City is listed for
 * both Rohtak and Palwal — so the list is deduped rather than repeating a name
 * with nothing left to tell the two apart.
 */
function projectNames(names: string[]) {
  const stripped = names.map((name) =>
    name
      .replace(/\s*\([^()]*\)/g, "")
      .replace(/\s{2,}/g, " ")
      .trim(),
  );

  return [...new Set(stripped.filter(Boolean))];
}

function yearsSince(since: string) {
  const year = Number(since);
  const currentYear = new Date().getFullYear();

  return Number.isFinite(year) && year > 1800 && year <= currentYear ? currentYear - year : null;
}

function buildDirectory(): DirectoryBuilder[] {
  const builders: DirectoryBuilder[] = [];

  for (const [state, records] of Object.entries(BUILDERS_BY_STATE)) {
    for (const record of records) {
      const since = String(record.established_date);

      builders.push({
        // The data is a list rather than a keyed map, so the name carries the id.
        id: `${state}:${stateSlug(record.builder_name)}`,
        name: record.builder_name,
        displayName: withoutLegalSuffix(record.builder_name),
        state,
        stateHref: stateExploreHref(state),
        since,
        experience: yearsSince(since),
        summary: record.summary,
        projects: projectNames(record.projects_built),
        cities: record.cities_of_operation,
      });
    }
  }

  // Sorted on what the cards actually read, so A–Z looks alphabetical on screen.
  return builders.sort(
    (a, b) => a.displayName.localeCompare(b.displayName) || a.state.localeCompare(b.state),
  );
}

export const DIRECTORY_BUILDERS = buildDirectory();

/** States that actually have a card, so the filter never offers an empty result. */
export const DIRECTORY_STATES = [
  ...new Set(DIRECTORY_BUILDERS.map((builder) => builder.state)),
].sort((a, b) => a.localeCompare(b));

/**
 * The same builders keyed by state slug, for the home page section that follows
 * the header's location picker. Slugs rather than names because the picker says
 * "Jammu & Kashmir" where the data says "Jammu and Kashmir".
 *
 * Server-only by intent: a Client Component that imported this would pull the
 * whole JSON into the browser bundle, so the home page reads it and passes the
 * one slice it needs down as a prop.
 */
export const BUILDERS_BY_STATE_SLUG: Record<string, DirectoryBuilder[]> = (() => {
  const grouped: Record<string, DirectoryBuilder[]> = {};

  for (const builder of DIRECTORY_BUILDERS) {
    (grouped[stateSlug(builder.state)] ??= []).push(builder);
  }

  // Busiest developer first — it is the one the section opens on.
  for (const builders of Object.values(grouped)) {
    builders.sort(
      (a, b) => b.projects.length - a.projects.length || a.displayName.localeCompare(b.displayName),
    );
  }

  return grouped;
})();

export const DIRECTORY_STATS = {
  builders: DIRECTORY_BUILDERS.length,
  states: DIRECTORY_STATES.length,
  cities: new Set(DIRECTORY_BUILDERS.flatMap((builder) => builder.cities)).size,
  projects: DIRECTORY_BUILDERS.reduce((total, builder) => total + builder.projects.length, 0),
};
