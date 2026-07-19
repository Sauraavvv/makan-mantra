import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  Building2,
  ChevronRight,
  GraduationCap,
  Home,
  Landmark,
  MapPin,
} from "lucide-react";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { DistrictCarousel } from "@/components/site/district-carousel";
import { LineClampedDescription } from "@/components/site/line-clamped-description";
import { PriceTrendChart } from "@/components/site/price-trend-chart";
import { SocialInfrastructureCarousel } from "@/components/site/social-infrastructure-carousel";
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

async function getExploreLocationPages({
  stateName,
  districtName,
}: {
  stateName: string;
  districtName?: string;
}): Promise<StateLocationPage[]> {
  try {
    const params = new URLSearchParams({
      state: stateName,
      location_category: districtName ? "district" : "state",
      limit: "100",
    });

    if (districtName) {
      params.set("district", districtName);
    }

    const res = await fetch(`${API}/location-pages/?${params.toString()}`, {
      cache: "no-store",
    });

    if (!res.ok) return [];
    return res.json() as Promise<StateLocationPage[]>;
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }): Promise<Metadata> {
  const { state } = await params;
  const page = await getExploreOverview(state);

  if (!page) {
    const locationPage = await getLocationPage(state);
    if (!locationPage) return { title: "Overview Not Found" };
    return locationPageMetadata(locationPage);
  }

  const titleName = page.pageType === "district" ? `${page.district_name}, ${page.state_name}` : page.state_name;

  return {
    title: page.seo?.meta_title || page.seo?.page_title || `${titleName} Real Estate Overview | Makan Mantraa`,
    description: page.seo?.meta_description || page.seo?.page_description || `Explore local context, connectivity, infrastructure, and real estate signals for ${titleName}.`,
  };
}

export default async function StatePage({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const data = await getExploreOverview(state);

  if (!data) {
    const locationPage = await getLocationPage(state);
    if (!locationPage) notFound();
    return <LocationPageView page={locationPage} />;
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
  ].filter(([, value]) => hasDisplayValue(value)) as Array<[string, unknown]>;
  const airportCard = airportFields.length > 0
    ? {
        key: "major_airports",
        label: "Major Airports",
        value: uniqueItems(airportFields.flatMap(([, value]) => asArray(value))),
      }
    : null;
  const baseConnectivityCards = Object.entries(connectivity || {})
      .filter(([key]) => !["connectivity_strength", "international_airports", "major_airports", "domestic_airports"].includes(key))
      .filter(([, value]) => hasDisplayValue(value))
      .map(([key, value]) => ({
        key,
        label: labelFromKey(key),
        value,
      }));
  const connectivityCards = airportCard
    ? [
        ...baseConnectivityCards.slice(0, 3),
        airportCard,
        ...baseConnectivityCards.slice(3),
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

      <div className="sticky top-16 border-b border-black bg-black">
        <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4 py-3">
          {[
            ["Overview", "#overview"],
            ...(districts.length > 0 ? [["Districts", "#districts"]] : []),
            ["Cities & Towns", "#cities-towns"],
            ...(connectivityCards.length > 0 ? [["Connectivity", "#connectivity"]] : []),
            ["Living", "#social"],
            ...(priceTrend.length > 1 ? [["Price Trend", "#price-trend"]] : []),
          ].map(([label, href]) => (
            <a key={href} href={href} className="shrink-0 text-sm font-medium text-white/85 transition-colors hover:text-white">
              {label}
            </a>
          ))}
        </div>
      </div>

      <section id="overview" className="bg-secondary px-4 py-4 md:py-5">
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
        <section id="districts" className="bg-secondary px-4 py-4 md:py-5">
          <div className="mx-auto max-w-[1250px] rounded-[28px] border border-border bg-background px-5 py-5">
            <DistrictCarousel districts={districts} stateName={parentStateName} />
          </div>
        </section>
      )}

      <section id="cities-towns" className="bg-secondary px-4 py-4 md:py-5">
        <div className="mx-auto max-w-[1250px] rounded-[28px] border border-border bg-background px-5 py-5">
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
              <div className="h-[300px] overflow-hidden rounded-2xl border-[3px] border-saffron/70 lg:col-span-5 lg:h-full">
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
        <section id="connectivity" className="bg-secondary px-4 py-4 md:py-5">
          <div className="mx-auto max-w-[1250px] rounded-[28px] border border-border bg-background px-5 py-5">
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

      <section id="social" className="bg-secondary px-4 py-4 md:py-5">
        <div className="mx-auto max-w-[1250px] rounded-[28px] border border-border bg-background px-5 py-5">
          <SocialInfrastructureCarousel cards={socialCards} displayName={displayName} />
        </div>
      </section>

      {priceTrend.length > 1 && (
        <section id="price-trend" className="bg-secondary px-4 py-4 md:py-5">
          <div className="mx-auto max-w-[1250px] rounded-[28px] border border-border bg-background px-5 py-5">
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

      {faq.length > 0 && (
        <section className="bg-secondary px-4 py-4 md:py-5">
          <div className="mx-auto max-w-[1250px] rounded-[28px] border border-border bg-background px-5 py-5">
            <div className="mb-4 rounded-2xl border border-border bg-card/70 p-4 md:p-5">
              <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
            </div>
            <div className="divide-y divide-border rounded-2xl border border-border bg-card/70 px-4 md:px-5">
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
    <figure className="relative min-h-[70px] w-full cursor-pointer overflow-hidden rounded-2xl border border-white/12 bg-white/[0.08] p-4 text-white backdrop-blur-md transition-all duration-200 ease-in-out hover:scale-[1.025] hover:bg-white/[0.12]">
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
    <div className="h-full overflow-hidden rounded-3xl border border-sky-200 bg-white text-foreground">
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
    <div className="flex min-h-[360px] flex-col overflow-hidden rounded-3xl border border-orange-200 bg-white text-foreground lg:min-h-full">
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
