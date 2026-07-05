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
  Plane,
  Route as RouteIcon,
  Ship,
  ShoppingBag,
  Stethoscope,
  Trees,
  TrendingUp,
} from "lucide-react";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { DistrictCarousel } from "@/components/site/district-carousel";
import { StateMap } from "@/components/map/StateMap";
import { stateCardImage } from "@/lib/state-images";
import { canonicalExploreStateName, stateExploreHref, stateSlug } from "@/lib/state-routes";

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

type DistanceRow = {
  city?: string;
  metro?: string;
  state?: string;
  distance_km?: string | number;
  travel_time?: string;
  mode?: string;
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

function asObjectArray(value: unknown): DistanceRow[] {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") as DistanceRow[] : [];
}

function asParagraphs(value: string | undefined) {
  return (value || "").split(/\n{2,}/).filter(Boolean);
}

function takeItems(value: unknown, limit = 5) {
  return asArray(value).slice(0, limit);
}

function joinItems(value: unknown, limit = 4) {
  const items = takeItems(value, limit);
  if (items.length === 0) return "Not available";
  return items.join(" · ");
}

function compactText(...values: unknown[]) {
  const value = values.find((item) => item !== null && item !== undefined && item !== "");
  return value ? String(value) : "Not available";
}

function modeIcon(mode: string) {
  if (/sea|ship|ferry/i.test(mode)) return <Ship className="h-3.5 w-3.5" strokeWidth={1.5} />;
  return <Plane className="h-3.5 w-3.5" strokeWidth={1.5} />;
}

async function getStateOverview(routeSlug: string): Promise<StateOverview | null> {
  try {
    const res = await fetch(`${API}/state-overview/${routeSlug}`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;
    const data = await res.json();
    return { ...data, pageType: "state" };
  } catch {
    return null;
  }
}

async function getDistrictOverview(routeSlug: string): Promise<StateOverview | null> {
  const routeCandidates = Array.from(new Set([
    routeSlug,
    routeSlug.replace(/^explore-/, "").replace(/-dadra-and-nagar-haveli-and-daman-and-diu$/, ""),
    routeSlug.replace(/^explore-/, "").replace(/-dadra-nagar-haveli-dadra-and-nagar-haveli-and-daman-and-diu$/, ""),
    routeSlug.replace("explore-dadra-nagar-haveli-", "explore-dadra-and-nagar-haveli-"),
  ]));

  for (const candidate of routeCandidates) {
    try {
      const res = await fetch(`${API}/district-overview/${candidate}`, {
        next: { revalidate: 3600 },
      });

      if (!res.ok) continue;
      const data = await res.json();
      return { ...data, pageType: "district" };
    } catch {
      continue;
    }
  }

  return null;
}

async function getExploreOverview(routeSlug: string) {
  return (await getStateOverview(routeSlug)) || getDistrictOverview(routeSlug);
}

async function getStateDistrictPages(stateName: string): Promise<StateDistrictPage[]> {
  const pages = await Promise.all(
    locationStateAliases(stateName).map(async (stateAlias) => {
      try {
        const res = await fetch(`${API}/district-overview/?state=${encodeURIComponent(stateAlias)}&limit=100`, {
          next: { revalidate: 3600 },
        });

        if (!res.ok) return [];
        return res.json() as Promise<StateDistrictPage[]>;
      } catch {
        return [];
      }
    }),
  );

  return Array.from(new Map(pages.flat().map((page) => [page.slug, page])).values());
}

function locationStateAliases(stateName: string) {
  const aliases = [stateName];

  if (stateSlug(stateName) === "dadra-and-nagar-haveli-and-daman-and-diu") {
    aliases.push("Dadra and Nagar Haveli", "Daman and Diu");
  }

  return Array.from(new Set(aliases));
}

async function getStateLocationPages(stateName: string): Promise<StateLocationPage[]> {
  const pages = await Promise.all(
    locationStateAliases(stateName).map(async (stateAlias) => {
      try {
        const res = await fetch(`${API}/location-pages/?state=${encodeURIComponent(stateAlias)}&limit=100`, {
          cache: "no-store",
        });

        if (!res.ok) return [];
        return res.json() as Promise<StateLocationPage[]>;
      } catch {
        return [];
      }
    }),
  );

  return Array.from(new Map(pages.flat().map((page) => [page.slug, page])).values());
}

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }): Promise<Metadata> {
  const { state } = await params;
  const page = await getExploreOverview(state);

  if (!page) return { title: "Overview Not Found" };

  const titleName = page.pageType === "district" ? `${page.district_name}, ${page.state_name}` : page.state_name;

  return {
    title: page.seo?.meta_title || page.seo?.page_title || `${titleName} Real Estate Overview | Makan Mantraa`,
    description: page.seo?.meta_description || page.seo?.page_description || `Explore local context, connectivity, infrastructure, and real estate signals for ${titleName}.`,
  };
}

export default async function StatePage({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const data = await getExploreOverview(state);

  if (!data) notFound();

  const { overview, connectivity, lifestyle_environment, social_infrastructure } = data;
  const investment_angle = data.investment_angle || {};
  const realEstateOverview = data.real_estate_overview || {};
  const economyEmployment = data.economy_employment || {};
  const faq = data.faq || [];
  const isDistrictPage = data.pageType === "district";
  const stateName = data.state_name;
  const parentStateName = canonicalExploreStateName(stateName);
  const displayName = isDistrictPage ? asText(data.district_name) : stateName;
  const titleName = isDistrictPage ? `${displayName}, ${parentStateName}` : stateName;
  const locationPages = await getStateLocationPages(parentStateName);
  const districtPages = isDistrictPage ? [] : await getStateDistrictPages(parentStateName);
  const footerLocationLinks = locationPages.map((page) => ({
    label: page.seo?.on_page_title || page.slug.replace(/-/g, " "),
    href: `/${stateSlug(parentStateName)}/${page.slug}`,
    propertyType: page.property_type || "",
  }));
  const heroImage = stateCardImage(parentStateName);
  const coordinates = data.location?.coordinates;
  const mapCoordinates =
    typeof coordinates?.latitude === "number" && typeof coordinates?.longitude === "number"
      ? { latitude: coordinates.latitude, longitude: coordinates.longitude }
      : null;
  const districts = districtPages.length > 0
    ? districtPages.map((district) => ({ name: district.district_name, slug: district.slug }))
    : asArray(overview.districts).map((district) => ({ name: district }));
  const majorCities = asArray(overview.major_cities);
  const languages = asArray(overview.official_languages);
  const stateDistanceRows = [
    ...asObjectArray(connectivity.distance_from_major_metros),
    ...asObjectArray(connectivity.distance_from_other_major_cities),
  ];
  const districtDistanceRows: DistanceRow[] = [
    connectivity.distance_from_state_capital
      ? {
          city: `${parentStateName} capital`,
          distance_km: String(connectivity.distance_from_state_capital),
          mode: "Road",
          travel_time: "",
        }
      : null,
    connectivity.distance_from_nearest_metro
      ? {
          city: asText(connectivity.nearest_metro_city),
          distance_km: String(connectivity.distance_from_nearest_metro),
          mode: "Road / Rail",
          travel_time: "",
        }
      : null,
  ].filter(Boolean) as DistanceRow[];
  const distanceRows = (stateDistanceRows.length > 0 ? stateDistanceRows : districtDistanceRows).slice(0, 6);
  const pageDescription = asParagraphs(data.seo?.page_description);
  const overviewDetail = [
    overview.urbanisation_pattern,
    overview.urbanization_pattern,
    overview.development_context,
    overview.economic_identity,
    pageDescription[1],
  ].find((value) => value);
  const overviewIntro = isDistrictPage
    ? `${displayName} is a district in ${parentStateName}, with local movement, housing demand, and civic infrastructure shaped by its headquarters and major towns.`
    : asText(overview.where_it_is);
  const capitalOrHeadquarters = compactText(overview.headquarters, overview.capital);
  const investmentPosition = compactText(investment_angle.market_position, realEstateOverview.real_estate_identity, overview.real_estate_identity);

  return (
    <div className="min-h-screen bg-secondary text-foreground selection:bg-primary/15">
      <Header />

      <nav className="border-b border-border bg-card/40">
        <ol className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="flex items-center gap-1 hover:text-foreground">
              <Home className="h-3.5 w-3.5" /> India
            </Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5" />
          {isDistrictPage && (
            <>
              <li>
                <Link href={stateExploreHref(parentStateName)} className="font-medium hover:text-foreground">
                  {parentStateName}
                </Link>
              </li>
              <ChevronRight className="h-3.5 w-3.5" />
            </>
          )}
          <li className="font-medium text-foreground">{displayName}</li>
        </ol>
      </nav>

      <header
        className="border-b border-border bg-cover bg-center text-white"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(10, 32, 54, 0.88), rgba(10, 32, 54, 0.62), rgba(10, 32, 54, 0.28)), url('${heroImage}')`,
        }}
      >
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 md:pb-24 md:pt-8">
          <div className="max-w-[68ch]">
            <h1 className="mb-8 max-w-4xl text-4xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl">
              {displayName}
            </h1>
            <p className="mb-12 max-w-[58ch] text-lg leading-relaxed text-white/82 md:text-xl">
              {pageDescription[0] || data.seo?.meta_description || overviewIntro}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/20 bg-white/20 md:grid-cols-4">
            <StatPlate label={isDistrictPage ? "Headquarters" : "Capital"} value={capitalOrHeadquarters} />
            <StatPlate label="Population Density" value={`${asText(overview.population_density_per_sq_km)} / sq km`} />
            <StatPlate label="Languages" value={languages.length > 0 ? languages.join(", ") : "Not available"} />
            <StatPlate label="Area" value={asText(overview.area_sq_km)} />
          </div>
        </div>
      </header>

      <div className="sticky top-16 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4 py-3">
          {[
            ["Overview", "#overview"],
            ...(districts.length > 0 ? [["Districts", "#districts"]] : []),
            ["Logistics", "#connectivity"],
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
        <div className="mx-auto max-w-7xl rounded-[28px] border border-border bg-background px-3 py-7 shadow-sm md:px-5 md:py-8">
          <div className="mb-6 max-w-3xl">
            <h2 className="text-3xl font-bold leading-tight md:text-4xl">
              {isDistrictPage ? "District Overview" : "State Overview"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{overviewIntro}</p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="rounded-2xl border border-border bg-card/60 p-5 md:p-6 lg:col-span-7">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Landmark className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <h3 className="text-xl font-semibold">Urban & Administrative Profile</h3>
              </div>
              <div className="space-y-4 leading-relaxed text-muted-foreground">
                <p>{asText(overview.development_stage)}</p>
                {overviewDetail ? <p>{asText(overviewDetail)}</p> : null}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background p-5 shadow-sm md:p-6 lg:col-span-5">
              <div className="grid gap-5">
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <MapPin className="h-4.5 w-4.5" strokeWidth={1.8} />
                    </span>
                    <h3 className="font-semibold">Major Locations</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(majorCities.length > 0 ? majorCities : asArray(overview.major_towns)).slice(0, 8).map((city) => (
                      <span key={city} className="rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-sm font-medium">
                        {city}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-5">
                  <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Building2 className="h-4.5 w-4.5" strokeWidth={1.8} />
                  </span>
                    <h3 className="font-semibold">Economic Identity</h3>
                  </div>
                  <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                    {takeItems(overview.economic_identity || economyEmployment.primary_industries, 3).map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {districts.length > 0 && (
        <section id="districts" className="bg-secondary px-4 py-4 md:py-5">
          <div className="mx-auto max-w-7xl rounded-[28px] border border-border bg-background px-3 py-8 shadow-sm md:px-5 md:py-10">
            <DistrictCarousel districts={districts} stateName={parentStateName} />
          </div>
        </section>
      )}

      <section id="connectivity" className="bg-secondary px-4 py-4 md:py-5">
        <div className="mx-auto max-w-7xl rounded-[28px] border border-border bg-background px-3 py-6 shadow-sm md:px-5 md:py-7">
          <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-stretch">
            <div className="rounded-2xl border border-border bg-background p-4 text-foreground shadow-sm md:p-5 lg:col-span-7">
              <h2 className="mb-3 text-3xl font-bold leading-tight md:text-4xl">
                Logistics & Access
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                {compactText(
                  connectivity.connectivity_strength,
                  `Nearest airport: ${asText(connectivity.nearest_airport)}. Internal transport: ${asText(connectivity.internal_transport)}.`,
                )}
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl lg:col-span-5">
              <StateMap stateName={parentStateName} coordinates={mapCoordinates} />
            </div>
          </div>

          {distanceRows.length > 0 && (
            <div className="rounded-2xl border border-border bg-background p-4 text-foreground shadow-sm md:p-5">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Regional Distances
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-foreground/15">
                      {["Transit Hub", "Destination", "Distance", "Typical Mode"].map((heading) => (
                        <th key={heading} className="py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {distanceRows.map((row, index) => {
                      const destination = row.metro || row.city || row.state || "Destination";
                      const mode = asText(row.mode);
                      return (
                        <tr key={`${destination}-${row.distance_km}-${index}`}>
                          <td className="py-3 font-medium">{capitalOrHeadquarters}</td>
                          <td className="py-3">{destination}</td>
                          <td className="py-3 tabular-nums">{asText(row.distance_km)}</td>
                          <td className="py-3">
                            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="grid h-6 w-6 place-items-center rounded-full bg-background ring-1 ring-border">
                                {modeIcon(mode)}
                              </span>
                              {mode} · {asText(row.travel_time)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <InfraPlate icon={RouteIcon} title="Highway Spine" body={joinItems(connectivity.major_highways, 8)} />
            <InfraPlate
              icon={Landmark}
              title="Airports / Ports"
              body={isDistrictPage
                ? asText(connectivity.nearest_airport)
                : `${joinItems(connectivity.international_airports, 2)} · ${joinItems(connectivity.ports_if_any, 2)}`}
            />
            <InfraPlate
              icon={MapPin}
              title="Rail & Bus Hubs"
              body={isDistrictPage
                ? `${joinItems(connectivity.railway_stations, 3)} · ${joinItems(connectivity.bus_stands, 3)}`
                : `${joinItems(connectivity.major_railway_junctions, 3)} · ${joinItems(connectivity.major_bus_terminals, 3)}`}
            />
          </div>

        </div>
      </section>

      <section id="investment" className="bg-secondary px-4 py-4 md:py-5">
        <div className="mx-auto max-w-7xl rounded-[28px] border border-border bg-background px-3 py-6 shadow-sm md:px-5 md:py-7">
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
        <div className="mx-auto max-w-7xl rounded-[28px] bg-[#0A2036] px-3 py-6 text-white shadow-sm md:px-5 md:py-7">
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
        <div className="mx-auto max-w-7xl rounded-[28px] border border-border bg-background px-3 py-6 shadow-sm md:px-5 md:py-7">
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
          <div className="mx-auto max-w-7xl rounded-[28px] border border-border bg-background px-3 py-6 shadow-sm md:px-5 md:py-7">
            <div className="mb-4 rounded-2xl border border-border bg-card/70 p-4 shadow-sm md:p-5">
              <h2 className="text-3xl font-bold">FAQs</h2>
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
        locationTitle={`Popular searches in ${parentStateName}`}
        locationLinks={footerLocationLinks}
      />
    </div>
  );
}

function StatPlate({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background p-5 md:p-6">
      <span className="mb-2 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <span className="block text-lg font-semibold leading-tight text-foreground">{value}</span>
    </div>
  );
}

function InfraPlate({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4 text-foreground shadow-sm">
      <div className="mb-3 grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
      </div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em]">{title}</h4>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
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
        {items.map((item) => (
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
        {items.map((item) => (
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
        {items.map((item, index) => (
          <li key={item} className={`pb-2 text-sm text-foreground ${index < items.length - 1 ? "border-b border-border" : ""}`}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
