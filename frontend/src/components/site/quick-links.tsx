"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Armchair,
  ArrowRight,
  BedDouble,
  Building2,
  Home,
  LandPlot,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tag,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type QuickLink = {
  slug: string;
  label: string;
  level: "district" | "city";
  name: string;
};

export type QuickLinkGroup = {
  key: string;
  property_type: string;
  listing_type: "sale" | "rent";
  label: string;
  links: QuickLink[];
};

const PROPERTY_ICONS: Record<string, LucideIcon> = {
  flat: Building2,
  villa: Home,
  builder_floor: Home,
  pg: BedDouble,
  office_space: Armchair,
  shop: ShoppingBag,
  showroom: Store,
  plot: LandPlot,
};

const LISTING_TABS = [
  {
    value: "sale" as const,
    label: "For Sale",
    icon: ShoppingBag,
    active: "border-violet-500/40 bg-violet-50 text-violet-700",
    accent: "bg-violet-500",
    hover: "group-hover:text-violet-700",
    dotHover: "group-hover:bg-violet-500",
    header: "bg-violet-50 text-foreground",
    tile: "bg-violet-100 text-violet-700",
  },
  {
    value: "rent" as const,
    label: "For Rent",
    icon: Tag,
    active: "border-saffron/40 bg-saffron/10 text-saffron",
    accent: "bg-saffron",
    hover: "group-hover:text-saffron",
    dotHover: "group-hover:bg-saffron",
    header: "bg-saffron/10 text-foreground",
    tile: "bg-saffron/20 text-saffron",
  },
];

const HIGHLIGHTS = [
  {
    icon: Zap,
    tile: "bg-violet-50 text-violet-600",
    title: "Quick Access",
    body: "Top property pages in one click",
  },
  {
    icon: ShieldCheck,
    tile: "bg-orange-50 text-orange-500",
    title: "Curated Links",
    body: "Handpicked most searched pages",
  },
  {
    icon: MapPin,
    tile: "bg-green-50 text-green-600",
    title: null,
    body: null,
  },
];

export function QuickLinks({
  groups,
  displayName,
}: {
  groups: QuickLinkGroup[];
  displayName: string;
}) {
  const [listingType, setListingType] = useState<"sale" | "rent">("sale");

  const columns = useMemo(
    () => groups.filter((group) => group.listing_type === listingType),
    [groups, listingType],
  );

  const listing = LISTING_TABS.find((item) => item.value === listingType) ?? LISTING_TABS[0];

  if (groups.length === 0) return null;

  return (
    <div>
      <h2 className="text-3xl font-bold leading-tight md:text-4xl">Quick Links in {displayName}</h2>

      {/* Sub-heading row: copy on the left, Sale / Rent switch on the right */}
      <div className="mt-2 flex items-center justify-between gap-4">
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-muted-foreground">
          Jump straight to the most searched property pages across {displayName}.
        </p>

        <div className="flex shrink-0 gap-2">
          {LISTING_TABS.map((item) => {
            const active = listingType === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setListingType(item.value)}
                aria-pressed={active}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors ${
                  active
                    ? item.active
                    : "border-border bg-background text-muted-foreground hover:bg-secondary"
                }`}
              >
                <item.icon className="size-4" strokeWidth={1.8} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Columns — fixed height, extra categories scroll sideways */}
      {columns.length > 0 && (
        <div className="mt-4 overflow-x-auto pb-1 no-scrollbar">
          <div className="flex w-max gap-4">
            {columns.map((group) => {
              const Icon = PROPERTY_ICONS[group.property_type] ?? Building2;

              return (
                <div
                  key={group.key}
                  className="w-[min(80vw,380px)] shrink-0 overflow-hidden rounded-2xl border border-border bg-background"
                >
                  <h4
                    className={`flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-bold ${listing.header}`}
                  >
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-lg ${listing.tile}`}
                    >
                      <Icon className="size-4" strokeWidth={1.8} />
                    </span>
                    {group.label}
                  </h4>

                  <ol className="space-y-1 p-4">
                    {group.links.map((link) => (
                      <li key={link.slug}>
                        <Link
                          href={`/${link.slug}`}
                          className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-sm transition-colors hover:bg-secondary"
                        >
                          <span
                            className={`size-1.5 shrink-0 rounded-full bg-muted-foreground/30 transition-colors ${listing.dotHover}`}
                          />
                          <span className={`truncate text-foreground/85 ${listing.hover}`}>
                            {link.slug}
                          </span>
                          <ArrowRight className="ml-auto size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Highlight bar — skyline illustration sits flush at the bottom-right */}
      <div className="relative mt-4 overflow-hidden rounded-2xl border border-border bg-white">
        <Image
          src="/quick-links-skyline.webp"
          alt=""
          width={1819}
          height={558}
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-[1%] hidden h-full w-auto max-w-[52%] select-none object-contain object-bottom lg:block"
        />

        <div className="relative grid grid-cols-1 gap-y-5 px-5 py-5 sm:grid-cols-2 sm:gap-x-5 lg:w-[60%] lg:grid-cols-3 lg:gap-x-0 lg:divide-x lg:divide-border">
          {HIGHLIGHTS.map((item) => (
            <div
              key={item.title ?? "coverage"}
              className="flex items-center gap-3 lg:px-5 lg:first:pl-0 lg:last:pr-0"
            >
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-full ${item.tile}`}
              >
                <item.icon className="size-5" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight text-foreground">
                  {item.title ?? `Across ${displayName}`}
                </p>
                <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
                  {item.body ?? `Cities & districts across ${displayName}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
