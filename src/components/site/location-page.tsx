import type { Metadata } from "next";
import { ChevronRight, Home, MapPin } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { ExpandableDescription } from "@/components/site/expandable-description";
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header
        showSearchBar
        searchPlaceholder={`Search properties in ${page.location_name}`}
      />

      <nav className="relative z-10 border-b border-white/10 bg-black/30">
        <ol className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto whitespace-nowrap px-4 py-3 text-sm text-white/70">
          <li>
            <Link href="/" className="flex items-center gap-1 hover:text-white">
              <Home className="h-3.5 w-3.5" /> India
            </Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5" />
          <li>
            <Link href={stateExploreHref(stateName)} className="hover:text-white">{stateName}</Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5" />
          <li className="font-medium text-white">{page.seo.on_page_title}</li>
        </ol>
      </nav>

      <section className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-saffron/5">
        <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            {page.seo.on_page_title}
          </h1>
          <ExpandableDescription paragraphs={descriptionParagraphs} />
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="rounded-xl border border-dashed border-border p-16 text-center text-muted-foreground">
          <MapPin className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="font-medium">Properties coming soon</p>
          <p className="mt-1 text-sm">
            {page.seo.on_page_title} listings will appear here once property data is connected.
          </p>
        </div>
      </main>

      <section className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-7xl px-4 py-5">
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
          <div className="mx-auto max-w-7xl rounded-[28px] border border-border bg-background px-5 py-5 shadow-sm">
            <div className="mb-4 rounded-2xl border border-border bg-card/70 p-4 shadow-sm md:p-5">
              <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
            </div>
            <div className="divide-y divide-border rounded-2xl border border-border bg-card/70 px-4 shadow-sm md:px-5">
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
        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-7xl px-4 py-8">
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
