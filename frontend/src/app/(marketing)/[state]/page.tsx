import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  GraduationCap,
  Home,
  Landmark,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { DistrictCarousel } from "@/components/site/district-carousel";
import { LineClampedDescription } from "@/components/site/line-clamped-description";
import { PriceTrendChart } from "@/components/site/price-trend-chart";
import { SocialInfrastructureCarousel } from "@/components/site/social-infrastructure-carousel";
import { TopBuildersCarousel } from "@/components/site/top-builders-carousel";
import { QuickLinks, type QuickLinkGroup } from "@/components/site/quick-links";
import { getBuilderProfile } from "@/lib/constants/builders";
import { getLocationPage, LocationPageView, locationPageMetadata } from "@/components/site/location-page";
import { HeroSearch } from "@/components/site/hero-search";
import { GoogleMapEmbed } from "@/components/map/google-map-embed";
import { AnimatedList } from "@/registry/magicui/animated-list";
import { stateExploreHref } from "@/lib/state-routes";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type StateOverview = {
  pageType?: "state" | "district";
  slug: string;
  route_slug?: string;
  route_path?: string;
  state_name: string;
  district_name?: string;
  state_type?: string;
  country: string;
  location?: {
    coordinates?: {
      latitude?: number;
      longitude?: number;
    } | null;
  };
  seo?: {
    meta_title?: string;
    meta_description?: string;
    page_title?: string;
    page_description?: string;
  };
  overview: Record<string, unknown>;
  connectivity: Record<string, unknown>;
  social_infrastructure: Record<string, unknown>;
  lifestyle_environment: Record<string, unknown>;
  investment_angle?: Record<string, unknown>;
  real_estate_overview?: Record<string, unknown>;
  economy_employment?: Record<string, unknown>;
  faq?: Array<{ question?: string; answer?: string }>;
};

type StateLocationPage = {
  slug: string;
  property_type?: string;
  listing_type?: string;
  seo?: {
    on_page_title?: string;
  };
};

type StateDistrictPage = {
  district_name: string;
  state_name: string;
  slug: string;
};

type PriceTrendPoint = {
  year: number;
  averagePricePerSqft: number;
};

type BuilderDisplayItem = {
  title: string;
  details: Array<[string, string]>;
};

function asText(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not available";
  return String(value);
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value.filter(Boolean).map(String) : [];
}

function uniqueItems(value: unknown, limit?: number) {
  const seen = new Set<string>();
  const items = asArray(value).filter((item) => {
    const key = item.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return typeof limit === "number" ? items.slice(0, limit) : items;
}

function compactText(...values: unknown[]) {
  const value = values.find((item) => item !== null && item !== undefined && item !== "");
  return value ? String(value) : "Not available";
}

function hasDisplayValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasDisplayValue);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).some(hasDisplayValue);
  return true;
}

function labelFromKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function asReadableValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.filter(hasDisplayValue).map(asReadableValue).join(" · ");
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => hasDisplayValue(item))
      .map(([key, item]) => `${labelFromKey(key)}: ${asReadableValue(item)}`)
      .join(" · ");
  }

  return String(value);
}

function asBuilderItems(value: unknown, limit = 12): BuilderDisplayItem[] {
  const titleKeys = new Set(["name", "builder_name", "developer_name", "company", "title"]);

  const fromRecord = (record: Record<string, unknown>, fallbackTitle?: string): BuilderDisplayItem | null => {
    const titleValue = record.name || record.builder_name || record.developer_name || record.company || record.title || fallbackTitle;
    if (!hasDisplayValue(titleValue)) return null;

    return {
      title: String(titleValue),
      details: Object.entries(record)
        .filter(([key, item]) => !titleKeys.has(key) && hasDisplayValue(item))
        .map(([key, item]) => [labelFromKey(key), asReadableValue(item)]),
    };
  };

  const items = Array.isArray(value)
    ? value
        .filter(hasDisplayValue)
        .map((item) => (
          item && typeof item === "object"
            ? fromRecord(item as Record<string, unknown>)
            : { title: String(item), details: [] }
        ))
    : value && typeof value === "object"
      ? Object.entries(value as Record<string, unknown>)
          .filter(([, item]) => hasDisplayValue(item))
          .map(([key, item]) => (
            item && typeof item === "object"
              ? fromRecord(item as Record<string, unknown>, labelFromKey(key))
              : { title: labelFromKey(key), details: [[labelFromKey(key), String(item)]] }
          ))
      : hasDisplayValue(value)
        ? [{ title: String(value), details: [] }]
        : [];

  const seen = new Set<string>();
  return items
    .filter((item): item is BuilderDisplayItem => Boolean(item))
    .filter((item) => {
      const key = item.title.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function asPriceTrend(value: unknown): PriceTrendPoint[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const year = Number(record.year);
      const averagePricePerSqft = Number(record.average_price_per_sqft);

      if (!Number.isFinite(year) || !Number.isFinite(averagePricePerSqft)) return null;
      return { year, averagePricePerSqft };
    })
    .filter((item): item is PriceTrendPoint => Boolean(item))
    .sort((a, b) => a.year - b.year);
}

async function getStateOverview(routeSlug: string): Promise<StateOverview | null> {
  try {
    const res = await fetch(`${API}/state-overview/${routeSlug}`, {
      cache: "no-store",
    });

    if (!res.ok) return null;
    const data = await res.json();
    return { ...data, pageType: "state" };
  } catch {
    return null;
  }
}

async function getDistrictOverview(routeSlug: string): Promise<StateOverview | null> {
  try {
    const res = await fetch(`${API}/district-overview/${routeSlug}`, {
      cache: "no-store",
    });

    if (!res.ok) return null;
    const data = await res.json();
    return { ...data, pageType: "district" };
  } catch {
    return null;
  }
}

async function getExploreOverview(routeSlug: string) {
  return (await getStateOverview(routeSlug)) || getDistrictOverview(routeSlug);
}

async function getStateDistrictPages(stateName: string): Promise<StateDistrictPage[]> {
  try {
    const res = await fetch(`${API}/district-overview/?state=${encodeURIComponent(stateName)}&limit=100`, {
      cache: "no-store",
    });

    if (!res.ok) return [];
    return res.json() as Promise<StateDistrictPage[]>;
  } catch {
    return [];
  }
}

async function getQuickLinks(stateName: string): Promise<QuickLinkGroup[]> {
  try {
    const res = await fetch(`${API}/location-pages/quick-links/${encodeURIComponent(stateName)}`, {
      // The set rotates once a day, so an hour of caching is plenty.
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];
    const data = (await res.json()) as { groups?: QuickLinkGroup[] };
    return data.groups ?? [];
  } catch {
    return [];
  }
}

/** District pages lead with their own city pages, then the nearest districts. */
async function getDistrictQuickLinks(
  stateName: string,
  districtName: string,
): Promise<QuickLinkGroup[]> {
  if (!districtName) return [];

  try {
    const res = await fetch(
      `${API}/location-pages/quick-links-district/${encodeURIComponent(stateName)}/${encodeURIComponent(districtName)}`,
      { next: { revalidate: 3600 } },
    );

    if (!res.ok) return [];
    const data = (await res.json()) as { groups?: QuickLinkGroup[] };
    return data.groups ?? [];
  } catch {
    return [];
  }
}

async function fetchLocationPages(params: URLSearchParams): Promise<StateLocationPage[]> {
  try {
    const res = await fetch(`${API}/location-pages/?${params.toString()}`, {
      cache: "no-store",
    });

    if (!res.ok) return [];
    return res.json() as Promise<StateLocationPage[]>;
  } catch {
    return [];
  }
}

async function getExploreLocationPages({
  stateName,
  districtName,
}: {
  stateName: string;
  districtName?: string;
}): Promise<StateLocationPage[]> {
  const params = new URLSearchParams({
    state: stateName,
    location_category: districtName ? "district" : "state",
    limit: "100",
  });

  if (districtName) {
    params.set("district", districtName);
  }

  const pages = await fetchLocationPages(params);
  if (pages.length > 0 || districtName) return pages;

  // Some union territories (e.g. Chandigarh) have no location_category="state"
  // docs of their own, only city-level ones for the same location name.
  // Fall back to those so the explore page still shows popular searches.
  const cityParams = new URLSearchParams({
    state: stateName,
    location_category: "city",
    limit: "100",
  });
  return fetchLocationPages(cityParams);
}

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }): Promise<Metadata> {
  const { state } = await params;

  // First try as location page (city pages like shops-for-sale-in-mumbai)
  const locationPage = await getLocationPage(state);
  if (locationPage) {
    return locationPageMetadata(locationPage);
  }

  // Then try as state/district page
  const page = await getExploreOverview(state);
  if (!page) {
    return { title: "Overview Not Found" };
  }

  const titleName = page.pageType === "district" ? `${page.district_name}, ${page.state_name}` : page.state_name;

  return {
    title: page.seo?.meta_title || page.seo?.page_title || `${titleName} Real Estate Overview | Makan Mantraa`,
    description: page.seo?.meta_description || page.seo?.page_description || `Explore local context, connectivity, infrastructure, and real estate signals for ${titleName}.`,
  };
}

export default async function StatePage({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;

  // First check if it's a location page (city pages like shops-for-sale-in-mumbai)
  const locationPage = await getLocationPage(state);
  if (locationPage) {
    return <LocationPageView page={locationPage} />;
  }

  // Then check if it's a state/district explore page
  const data = await getExploreOverview(state);

  if (!data) {
    notFound();
  }

  const { overview, connectivity, social_infrastructure } = data;
  const investment_angle = data.investment_angle || {};
  const faq = data.faq || [];
  const isDistrictPage = data.pageType === "district";
  const stateName = data.state_name;
  const parentStateName = stateName;
  const displayName = isDistrictPage ? asText(data.district_name) : stateName;
  const locationPages = await getExploreLocationPages({
    stateName: parentStateName,
    districtName: isDistrictPage ? displayName : undefined,
  });
  const districtPages = isDistrictPage ? [] : await getStateDistrictPages(parentStateName);
  const quickLinkGroups = isDistrictPage
    ? await getDistrictQuickLinks(parentStateName, displayName)
    : await getQuickLinks(parentStateName);
  const footerLocationLinks = locationPages.map((page) => ({
    label: page.seo?.on_page_title || page.slug.replace(/-/g, " "),
    href: `/${page.slug}`,
    propertyType: page.property_type || "",
  }));
  const coordinates = data.location?.coordinates;
  const mapCoordinates =
    typeof coordinates?.latitude === "number" && typeof coordinates?.longitude === "number"
      ? { latitude: coordinates.latitude, longitude: coordinates.longitude }
      : null;
  const districts = districtPages.length > 0
    ? districtPages.map((district) => ({ name: district.district_name, slug: district.slug }))
    : asArray(overview.districts).map((district) => ({ name: district }));
  const majorCities = uniqueItems(overview.major_cities);
  const majorTowns = uniqueItems(overview.major_towns);
  const airportFields = [
    ["international_airports", connectivity?.international_airports],
    ["major_airports", connectivity?.major_airports],
    ["domestic_airports", connectivity?.domestic_airports],
    ["nearest_airports", connectivity?.nearest_airports],
  ].filter(([, value]) => hasDisplayValue(value)) as Array<[string, unknown]>;
  const airportCard = airportFields.length > 0
    ? {
        key: "major_airports",
        label: "Major Airports",
        value: uniqueItems(airportFields.flatMap(([, value]) => asArray(value))),
      }
    : null;
  const baseConnectivityCards = Object.entries(connectivity || {})
      .filter(([key]) => !["connectivity_strength", "international_airports", "major_airports", "domestic_airports", "nearest_airports"].includes(key))
      .filter(([, value]) => hasDisplayValue(value))
      .map(([key, value]) => ({
        key,
        label: labelFromKey(key),
        value,
      }));
  const connectivityCards = airportCard
    ? [
        ...baseConnectivityCards,
        airportCard,
      ]
    : baseConnectivityCards;
  const languages = asArray(overview.official_languages);
  const overviewSectionTitle = compactText(
    data.seo?.page_title,
    isDistrictPage ? "District Overview" : "State Overview",
  );
  const overviewSectionDescription = compactText(data.seo?.page_description);
  const capitalOrHeadquarters = compactText(overview.headquarters, overview.capital);
  const priceTrend = asPriceTrend(investment_angle.price_trend);
  const growthDrivers = uniqueItems(investment_angle.key_growth_drivers, 10);
  const investmentRisks = uniqueItems(investment_angle.investment_risks, 10);
  const hasInvestmentComparison = growthDrivers.length > 0 || investmentRisks.length > 0;
  const topBuildersValue = [
    data.real_estate_overview?.top_builders,
    data.real_estate_overview?.major_builders,
    data.real_estate_overview?.leading_builders,
    data.real_estate_overview?.developers,
    investment_angle.top_builders,
    investment_angle.major_builders,
    investment_angle.leading_builders,
    investment_angle.developers,
    overview.top_builders,
    overview.major_builders,
    overview.leading_builders,
  ].find(hasDisplayValue);
  const topBuilders = asBuilderItems(topBuildersValue).map((builder) => ({
    ...builder,
    ...getBuilderProfile(builder.title, parentStateName),
  }));
  const socialCardEntries = Object.entries(social_infrastructure || {})
    .filter(([key]) => key !== "markets_and_essentials_summary")
    .filter(([, value]) => hasDisplayValue(value));
  const hasTouristAttractionsCard = socialCardEntries.some(([key]) => {
    const normalized = key.toLowerCase();
    return normalized.includes("tourist") || normalized.includes("attraction");
  });
  const touristAttractionsValue = [
    social_infrastructure?.tourist_attractions,
    data.lifestyle_environment?.tourist_attractions,
    overview.tourist_attractions,
  ].find(hasDisplayValue);
  const socialCards = [
    ...socialCardEntries,
    ...(!hasTouristAttractionsCard && hasDisplayValue(touristAttractionsValue)
      ? [["tourist_attractions", touristAttractionsValue] as [string, unknown]]
      : []),
  ]
    .map(([key, value]) => ({
      key,
      label: labelFromKey(key),
      value,
    }));
  const heroStats = [
    {
      label: isDistrictPage ? "Headquarters" : "Capital",
      value: capitalOrHeadquarters,
      icon: Landmark,
    },
    {
      label: "Population Density",
      value: `${asText(overview.population_density_per_sq_km)} / sq km`,
      icon: Building2,
    },
    {
      label: "Languages",
      value: languages.length > 0 ? languages.join(", ") : "Not available",
      icon: GraduationCap,
    },
    {
      label: "Area",
      value: asText(overview.area_sq_km),
      icon: MapPin,
    },
  ];

  return (
    <div className="min-h-screen bg-secondary text-foreground selection:bg-primary/15">
      <Header />

      <header className="border-b border-black bg-[#0A2036] text-white">
        <nav>
          <ol className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto whitespace-nowrap px-4 py-3 text-sm text-white/70">
            <li>
              <Link href="/" className="flex items-center gap-1 hover:text-white">
                <Home className="h-3.5 w-3.5" /> India
              </Link>
            </li>
            <ChevronRight className="h-3.5 w-3.5" />
            {isDistrictPage && (
              <>
                <li>
                  <Link href={stateExploreHref(parentStateName)} className="font-medium hover:text-white">
                    {parentStateName}
                  </Link>
                </li>
                <ChevronRight className="h-3.5 w-3.5" />
              </>
            )}
            <li className="font-medium text-white">{displayName}</li>
          </ol>
        </nav>

        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:py-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/75">
              <span className="mr-2 h-2.5 w-2.5 rounded-full bg-saffron shadow-[0_0_12px_rgba(255,122,26,.95)]" />
              Real estate guide
            </div>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
              Explore Your <span className="text-saffron">{displayName}</span>
            </h1>
            <HeroSearch align="left" locationName={displayName} showRecent={false} />
          </div>

          <AnimatedList
            key={displayName}
            className="lg:w-full"
            delay={120}
            focusIndex={1}
            focusScale={1.08}
            visibleItems={3}
          >
            {heroStats.map((item) => (
              <StatPlate
                key={item.label}
                label={item.label}
                value={item.value}
                icon={item.icon}
              />
            ))}
          </AnimatedList>
        </div>
      </header>

      <div className="sticky top-16 z-30 border-b border-black bg-black">
        <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4 py-3">
          {[
            ["Overview", "#overview"],
            ...(districts.length > 0 ? [["Districts", "#districts"]] : []),
            ["Cities & Towns", "#cities-towns"],
            ...(connectivityCards.length > 0 ? [["Connectivity", "#connectivity"]] : []),
            ["Living", "#social"],
            ...(topBuilders.length > 0 ? [["Top Builders", "#top-builders"]] : []),
            ...(priceTrend.length > 1 ? [["Price Trend", "#price-trend"]] : []),
            ...(hasInvestmentComparison ? [["Growth & Risks", "#growth-risks"]] : []),
            ...(quickLinkGroups.length > 0 ? [["Quick Links", "#quick-links"]] : []),
            ...(faq.length > 0 ? [["FAQ", "#faq"]] : []),
          ].map(([label, href]) => (
            <a key={href} href={href} className="shrink-0 text-sm font-medium text-white/85 transition-colors hover:text-white">
              {label}
            </a>
          ))}
        </div>
      </div>

      <section id="overview" className="scroll-mt-32 bg-secondary px-4 py-4 md:py-5">
        <div className="mx-auto max-w-[1250px] px-5 py-5">
          <div>
            <h2 className="text-3xl font-bold leading-tight md:text-4xl">
              {overviewSectionTitle}
            </h2>
            <LineClampedDescription text={overviewSectionDescription} lines={7} className="mt-2" />
          </div>
        </div>
      </section>

      {districts.length > 0 && (
        <section id="districts" className="scroll-mt-32 bg-secondary px-4 py-4 md:py-5">
          <div className="mx-auto max-w-[1250px] rounded-[20px] border border-border bg-background px-5 py-6 shadow-sm sm:px-7 lg:px-10 lg:py-9">
            <DistrictCarousel districts={districts} stateName={parentStateName} />
          </div>
        </section>
      )}

      <section id="cities-towns" className="scroll-mt-32 bg-secondary px-4 py-4 md:py-5">
        <div className="mx-auto max-w-[1250px] rounded-[20px] border border-border bg-background px-5 py-5">
          <h2 className="mb-5 text-3xl font-bold leading-tight md:text-4xl">
            Explore the top cities & towns
          </h2>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-stretch">
            <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${mapCoordinates ? "lg:col-span-7" : "lg:col-span-12"}`}>
              {majorCities.length > 0 && (
                <LocationListCard title="Major Cities" items={majorCities} />
              )}
              {majorTowns.length > 0 && (
                <LocationListCard title="Major Towns" items={majorTowns} />
              )}
            </div>
            {mapCoordinates && (
              <div className="h-[300px] overflow-hidden rounded-xl border-[3px] border-saffron/70 lg:col-span-5 lg:h-full">
                <GoogleMapEmbed
                  latitude={mapCoordinates.latitude}
                  longitude={mapCoordinates.longitude}
                  zoom={6}
                  height="100%"
                  className="h-full"
                  title={`${parentStateName} map`}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {connectivityCards.length > 0 && (
        <section id="connectivity" className="scroll-mt-32 bg-secondary px-4 py-4 md:py-5">
          <div className="mx-auto max-w-[1250px] rounded-[20px] border border-border bg-background px-5 py-5">
            <SocialInfrastructureCarousel
              cards={connectivityCards}
              displayName={displayName}
              title={`Connectivity & Access in ${displayName}`}
              description={`Review key transport links, access corridors, and mobility infrastructure supporting movement across ${displayName}.`}
              variant="connectivity"
            />
          </div>
        </section>
      )}

      <section id="social" className="scroll-mt-32 bg-secondary px-4 py-4 md:py-5">
        <div className="mx-auto max-w-[1250px] rounded-[20px] border border-border bg-background px-5 py-5">
          <SocialInfrastructureCarousel cards={socialCards} displayName={displayName} />
        </div>
      </section>

      {topBuilders.length > 0 && (
        <section id="top-builders" className="scroll-mt-32 bg-secondary px-4 py-4 md:py-5">
          <div className="mx-auto w-full max-w-[1250px] rounded-[20px] border border-border bg-background px-5 py-5">
            <TopBuildersCarousel builders={topBuilders} displayName={displayName} />
          </div>
        </section>
      )}

      {priceTrend.length > 1 && (
        <section id="price-trend" className="scroll-mt-32 bg-secondary px-4 py-4 md:py-5">
          <div className="mx-auto max-w-[1250px] rounded-[20px] border border-border bg-background px-5 py-5">
            <h2 className="mb-5 text-3xl font-bold leading-tight md:text-4xl">
              Price Trends &amp; Premium Segments
            </h2>
            <div className="grid grid-cols-1 gap-3 lg:min-h-[430px] lg:grid-cols-[65fr_35fr]">
              <PriceTrendChart
                points={priceTrend}
                title="Price Trend"
                description={`Average property price per sq.ft across ${displayName}, based on the yearly trend available for this market.`}
              />
              <PremiumSegmentsCard items={uniqueItems(investment_angle.premium_segments, 8)} />
            </div>
          </div>
        </section>
      )}

      {hasInvestmentComparison && (
        <section id="growth-risks" className="scroll-mt-32 bg-secondary px-4 py-4 md:py-5">
          <div className="mx-auto max-w-[1250px] rounded-[20px] border border-border bg-background px-5 py-5">
            <h2 className="mb-2 text-3xl font-bold leading-tight md:text-4xl">
              Growth Drivers vs Investment Risks
            </h2>
            <p className="mb-5 max-w-4xl text-sm leading-relaxed text-muted-foreground">
              Compare the strongest market upside signals with the key watch points buyers should evaluate in {displayName}.
            </p>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <InvestmentComparisonCard
                title="Key Growth Drivers"
                subtitle="Upside signals"
                description="Factors that support demand, infrastructure-led movement, and long-term real estate interest."
                items={growthDrivers}
                icon={TrendingUp}
                tone="growth"
              />
              <InvestmentComparisonCard
                title="Investment Risks"
                subtitle="Watch points"
                description="Risks and constraints that may affect pricing, absorption, timelines, or location-level returns."
                items={investmentRisks}
                icon={AlertTriangle}
                tone="risk"
              />
            </div>
          </div>
        </section>
      )}

      {quickLinkGroups.length > 0 && (
        <section id="quick-links" className="scroll-mt-32 bg-secondary px-4 py-4 md:py-5">
          <div className="mx-auto max-w-[1250px] rounded-[20px] border border-border bg-background px-5 py-6">
            <QuickLinks groups={quickLinkGroups} displayName={displayName} />
          </div>
        </section>
      )}

      {faq.length > 0 && (
        <section id="faq" className="scroll-mt-32 bg-secondary px-4 py-4 md:py-5">
          <div className="mx-auto max-w-[1250px] rounded-[20px] border border-border bg-background px-5 py-5">
            <h2 className="mb-5 text-3xl font-bold leading-tight md:text-4xl">
              Frequently Asked Questions
            </h2>
            <div className="divide-y divide-border rounded-xl border border-border bg-card/70 px-4 md:px-5">
              {faq.map((item) => (
                <details key={item.question} className="group py-3">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-left">
                    <span className="text-sm font-medium text-foreground">{item.question}</span>
                    <span className="mt-0.5 shrink-0 text-primary transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 max-w-5xl text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer
        locationTitle={`Popular searches in ${displayName}`}
        locationLinks={footerLocationLinks}
      />
    </div>
  );
}

function StatPlate({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <figure className="relative min-h-[70px] w-full cursor-pointer overflow-hidden rounded-xl border border-white/12 bg-white/[0.08] p-4 text-white backdrop-blur-md transition-all duration-200 ease-in-out hover:scale-[1.025] hover:bg-white/[0.12]">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] text-white/85">
          <Icon className="h-5 w-5" strokeWidth={1.55} />
        </div>
        <div className="min-w-0">
          <figcaption className="text-sm font-semibold tracking-tight text-white">{label}</figcaption>
          <p className="mt-1 text-sm leading-snug text-white/68">{value}</p>
        </div>
      </div>
    </figure>
  );
}

function LocationListCard({ title, items }: { title: string; items: string[] }) {
  const isTownCard = title.toLowerCase().includes("town");
  const Icon = isTownCard ? MapPin : Building2;
  const subtitle = isTownCard ? "Town network" : "City network";
  const description = isTownCard
    ? "Important towns that shape local access and nearby residential demand."
    : "Primary cities that anchor real estate activity and urban growth.";

  return (
    <div className="h-full overflow-hidden rounded-xl border border-sky-200 bg-white text-foreground">
      <div className="bg-sky-100 p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold leading-tight text-foreground">
              {title}
            </h3>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">
              {subtitle}
            </p>
          </div>
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-sky-200 text-foreground">
            <Icon className="h-5 w-5" strokeWidth={1.65} />
          </div>
        </div>

        <div className="mt-3 rounded-xl border-2 border-sky-300 bg-sky-200/60 px-3 py-2">
          <p className="text-xs font-medium leading-relaxed text-foreground/75">
            {description}
          </p>
        </div>
      </div>

      <div className="p-4">
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item} className="py-2 text-sm font-medium text-foreground">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PremiumSegmentsCard({ items }: { items: string[] }) {
  return (
    <div className="flex min-h-[360px] flex-col overflow-hidden rounded-xl border border-orange-200 bg-white text-foreground lg:min-h-full">
      <div className="h-[150px] bg-orange-50 p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold leading-tight text-foreground">
              Premium Segments
            </h3>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">
              High-value market pockets
            </p>
          </div>
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-orange-100 text-foreground">
            <Building2 className="h-5 w-5" strokeWidth={1.65} />
          </div>
        </div>

        <div className="mt-3 flex min-h-[58px] items-center rounded-xl border-2 border-orange-200 bg-orange-100/70 px-3 py-2.5">
          <p className="text-xs font-medium leading-relaxed text-foreground/75">
            Premium zones and segments that concentrate buyer interest and value.
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 no-scrollbar">
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item} className="py-2 text-sm font-medium text-foreground">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function InvestmentComparisonCard({
  title,
  subtitle,
  description,
  items,
  icon: Icon,
  tone,
}: {
  title: string;
  subtitle: string;
  description: string;
  items: string[];
  icon: LucideIcon;
  tone: "growth" | "risk";
}) {
  const theme = tone === "growth"
    ? {
        border: "border-emerald-200",
        header: "bg-emerald-50",
        tile: "bg-emerald-100",
        infoBorder: "border-emerald-200",
        infoBg: "bg-emerald-100/70",
      }
    : {
        border: "border-rose-200",
        header: "bg-rose-50",
        tile: "bg-rose-100",
        infoBorder: "border-rose-200",
        infoBg: "bg-rose-100/70",
      };

  return (
    <div className={`flex min-h-[360px] flex-col overflow-hidden rounded-xl border ${theme.border} bg-white text-foreground`}>
      <div className={`${theme.header} p-3.5`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold leading-tight text-foreground">
              {title}
            </h3>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">
              {subtitle}
            </p>
          </div>
          <div className={`grid size-12 shrink-0 place-items-center rounded-xl ${theme.tile} text-foreground`}>
            <Icon className="h-5 w-5" strokeWidth={1.65} />
          </div>
        </div>

        <div className={`mt-3 flex min-h-[58px] items-center rounded-xl border-2 ${theme.infoBorder} ${theme.infoBg} px-3 py-2.5`}>
          <p className="text-xs font-medium leading-relaxed text-foreground/75">
            {description}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 no-scrollbar">
        {items.length > 0 ? (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item} className="py-2 text-sm font-medium text-foreground">
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Not available</p>
        )}
      </div>
    </div>
  );
}
