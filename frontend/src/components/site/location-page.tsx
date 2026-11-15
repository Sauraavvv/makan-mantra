import type { Metadata } from "next";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { ExpandableDescription } from "@/components/site/expandable-description";
import { PropertyFilters } from "@/components/property/property-filters";
import { PropertyList } from "@/components/property/property-list";
import {
  buildPropertyStats,
  PropertyStatsBar,
} from "@/components/property/property-stats-bar";
import { stateExploreHref } from "@/lib/state-routes";
import { FaqSection } from "@/components/site/faq-section";

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
  // The last crumb is the page itself ("Plots for Sale in Maharashtra"), not its location.
  const currentCrumb = page.seo.on_page_title || page.location_name;
  const showLocationCrumb =
    page.location_name.trim().toLowerCase() !== stateName.trim().toLowerCase();

  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      {/* No search in the bar on these pages. `showSearch`, the scrolled-in
          version, keys off a `#hero-search` element that only the home page
          has, so leaving both off keeps the header clear the whole way down. */}
      <Header />

      <div className="mx-auto w-full max-w-[1250px] px-4 pt-5">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1 overflow-x-auto whitespace-nowrap pb-5 text-xs text-muted-foreground">
            <li>
              <Link href="/" className="flex items-center gap-1 hover:text-foreground">
                <Home className="h-3 w-3" /> Home
              </Link>
            </li>
            <li className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" />
              <Link href={stateExploreHref(stateName)} className="hover:text-foreground">
                {stateName}
              </Link>
            </li>
            {/* City/district pages sit under the state; state pages would just repeat it. */}
            {showLocationCrumb && (
              <li className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                {page.location_name}
              </li>
            )}
            <li className="flex items-center gap-1 font-medium text-foreground" aria-current="page">
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              {currentCrumb}
            </li>
          </ol>
        </nav>

        <h1 className="text-xl font-bold tracking-tight md:text-2xl">
          {page.seo.on_page_title}
        </h1>

        {/* Directly under the title and across the whole page, not beside the
            results: these figures answer what the title asks — what is here
            and what it costs — so they belong with it rather than at the top
            of the list they summarise. */}
        <div className="mt-3">
          <PropertyStatsBar
            stats={buildPropertyStats({
              propertyType: page.property_type,
              listingType: page.listing_type,
            })}
          />
        </div>

        {/* Set below the heading rather than level with it: this is the
            page's explanation, not its title. */}
        {descriptionParagraphs.length > 0 && (
          <div className="text-[13px] leading-relaxed">
            <ExpandableDescription paragraphs={descriptionParagraphs} />
          </div>
        )}
      </div>

      <main className="mx-auto grid w-full max-w-[1250px] gap-5 px-4 py-5 lg:grid-cols-[280px_1fr] lg:items-start">
        <div className="lg:sticky lg:top-4">
          <PropertyFilters
            propertyType={page.property_type}
            listingType={page.listing_type}
            locationName={page.location_name}
          />
        </div>

        {/* No offset of its own: the rail beside it starts at the top of the
            row, and anything here pushing the first card down would set the
            two columns off by that much. */}
        <div className="min-w-0">
          <PropertyList cityName={page.location_name} />
        </div>
      </main>

      <FaqSection
        items={faqItems.map((item) => ({
          question: item.name || "",
          answer: item.acceptedAnswer?.text || "",
        }))}
      />

      <Footer />
    </div>
  );
}
