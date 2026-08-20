"use client";

import Link from "next/link";
import { Bath, BedDouble, Clock3, MapPin, Maximize2 } from "lucide-react";
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
  const { items: searches } = useSearchHistory();
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
      className={`flex w-full min-w-0 max-w-full flex-col overflow-hidden rounded-[20px] border border-border bg-background p-4 ${className}`}
    >
      <div className="mb-5 min-w-0">
        <h2
          id="home-recommendations-title"
          className="max-w-full text-balance text-2xl font-bold leading-tight text-[#0A2036] md:text-3xl"
        >
          Recommended Properties
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Explore handpicked properties for your next move.
        </p>
      </div>

      <div className="no-scrollbar flex min-h-0 w-full min-w-0 max-w-full flex-1 gap-3 overflow-x-auto pb-0.5">
        {recommendations.map((property) => (
          <RecommendationCard key={property.id} property={property} />
        ))}
      </div>
    </section>
  );
}

function RecommendationCard({ property }: { property: Property }) {
  const href = `/property/${property.id}/${generateSlug(property.title)}`;
  const ratePerSqFt = Math.round((property.priceValue * 100_000) / property.area).toLocaleString(
    "en-IN",
  );
  const residential = ["Flat", "Villa", "Builder Floor"].includes(property.type);

  return (
    <Link
      href={href}
      className="group flex min-w-[15rem] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/35"
    >
      <div className="relative h-48 shrink-0 overflow-hidden bg-muted">
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
        <span className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-[10px] font-bold text-[#0A2036] backdrop-blur-sm">
          {property.type}
        </span>
        {property.featured && (
          <span className="absolute bottom-2 left-2 rounded-md bg-saffron px-2 py-1 text-[10px] font-bold text-saffron-foreground">
            Featured
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-2.5">
        <h3 className="line-clamp-1 text-sm font-bold text-[#0A2036]">{property.title}</h3>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-lg font-bold text-primary">{property.priceLabel}</p>
          <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
            <Clock3 className="size-3" strokeWidth={1.7} />
            {property.posted}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
          ₹{ratePerSqFt}/sq.ft{property.listing === "rent" ? "/month" : ""}
          {residential ? ` · ${property.bhk} BHK` : ""}
        </p>

        <div className="mt-2 grid grid-cols-3 divide-x divide-border rounded-lg bg-secondary/70 px-1 py-1.5">
          <span className="flex min-w-0 flex-col items-center gap-1 px-1 text-[10px] font-medium text-muted-foreground">
            <BedDouble className="size-3.5 text-[#0A2036]" strokeWidth={1.7} />
            <span className="truncate">{property.beds} Beds</span>
          </span>
          <span className="flex min-w-0 flex-col items-center gap-1 px-1 text-[10px] font-medium text-muted-foreground">
            <Bath className="size-3.5 text-[#0A2036]" strokeWidth={1.7} />
            <span className="truncate">{property.baths} Baths</span>
          </span>
          <span className="flex min-w-0 flex-col items-center gap-1 px-1 text-[10px] font-medium text-muted-foreground">
            <Maximize2 className="size-3.5 text-[#0A2036]" strokeWidth={1.7} />
            <span className="truncate">{property.area} sq.ft</span>
          </span>
        </div>

        <p className="mt-auto flex items-center gap-1 pt-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">
            {property.locality}, {property.city}, {property.state}
          </span>
        </p>
      </div>
    </Link>
  );
}
