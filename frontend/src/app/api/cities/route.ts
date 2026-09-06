import { NextRequest, NextResponse } from "next/server";
import { getDistrictOverviewCollection, getLocationPagesCollection } from "@/lib/auth/db";
import { canonicalStateName } from "@/lib/state-routes";

const NEARBY_DISTRICT_LIMIT = 24;

type Coordinates = { latitude: number; longitude: number };

function escapedExact(value: string) {
  return { $regex: `^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" };
}

function uniqueNames(values: unknown[]) {
  const names: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const name = typeof value === "string" ? value.trim() : "";
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;

    names.push(name);
    seen.add(key);
  }

  return names;
}

/** A reproducible shuffle gives each state one shared sequence for the day. */
function seededRandom(seed: string) {
  let value = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }

  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], seed: string) {
  const next = seededRandom(seed);
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(next() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function mixCityAndDistrictNames(cities: unknown[], districts: unknown[], seed: string) {
  const cityNames = shuffled(uniqueNames(cities), `${seed}:cities`);
  const districtNames = shuffled(uniqueNames(districts), `${seed}:districts`);
  const next = seededRandom(`${seed}:mix`);
  const names: string[] = [];
  const seen = new Set<string>();
  let useCity = next() >= 0.5;

  while (cityNames.length > 0 || districtNames.length > 0) {
    const canUseCity = cityNames.length > 0;
    const canUseDistrict = districtNames.length > 0;
    const name = ((useCity && canUseCity) || !canUseDistrict ? cityNames : districtNames).shift();
    const key = name?.toLowerCase();
    if (!name || !key || seen.has(key)) continue;

    names.push(name);
    seen.add(key);
    useCity = !useCity;
  }

  return names;
}

function coordinatesFrom(value: unknown): Coordinates | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const latitude = Number(record.latitude);
  const longitude = Number(record.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude === 0 || longitude === 0) {
    return null;
  }

  return { latitude, longitude };
}

function distanceInKm(from: Coordinates, to: Coordinates) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const startLatitude = radians(from.latitude);
  const endLatitude = radians(to.latitude);
  const arc =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * 6371 * Math.asin(Math.sqrt(arc));
}

async function getDistrictCoordinates(state: string, district: string) {
  const pages = await getLocationPagesCollection();
  const stateFilter = { "location.state": escapedExact(state) };
  const districtFilter = { "location.district": escapedExact(district) };

  const locationPage = await pages.findOne(
    {
      ...stateFilter,
      ...districtFilter,
      "location.coordinates.latitude": { $type: "number", $ne: 0 },
      "location.coordinates.longitude": { $type: "number", $ne: 0 },
    },
    { projection: { "location.coordinates": 1 } },
  );
  const pageCoordinates = coordinatesFrom(
    (locationPage as { location?: { coordinates?: unknown } } | null)?.location?.coordinates,
  );
  if (pageCoordinates) return pageCoordinates;

  const districts = await getDistrictOverviewCollection();
  const overview = await districts.findOne(
    {
      state_name: escapedExact(state),
      district_name: escapedExact(district),
    },
    { projection: { "location.coordinates": 1 } },
  );

  return coordinatesFrom(
    (overview as { location?: { coordinates?: unknown } } | null)?.location?.coordinates,
  );
}

async function nearbyDistricts(state: string, district: string) {
  const pages = await getLocationPagesCollection();
  const stateFilter = { "location.state": escapedExact(state) };
  const districtKey = district.toLowerCase();
  const [currentCoordinates, allDistricts] = await Promise.all([
    getDistrictCoordinates(state, district),
    pages.distinct("location.district", { ...stateFilter, is_active: { $ne: false } }),
  ]);
  const districtNames = uniqueNames(allDistricts).filter((name) => name.toLowerCase() !== districtKey);

  if (!currentCoordinates) {
    return shuffled(districtNames, `${state}:${district}:nearby-fallback`).slice(0, NEARBY_DISTRICT_LIMIT);
  }

  const centroids = await pages
    .aggregate<{ _id?: string; latitude?: number; longitude?: number }>([
      {
        $match: {
          ...stateFilter,
          is_active: { $ne: false },
          "location.district": { $type: "string" },
          "location.coordinates.latitude": { $type: "number", $ne: 0 },
          "location.coordinates.longitude": { $type: "number", $ne: 0 },
        },
      },
      {
        $group: {
          _id: "$location.district",
          latitude: { $first: "$location.coordinates.latitude" },
          longitude: { $first: "$location.coordinates.longitude" },
        },
      },
    ])
    .toArray();

  const distances = new Map<string, number>();
  for (const centroid of centroids) {
    const name = typeof centroid._id === "string" ? centroid._id.trim() : "";
    const coordinates = coordinatesFrom(centroid);
    if (!name || name.toLowerCase() === districtKey || !coordinates) continue;

    distances.set(name.toLowerCase(), distanceInKm(currentCoordinates, coordinates));
  }

  return [...districtNames]
    .sort((first, second) => {
      const firstDistance = distances.get(first.toLowerCase()) ?? Number.POSITIVE_INFINITY;
      const secondDistance = distances.get(second.toLowerCase()) ?? Number.POSITIVE_INFINITY;
      return firstDistance - secondDistance || first.localeCompare(second);
    })
    .slice(0, NEARBY_DISTRICT_LIMIT);
}

/**
 * Every city we publish a page for, A-Z.
 *
 * Read once and held, because it is a `distinct` over the whole collection
 * answering a list that changes when pages are seeded, not when someone opens
 * a menu.
 */
let allCities: { names: string[]; expires: number } | null = null;

const ALL_CITIES_TTL_MS = 60 * 60 * 1000;

async function everyCity() {
  if (allCities && allCities.expires > Date.now()) return allCities.names;

  const pages = await getLocationPagesCollection();
  const names = uniqueNames(await pages.distinct("location.city", { is_active: { $ne: false } })).sort(
    (first, second) => first.localeCompare(second),
  );

  allCities = { names, expires: Date.now() + ALL_CITIES_TTL_MS };
  return names;
}

/**
 * Shared search/hero locations. State requests mix cities and districts;
 * district requests start with the district's cities, then nearby districts.
 *
 * With no state at all the answer is the plain alphabetical list of every city,
 * which is what the header's picker shows beside the states. That one is sorted
 * rather than shuffled: a list this long is read by looking for a name, not by
 * browsing whatever happens to be on top.
 */
export async function GET(req: NextRequest) {
  const requestedState = req.nextUrl.searchParams.get("state")?.trim();
  const requestedDistrict = req.nextUrl.searchParams.get("district")?.trim();

  if (!requestedState) {
    try {
      const cities = await everyCity();
      return NextResponse.json({ state: null, district: null, cities, locations: cities });
    } catch {
      return NextResponse.json({ state: null, district: null, cities: [], locations: [] }, { status: 503 });
    }
  }

  const state = canonicalStateName(requestedState) ?? requestedState;
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  try {
    const pages = await getLocationPagesCollection();
    const stateFilter = {
      "location.state": escapedExact(state),
      is_active: { $ne: false },
    };
    let locations: string[];
    let cities: string[];

    if (requestedDistrict) {
      const [ownCities, nearby] = await Promise.all([
        pages.distinct("location.city", {
          ...stateFilter,
          "location.district": escapedExact(requestedDistrict),
        }),
        nearbyDistricts(state, requestedDistrict),
      ]);
      cities = uniqueNames(ownCities).sort((first, second) => first.localeCompare(second));

      locations = uniqueNames([
        ...shuffled(cities, `${state}:${requestedDistrict}:${day}:cities`),
        ...nearby,
      ]);
    } else {
      const [stateCities, districts] = await Promise.all([
        pages.distinct("location.city", stateFilter),
        pages.distinct("location.district", stateFilter),
      ]);
      cities = uniqueNames(stateCities).sort((first, second) => first.localeCompare(second));
      locations = mixCityAndDistrictNames(cities, districts, `${state}:${day}`);
    }

    return NextResponse.json({
      state,
      district: requestedDistrict || null,
      // The profile picker still receives city-only values; the hero and
      // trending treatment share the mixed `locations` sequence above.
      cities,
      locations,
    });
  } catch {
    return NextResponse.json({ state, district: requestedDistrict || null, cities: [], locations: [] });
  }
}
