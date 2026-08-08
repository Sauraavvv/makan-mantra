const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Shown when the browser has not told us where the visitor is. */
export const DEFAULT_SNAPSHOT_SLUG = "delhi";

export type PriceBand = {
  min_price_inr?: number | null;
  max_price_inr?: number | null;
  example_localities?: string[];
};

export type MarketSnapshot = {
  slug: string;
  state_name: string;
  /** The leading market the figures describe, e.g. "Gurugram (Haryana)". */
  city: string;
  market_status_as_of?: string | null;
  price_trend_growth_quarterly: {
    q1_previous_year?: string | null;
    q2_previous_year?: string | null;
    q3_previous_year?: string | null;
    q4_previous_year?: string | null;
    q1_current_year?: string | null;
    q2_current_year?: string | null;
    note?: string | null;
  };
  asking_price_per_sq_ft: {
    affordable_pockets?: PriceBand | null;
    mid_segment_locales?: PriceBand | null;
    premium_locales?: PriceBand | null;
    independent_builder_floors_or_villas?: {
      min_price_crore_inr?: number | null;
      max_price_crore_inr?: number | null;
      note?: string | null;
    } | null;
    city_wide_metrics?: {
      average_per_sq_meter_inr?: number | null;
      average_per_sq_ft_inr?: number | null;
    } | null;
  };
  monthly_average_rent_by_bhk: Array<{
    segment: string;
    example_localities?: string[];
    bhk_configurations?: Array<{
      bhk_type: string;
      min_rent_inr?: number | null;
      max_rent_inr?: number | null;
    }>;
  }>;
  top_developers: Array<{
    developer_name: string;
    total_experience_years?: number | null;
    total_projects?: number | null;
    range_of_projects_offered?: string | null;
  }>;
  top_projects: Array<{
    project_name: string;
    location?: string | null;
    min_price_crore_inr?: number | null;
    max_price_crore_inr?: number | null;
  }>;
};

/** "Uttar Pradesh" → "uttar-pradesh", matching the explore page slugs. */
export function toSnapshotSlug(state: string) {
  return state
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The snapshot for a state, or null when we have no data for it. */
export async function fetchMarketSnapshot(slug: string): Promise<MarketSnapshot | null> {
  try {
    const res = await fetch(`${API}/market-snapshot/${slug}`, {
      // The figures move once a quarter, so a day of caching is generous.
      next: { revalidate: 86400 },
    });

    if (!res.ok) return null;
    return (await res.json()) as MarketSnapshot;
  } catch {
    return null;
  }
}
