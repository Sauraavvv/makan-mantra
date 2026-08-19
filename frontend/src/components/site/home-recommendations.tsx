"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { useMemo } from "react";

import { useLocation } from "@/context/location-context";
import { useSearchHistory } from "@/context/search-history-context";
import { generateProperties, type Property } from "@/lib/properties";
import { generateSlug } from "@/lib/utils/slug";

const TYPES_BY_CATEGORY: Record<string, Property["type"][]> = {
  flats: ["Flat"],
  villas: ["Villa"],
  pgs: ["Flat"],
  "plots/land": ["Plot"],
  commercial: ["Office Space", "Shop/Showroom"],
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function scoreProperty(
  property: Property,
  search: ReturnType<typeof useSearchHistory>["items"][number] | undefined,
) {
  if (!search) return property.featured ? 1 : 0;

  let score = 0;
  const categoryTypes = TYPES_BY_CATEGORY[normalize(search.category)] ?? [];
  const wantedListing = normalize(search.tab) === "rent" ? "rent" : "sale";
  const queryTokens = normalize(search.query || search.label)
    .split(/\s+/)
    .filter((token) => token.length > 2);
  const propertyText = normalize(
    `${property.title} ${property.type} ${property.locality} ${property.city} ${property.state}`,
  );

  if (categoryTypes.includes(property.type)) score += 6;
  if (property.listing === wantedListing) score += 4;
  if (queryTokens.some((token) => propertyText.includes(token))) score += 8;
  if (property.featured) score += 1;

  return score;
}

export function HomeRecommendations({ className = "" }: { className?: string }) {
  const { meta } = useLocation();
  const { items: searches, loaded } = useSearchHistory();
  const latestSearch = searches[0];
  const recommendationState = meta.label === "India" ? "Maharashtra" : meta.label;

  const recommendations = useMemo(() => {
    return generateProperties(recommendationState, 18)
      .map((property, index) => ({
        property,
        index,
        score: scoreProperty(property, latestSearch),
      }))
      .sort((left, right) => right.score - left.score || left.index - right.index)
      .slice(0, 3)
      .map(({ property }) => property);
  }, [latestSearch, recommendationState]);

  return (
    <section
      aria-labelledby="home-recommendations-title"
      className={`flex min-h-[21rem] w-full min-w-0 max-w-full flex-col overflow-hidden rounded-[20px] border border-border bg-background p-4 ${className}`}
    >
      <div className="min-w-0">
        <h2
          id="home-recommendations-title"
          className="max-w-full text-balance text-lg leading-snug font-bold text-[#0A2036] md:text-xl"
        >
          Recommended Properties Based on Your Search
        </h2>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {!loaded
            ? "Finding properties for you…"
            : latestSearch
              ? `Inspired by your search for ${latestSearch.label}`
              : `Popular properties in ${recommendationState}`}
        </p>
      </div>

      <div className="no-scrollbar mt-3 flex min-h-0 w-full min-w-0 max-w-full flex-1 gap-3 overflow-x-auto pb-0.5">
        {recommendations.map((property) => (
          <RecommendationCard key={property.id} property={property} />
        ))}
      </div>
    </section>
  );
}

function RecommendationCard({ property }: { property: Property }) {
  const href = `/property/${property.id}/${generateSlug(property.title)}`;

  return (
    <Link
      href={href}
      className="group flex min-w-[15rem] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/35"
    >
      <div className="relative h-32 shrink-0 overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={property.image}
          alt={property.title}
          loading="lazy"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <span className="absolute top-2 left-2 rounded-md bg-[#0A2036]/85 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
          {property.listing === "rent" ? "FOR RENT" : "FOR SALE"}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-3">
        <h3 className="line-clamp-1 text-sm font-bold text-[#0A2036]">{property.title}</h3>
        <p className="mt-1 text-lg font-bold text-primary">{property.priceLabel}</p>
        <p className="mt-auto flex items-center gap-1 pt-2 text-xs text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">
            {property.locality}, {property.city}
          </span>
        </p>
      </div>
    </Link>
  );
}
