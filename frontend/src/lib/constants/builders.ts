import buildersData from "@/data/builders.json";

/**
 * Builder profiles shown on the "Top Builders" cards.
 *
 * State pages only store builder *names*, so the card details live in
 * `src/data/builders.json`, grouped by state: every state has its own entry for
 * a builder, so the same builder can carry different cities or project counts
 * in each state. Fill in the values you have verified — every field is optional
 * and anything left empty simply hides that row on the card.
 *
 * `logo` points at a file in `public/` (e.g. "/builders/dlf.png").
 */
export type BuilderProfile = {
  logo?: string;
  since?: string | number;
  /** Delivered projects, written the way it should read: "210+", "90+". */
  projects?: string;
  cities?: string[];
  categories?: string[];
  /** Link for "Explore Builder"; the card is not clickable without it. */
  href?: string;
};

type BuilderRecord = {
  name: string;
  logo?: string;
  since?: string | number;
  projects?: string;
  cities?: string[];
  categories?: string[];
  href?: string;
};

const BUILDERS_BY_STATE = buildersData as Record<string, Record<string, BuilderRecord>>;

/** Drops suffixes and bracketed asides so "Lodha Group (Macrotech Developers)" → "lodha group". */
function normalizeBuilderName(name: string) {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(private|pvt|limited|ltd|llp|inc)\b\.?/g, " ")
    .replace(/[^a-z0-9&-]+/g, " ")
    .trim();
}

/** Keeps only the fields that were actually filled in, so blanks never reach the card. */
function toProfile(record: BuilderRecord | undefined): BuilderProfile {
  if (!record) return {};

  const profile: BuilderProfile = {};

  if (record.logo) profile.logo = record.logo;
  if (record.since) profile.since = record.since;
  if (record.projects) profile.projects = record.projects;
  if (record.cities?.length) profile.cities = record.cities;
  if (record.categories?.length) profile.categories = record.categories;
  if (record.href) profile.href = record.href;

  return profile;
}

/** Profile for a builder in a given state, or an empty object when we have none. */
export function getBuilderProfile(name: string, state: string): BuilderProfile {
  const normalized = normalizeBuilderName(name);
  if (!normalized) return {};

  const stateKey = Object.keys(BUILDERS_BY_STATE).find(
    (key) => key.toLowerCase() === state.trim().toLowerCase(),
  );
  const records = stateKey ? BUILDERS_BY_STATE[stateKey] : undefined;
  if (!records) return {};

  if (records[normalized]) return toProfile(records[normalized]);

  // Fall back to the longest key the name starts with, so "DLF Limited" finds "dlf".
  const match = Object.keys(records)
    .filter((key) => normalized === key || normalized.startsWith(`${key} `))
    .sort((a, b) => b.length - a.length)[0];

  return toProfile(match ? records[match] : undefined);
}
