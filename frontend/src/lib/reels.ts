import { generateProperties, PROPERTY_IMAGES, type Property } from "@/lib/properties";
import { generateSlug } from "@/lib/utils/slug";

/**
 * Property Reels — the data side.
 *
 * Property data is not wired up yet (there is no `properties` collection), so
 * the feed is built from the same generator the listing pages, the property
 * page and the shortlist already use: ids from here resolve everywhere else.
 * When real listings arrive, `reelPool()` is the one function to replace.
 */

export type ReelProperty = {
  id: string;
  href: string;
  title: string;
  listing: Property["listing"];
  type: Property["type"];
  bhk: number;
  baths: number;
  area: number;
  priceLabel: string;
  ratePerSqft: string;
  city: string;
  locality: string;
  state: string;
  posted: string;
  featured: boolean;
  photos: string[];
  furnishing: string;
  possession: string;
  floor: string;
  facing: string;
  description: string;
  agent: { name: string; pro: boolean };
};

/** A search as the client keeps it (see search-history-context). */
export type ReelSearch = { label: string; tab: string; category: string; query: string };

/**
 * The states the generator has real city names for — anywhere else it fills
 * in "City A" / "City B", which has no place in a feed people browse.
 */
const POOL_STATES = ["Maharashtra", "Karnataka", "Delhi", "Gujarat", "Tamil Nadu", "Telangana"];
const PER_STATE = 36;
const PHOTOS_PER_REEL = 6;

const FURNISHING = ["Fully Furnished", "Semi Furnished", "Unfurnished"];
const POSSESSION = ["Ready To Move", "Under Construction", "Ready To Move", "Possession in 2026"];
const FACING = ["East", "North", "North-East", "West", "South"];
const AGENTS = [
  { name: "Ananya Sharma", pro: true },
  { name: "Rahul Menon", pro: true },
  { name: "Priya Nair", pro: false },
  { name: "Vikram Joshi", pro: false },
  { name: "Sana Qureshi", pro: true },
];

function seed(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

const RESIDENTIAL: Property["type"][] = ["Flat", "Villa", "Builder Floor"];

function describe(property: Property, furnishing: string, possession: string) {
  const what =
    property.type === "Plot"
      ? `a ${property.area} sq.ft plot`
      : RESIDENTIAL.includes(property.type)
        ? `a ${furnishing.toLowerCase()} ${property.bhk} BHK ${property.type.toLowerCase()}`
        : `${property.area} sq.ft of ${property.type.toLowerCase()} space`;

  return `Available ${property.listing === "rent" ? "for rent" : "for sale"} in ${property.locality}, ${property.city}: ${what}, ${possession.toLowerCase()}. Well connected to schools, hospitals and the main road, with markets and public transport a short walk away.`;
}

function toReel(property: Property): ReelProperty {
  const s = seed(property.id);
  const furnishing = FURNISHING[s % FURNISHING.length];
  const possession = POSSESSION[s % POSSESSION.length];
  const start = PROPERTY_IMAGES.indexOf(property.image);

  // The listing's own image first, then the rest of the set in a fixed order,
  // so the same property always shows the same gallery.
  const photos = Array.from(
    { length: PHOTOS_PER_REEL },
    (_, i) => PROPERTY_IMAGES[(Math.max(0, start) + i * 3) % PROPERTY_IMAGES.length],
  );

  const ratePerSqft = Math.round((property.priceValue * 100_000) / property.area).toLocaleString(
    "en-IN",
  );

  // The generator puts "N BHK" on every title, plots and shops included.
  const title = RESIDENTIAL.includes(property.type)
    ? property.title
    : `${property.type === "Shop/Showroom" ? "Shop / Showroom" : property.type} in ${property.locality}`;

  return {
    id: property.id,
    href: `/property/${property.id}/${generateSlug(property.title)}`,
    title,
    listing: property.listing,
    type: property.type,
    bhk: property.bhk,
    baths: property.baths,
    area: property.area,
    priceLabel: property.priceLabel,
    ratePerSqft: `₹${ratePerSqft}/sq.ft${property.listing === "rent" ? "/mo" : ""}`,
    city: property.city,
    locality: property.locality,
    state: property.state,
    posted: property.posted,
    featured: Boolean(property.featured),
    photos,
    furnishing: property.type === "Plot" ? "—" : furnishing,
    possession,
    floor: property.type === "Plot" || property.type === "Villa" ? "—" : `${(s % 14) + 1} of ${(s % 14) + 4 + (s % 6)}`,
    facing: FACING[s % FACING.length],
    description: describe(property, furnishing, possession),
    agent: AGENTS[s % AGENTS.length],
  };
}

let pool: ReelProperty[] | null = null;

/**
 * Every reel, interleaved state by state so an unpersonalised feed doesn't
 * show 36 Maharashtra listings before anything else.
 */
export function reelPool(): ReelProperty[] {
  if (pool) return pool;

  const byState = POOL_STATES.map((state) => generateProperties(state, PER_STATE).map(toReel));
  pool = Array.from({ length: PER_STATE }, (_, i) => byState.map((list) => list[i])).flat();
  return pool;
}

/** Search-box categories → property types (same map the home recommendations use). */
const TYPES_BY_CATEGORY: Record<string, Property["type"][]> = {
  flats: ["Flat", "Builder Floor"],
  villas: ["Villa"],
  pgs: ["Flat"],
  "plots/land": ["Plot"],
  commercial: ["Office Space", "Shop/Showroom"],
};

const normalize = (value: string) => value.trim().toLowerCase();

/**
 * How well one property matches one search. A place match (the words the user
 * typed — a city, locality or state) counts most; then the property type and
 * buy/rent.
 *
 * A search is one intent: "villas to buy in Pune" says nothing about villas in
 * Delhi. So type and buy/rent only count in full alongside a place match; on
 * their own (another city) they count for a quarter.
 */
function matchScore(reel: ReelProperty, search: ReelSearch) {
  const place = normalize(`${reel.locality} ${reel.city} ${reel.state}`);
  const tokens = normalize(search.query || search.label)
    .split(/[\s,]+/)
    .filter((token) => token.length > 2);

  const placeMatch = tokens.some((token) => place.includes(token));

  let intent = 0;
  if ((TYPES_BY_CATEGORY[normalize(search.category)] ?? []).includes(reel.type)) intent += 4;
  if (search.tab && (normalize(search.tab) === "rent") === (reel.listing === "rent")) intent += 2;

  return placeMatch ? 8 + intent : intent * 0.25;
}

export type RankedReel = ReelProperty & {
  /** The search that put this reel where it is, shown as "Because you searched …". */
  because: string | null;
};

/**
 * The feed order for a search history (newest search first).
 *
 * Each search's score is weighted by recency — the latest counts fully, each
 * older one a little less — so the feed leans toward what the user is looking
 * for now without forgetting the rest. Ties keep the interleaved pool order.
 * With no history this is just the pool, featured listings first.
 */
export function rankReels(searches: ReelSearch[]): RankedReel[] {
  const recent = searches.slice(0, 10);

  return reelPool()
    .map((reel, index) => {
      let score = reel.featured ? 0.5 : 0;
      let best = { score: 0, label: null as string | null };

      recent.forEach((search, i) => {
        const raw = matchScore(reel, search);
        score += raw * (1 - i * 0.08);
        if (raw >= 8 && raw > best.score) best = { score: raw, label: search.label };
      });

      return { reel: { ...reel, because: best.label }, index, score };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ reel }) => reel);
}
