import {
  getDistrictOverviewCollection,
  getLocationPagesCollection,
  getStateOverviewCollection,
} from "@/lib/auth/db";

/**
 * Same rule the backend routers use to serve a page: anything not explicitly
 * retired (`is_active: false`) is live — older documents have no flag at all.
 */
const LIVE = { is_active: { $ne: false } };

/**
 * One line of the breakdown: `places × perPlace = pages`.
 *
 * `perPlace` is null when places don't all have the same number of pages
 * (some combinations missing somewhere), so the UI never shows a
 * multiplication that doesn't add up.
 */
export type LevelCount = { pages: number; places: number; perPlace: number | null };

export type LivePageCounts = {
  total: number;
  /** `/explore-<state>` and `/explore-<district>` overview pages — one per place. */
  explore: { total: number; state: LevelCount; district: LevelCount };
  /** Property-category pages, e.g. `/flats-for-sale-in-pune`, by location level. */
  category: { total: number; state: LevelCount; district: LevelCount; city: LevelCount };
};

const EMPTY: LevelCount = { pages: 0, places: 0, perPlace: null };

export async function countLivePages(): Promise<LivePageCounts> {
  const [states, districts, locations] = await Promise.all([
    getStateOverviewCollection(),
    getDistrictOverviewCollection(),
    getLocationPagesCollection(),
  ]);

  const [stateExplore, districtExplore, byLevel] = await Promise.all([
    states.countDocuments(LIVE),
    districts.countDocuments(LIVE),
    locations
      .aggregate<{ _id: string | null; places: number; pages: number; min: number; max: number }>([
        { $match: LIVE },
        // One row per place (the full location path, since names like
        // "Aurangabad" repeat across states), with its pages counted.
        {
          $group: {
            _id: {
              level: "$location_category",
              state: "$location.state",
              district: "$location.district",
              city: "$location.city",
              name: "$location_name",
            },
            pages: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: "$_id.level",
            places: { $sum: 1 },
            pages: { $sum: "$pages" },
            min: { $min: "$pages" },
            max: { $max: "$pages" },
          },
        },
      ])
      .toArray(),
  ]);

  const level = (name: string): LevelCount => {
    const row = byLevel.find((item) => item._id === name);
    if (!row) return EMPTY;
    return { pages: row.pages, places: row.places, perPlace: row.min === row.max ? row.max : null };
  };

  // Includes any page whose level is missing or unexpected, so the total
  // always matches what is actually live.
  const categoryTotal = byLevel.reduce((sum, row) => sum + row.pages, 0);
  const onePerPlace = (n: number): LevelCount => ({ pages: n, places: n, perPlace: 1 });

  return {
    total: stateExplore + districtExplore + categoryTotal,
    explore: {
      total: stateExplore + districtExplore,
      state: onePerPlace(stateExplore),
      district: onePerPlace(districtExplore),
    },
    category: {
      total: categoryTotal,
      state: level("state"),
      district: level("district"),
      city: level("city"),
    },
  };
}
