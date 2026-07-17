import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  ChevronRight,
  GraduationCap,
  Home,
  Landmark,
  MapPin,
  ShoppingBag,
  Stethoscope,
  Trees,
  TrendingUp,
} from "lucide-react";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { DistrictCarousel } from "@/components/site/district-carousel";
import { LineClampedDescription } from "@/components/site/line-clamped-description";
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

function asText(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not available";
  return String(value);
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value.filter(Boolean).map(String) : [];
}

function takeItems(value: unknown, limit = 5) {
  return asArray(value).slice(0, limit);
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

  const { overview, lifestyle_environment, social_infrastructure } = data;
  const investment_angle = data.investment_angle || {};
  const realEstateOverview = data.real_estate_overview || {};
  const economyEmployment = data.economy_employment || {};
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
  const languages = asArray(overview.official_languages);
  const overviewSectionTitle = compactText(
    data.seo?.page_title,
    isDistrictPage ? "District Overview" : "State Overview",
  );
  const overviewSectionDescription = compactText(data.seo?.page_description);
  const capitalOrHeadquarters = compactText(overview.headquarters, overview.capital);
  const investmentPosition = compactText(investment_angle.market_position, realEstateOverview.real_estate_identity, overview.real_estate_identity);
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

      <header className="border-b border-border bg-[#0A2036] text-white">
        <nav className="relative z-10 border-b border-white/10 bg-black/30">
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

        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:py-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
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

      <div className="sticky top-16 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4 py-3">
          {[
            ["Overview", "#overview"],
            ...(districts.length > 0 ? [["Districts", "#districts"]] : []),
            ["Cities & Towns", "#connectivity"],
            ["Market", "#investment"],
            ["Environment", "#lifestyle"],
            ["Living", "#social"],
          ].map(([label, href]) => (
            <a key={href} href={href} className="shrink-0 text-sm font-medium text-foreground/80 transition-colors hover:text-primary">
              {label}
            </a>
          ))}
        </div>
      </div>

      <section id="overview" className="bg-secondary px-4 py-4 md:py-5">
        <div className="mx-auto max-w-7xl px-5 py-5">
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
          <div className="mx-auto max-w-7xl rounded-[28px] border border-border bg-background px-5 py-5 shadow-sm">
            <DistrictCarousel districts={districts} stateName={parentStateName} />
          </div>
        </section>
      )}

      <section id="connectivity" className="bg-secondary px-4 py-4 md:py-5">
        <div className="mx-auto max-w-7xl rounded-[28px] border border-border bg-background px-5 py-5 shadow-sm">
          <h2 className="mb-5 text-3xl font-bold leading-tight md:text-4xl">
            Explore the top cities & towns
          </h2>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-stretch">
            <div className={`grid grid-cols-1 items-start gap-3 sm:grid-cols-2 ${mapCoordinates ? "lg:col-span-7" : "lg:col-span-12"}`}>
              {majorCities.length > 0 && (
                <LocationListCard title="Major Cities" items={majorCities} />
              )}
              {majorTowns.length > 0 && (
                <LocationListCard title="Major Towns" items={majorTowns} />
              )}
            </div>
            {mapCoordinates && (
              <div className="h-[300px] overflow-hidden rounded-2xl border-[3px] border-saffron/70 shadow-sm lg:col-span-5">
                <GoogleMapEmbed
                  latitude={mapCoordinates.latitude}
                  longitude={mapCoordinates.longitude}
                  zoom={6}
                  height={294}
                  title={`${parentStateName} map`}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="investment" className="bg-secondary px-4 py-4 md:py-5">
        <div className="mx-auto max-w-7xl rounded-[28px] border border-border bg-background px-5 py-5 shadow-sm">
          <div className="mb-4 rounded-2xl border border-border bg-card/70 p-4 shadow-sm md:p-5">
            <h2 className="mb-3 text-3xl font-bold leading-tight md:text-4xl">
              Real Estate Dynamics
            </h2>
            <p className="max-w-[66ch] leading-relaxed text-muted-foreground">
              {investmentPosition}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <MarketCard
              icon={TrendingUp}
              tag="Growth Drivers"
              title="Structural Momentum"
              items={takeItems(investment_angle.key_growth_drivers || economyEmployment.primary_industries, 5)}
            />
            <MarketCard
              icon={Building2}
              tag="Premium Segments"
              title="Where Value Concentrates"
              items={takeItems(investment_angle.premium_segments || realEstateOverview.premium_zones, 5)}
            />
            <MarketCard
              icon={ArrowUpRight}
              tag="Investment Risks"
              title="What to Underwrite"
              items={takeItems(investment_angle.investment_risks || realEstateOverview.emerging_areas, 5)}
            />
          </div>

        </div>
      </section>

      <section id="lifestyle" className="bg-secondary px-4 py-4 md:py-5">
        <div className="mx-auto max-w-7xl rounded-[28px] bg-[#0A2036] px-5 py-5 text-white shadow-sm">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/15 p-4 md:p-5">
              <h2 className="mb-4 max-w-[18ch] text-4xl font-bold leading-tight md:text-5xl">
                Lifestyle shaped by place, pace and landscape.
              </h2>
              <p className="max-w-[58ch] text-lg leading-relaxed text-white/75">
                {compactText(lifestyle_environment.overall_lifestyle_feel, lifestyle_environment.climate)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DarkList title="Natural landmarks" icon={Trees} items={takeItems(lifestyle_environment.natural_landmarks || lifestyle_environment.rivers_lakes, 6)} />
              <DarkList title="Forests, hills & coast" icon={MapPin} items={takeItems(lifestyle_environment.forests_hills_coast, 6)} />
              <div className="rounded-2xl border border-white/15 p-4 sm:col-span-2">
                <span className="mb-3 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
                  Traffic & Air Quality
                </span>
                <p className="text-sm leading-relaxed text-white/75">
                  {compactText(lifestyle_environment.traffic_and_congestion, "")} {asText(lifestyle_environment.air_quality)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="social" className="bg-secondary px-4 py-4 md:py-5">
        <div className="mx-auto max-w-7xl rounded-[28px] border border-border bg-background px-5 py-5 shadow-sm">
          <div className="mb-4 rounded-2xl border border-border bg-card/70 p-4 shadow-sm md:p-5">
            <h2 className="mb-3 text-3xl font-bold leading-tight md:text-4xl">
              Social Infrastructure
            </h2>
            <p className="max-w-[64ch] leading-relaxed text-muted-foreground">
              {compactText(social_infrastructure.markets_and_essentials_summary, social_infrastructure.markets_summary)}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <SocialPlate icon={GraduationCap} label="Education" items={takeItems(social_infrastructure.major_educational_institutions, 7)} />
            <SocialPlate icon={Stethoscope} label="Healthcare" items={takeItems(social_infrastructure.major_hospitals, 7)} />
            <SocialPlate icon={ShoppingBag} label="Markets" items={takeItems(social_infrastructure.major_markets, 7)} />
          </div>
        </div>
      </section>

      {faq.length > 0 && (
        <section className="bg-secondary px-4 py-4 md:py-5">
          <div className="mx-auto max-w-7xl rounded-[28px] border border-border bg-background px-5 py-5 shadow-sm">
            <div className="mb-4 rounded-2xl border border-border bg-card/70 p-4 shadow-sm md:p-5">
              <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
            </div>
            <div className="divide-y divide-border rounded-2xl border border-border bg-card/70 px-4 shadow-sm md:px-5">
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
    <figure className="relative min-h-[70px] w-full cursor-pointer overflow-hidden rounded-2xl border border-white/12 bg-white/[0.08] p-4 text-white shadow-sm backdrop-blur-md transition-all duration-200 ease-in-out hover:scale-[1.025] hover:bg-white/[0.12]">
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
  return (
    <div className="h-[300px] rounded-2xl border border-border bg-background p-4 text-foreground shadow-sm md:p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </h3>
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item} className="py-2 text-sm font-medium text-foreground">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MarketCard({ icon: Icon, tag, title, items }: { icon: LucideIcon; tag: string; title: string; items: string[] }) {
  return (
    <div className="group relative flex flex-col rounded-2xl border border-border bg-card/70 p-4 shadow-sm transition-colors hover:border-primary/40 md:p-5">
      <Icon className="mb-4 h-5 w-5 text-primary" strokeWidth={1.5} />
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">{tag}</span>
      <h3 className="mb-4 text-xl font-semibold">{title}</h3>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {uniqueItems(items).map((item) => (
          <li key={item} className="flex items-start gap-2.5">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DarkList({ title, icon: Icon, items }: { title: string; icon: LucideIcon; items: string[] }) {
  return (
    <div className="rounded-2xl border border-white/15 p-4">
      <span className="mb-3 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">{title}</span>
      <ul className="space-y-2 text-sm">
        {uniqueItems(items).map((item) => (
          <li key={item} className="flex items-center gap-2 text-white/85">
            <Icon className="h-3.5 w-3.5 shrink-0 text-white/70" strokeWidth={1.5} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialPlate({ icon: Icon, label, items }: { icon: LucideIcon; label: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <ul className="space-y-2">
        {uniqueItems(items).map((item, index, list) => (
          <li key={item} className={`pb-2 text-sm text-foreground ${index < list.length - 1 ? "border-b border-border" : ""}`}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
