import type { Metadata } from "next";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { ExpandableDescription } from "@/components/site/expandable-description";
import { GoogleMapEmbed } from "@/components/map/google-map-embed";
import { PropertyFilters } from "@/components/property/property-filters";
import { PropertyList } from "@/components/property/property-list";
import { PropertySearchBar } from "@/components/property/property-search-bar";
import { SortBy } from "@/components/property/property-results-header";
import { Badge } from "@/components/ui/badge";
import { stateExploreHref } from "@/lib/state-routes";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type FaqItem = {
  "@type"?: string;
  name?: string;
  acceptedAnswer?: {
    "@type"?: string;
    text?: string;
  };
};

type FaqSchema = {
  "@context"?: string;
  "@type"?: string;
  mainEntity?: FaqItem[];
};

export type LocationPageData = {
  location?: {
    state?: string;
    coordinates?: {
      latitude?: number | null;
      longitude?: number | null;
    } | null;
  };
  location_name: string;
  property_type?: string;
  listing_type?: string;
  seo: {
    meta_title?: string;
    meta_description?: string;
    on_page_title?: string;
    on_page_description?: string;
    keywords?: string[];
    faq_schema?: FaqSchema;
  };
};

function asParagraphs(value?: string) {
  return (value || "").split(/\n{2,}/).filter(Boolean);
}

export async function getLocationPage(slug: string) {
  try {
    const res = await fetch(`${API}/location-pages/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<LocationPageData>;
  } catch {
    return null;
  }
}

export function locationPageMetadata(page: LocationPageData): Metadata {
  return {
    title: page.seo.meta_title,
    description: page.seo.meta_description || page.seo.on_page_title,
    keywords: page.seo.keywords,
  };
}

export function LocationPageView({ page }: { page: LocationPageData }) {
  const stateName = page.location?.state || page.location_name;
  const faqItems = page.seo.faq_schema?.mainEntity?.filter(
    (item) => item?.name && item?.acceptedAnswer?.text,
  ) || [];
  const descriptionParagraphs = asParagraphs(page.seo.on_page_description);
  const keywords = page.seo.keywords || [];
  const latitude = page.location?.coordinates?.latitude;
  const longitude = page.location?.coordinates?.longitude;
  const hasCoordinates = typeof latitude === "number" && typeof longitude === "number";
  // The last crumb is the page itself ("Plots for Sale in Maharashtra"), not its location.
  const currentCrumb = page.seo.on_page_title || page.location_name;
  const showLocationCrumb =
    page.location_name.trim().toLowerCase() !== stateName.trim().toLowerCase();

  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      <Header
        showSearchBar
        searchPlaceholder={`Search properties in ${page.location_name}`}
      />

      <div className="mx-auto w-full max-w-[1250px] px-4 pt-4">
        <PropertySearchBar locationName={`${page.location_name}, ${stateName}`} />
      </div>

      <main className="mx-auto grid w-full max-w-[1250px] gap-5 px-4 py-5 lg:grid-cols-[280px_1fr] lg:items-start">
        <div className="lg:sticky lg:top-4">
          <PropertyFilters />
        </div>

        <div className="min-w-0">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-1 overflow-x-auto whitespace-nowrap pb-3 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="flex items-center gap-1 hover:text-foreground">
                  <Home className="h-3.5 w-3.5" /> Home
                </Link>
              </li>
              <li className="flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5" />
                <Link href={stateExploreHref(stateName)} className="hover:text-foreground">
                  {stateName}
                </Link>
              </li>
              {/* City/district pages sit under the state; state pages would just repeat it. */}
              {showLocationCrumb && (
                <li className="flex items-center gap-1">
                  <ChevronRight className="h-3.5 w-3.5" />
                  {page.location_name}
                </li>
              )}
              <li className="flex items-center gap-1 font-medium text-foreground" aria-current="page">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                {currentCrumb}
              </li>
            </ol>
          </nav>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4">
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight md:text-xl">
                {page.seo.on_page_title}
              </h1>
              <p className="mt-0.5 text-[13px] text-muted-foreground">12,345+ properties available</p>
            </div>

            <SortBy />
          </div>

          <div className="mt-4">
            <PropertyList cityName={page.location_name} />
          </div>

          {descriptionParagraphs.length > 0 && (
            <section className="mt-4 rounded-2xl border border-border bg-background p-5">
              <h2 className="text-lg font-bold">About {page.location_name}</h2>
              <ExpandableDescription paragraphs={descriptionParagraphs} />
            </section>
          )}

          {hasCoordinates && (
            <section className="mt-4 rounded-2xl border border-border bg-background p-5">
              <h2 className="text-lg font-bold">Location</h2>
              <div className="mt-3 overflow-hidden rounded-xl">
                <GoogleMapEmbed
                  latitude={latitude}
                  longitude={longitude}
                  title={`${page.location_name} map`}
                />
              </div>
            </section>
          )}
        </div>
      </main>

      <section className="bg-secondary px-4 py-4 md:py-5">
        <div className="mx-auto max-w-[1250px] rounded-[28px] border border-border bg-background px-5 py-5">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="mr-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
              Page tags
            </span>
            {page.property_type && (
              <Badge variant="outline" className="capitalize">{page.property_type.replace(/_/g, " ")}</Badge>
            )}
            {page.listing_type && (
              <Badge variant="outline" className="capitalize">{page.listing_type}</Badge>
            )}
            <Badge variant="outline">{stateName}</Badge>
          </div>
        </div>
      </section>

      {faqItems.length > 0 && (
        <section className="bg-secondary px-4 py-4 md:py-5">
          <div className="mx-auto max-w-[1250px] rounded-[28px] border border-border bg-background px-5 py-5">
            <h2 className="mb-5 text-3xl font-bold leading-tight md:text-4xl">
              Frequently Asked Questions
            </h2>
            <div className="divide-y divide-border rounded-2xl border border-border bg-card/70 px-4 md:px-5">
              {faqItems.map((item) => (
                <details key={item.name} className="group py-3">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-left">
                    <span className="text-sm font-medium text-foreground">{item.name}</span>
                    <span className="mt-0.5 shrink-0 text-primary transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.acceptedAnswer?.text}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {keywords.length > 0 && (
        <section className="bg-secondary px-4 py-4 md:py-5">
          <div className="mx-auto max-w-[1250px] rounded-[28px] border border-border bg-background px-5 py-5">
            <h2 className="mb-3 text-sm font-semibold">Popular searches</h2>
            <div className="flex flex-wrap gap-2">
              {keywords.map((k) => (
                <Badge key={k} variant="secondary" className="cursor-pointer hover:bg-accent">{k}</Badge>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
