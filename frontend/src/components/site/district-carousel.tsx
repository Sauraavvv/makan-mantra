"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Building2, ChevronRight, Landmark, MapPin, TrendingUp } from "lucide-react";
import { stateExploreHref, stateSlug } from "@/lib/state-routes";

type PriceTrendPoint = {
  year: number;
  averagePricePerSqft: number;
};

export type DistrictItem = {
  name: string;
  stateName?: string;
  slug?: string;
  routeSlug?: string;
  seo?: {
    page_description?: string;
    meta_description?: string;
  };
  overview?: Record<string, unknown>;
  investmentAngle?: Record<string, unknown>;
};

type PreparedDistrict = DistrictItem & {
  href: string;
  description: string;
  majorCities: string[];
  majorTowns: string[];
  priceTrend: PriceTrendPoint[];
};

export function DistrictCarousel({ districts, stateName }: { districts: DistrictItem[]; stateName: string }) {
  const preparedDistricts = useMemo(
    () => districts.map((district) => prepareDistrict(district, stateName)),
    [districts, stateName],
  );
  const [selectedName, setSelectedName] = useState(preparedDistricts[0]?.name ?? "");
  const selected = preparedDistricts.find((district) => district.name === selectedName) ?? preparedDistricts[0];

  if (!selected) return null;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold leading-tight text-foreground md:text-4xl">
          Districts in {stateName}
        </h2>
      </div>

      <div className="grid min-w-0 gap-5 lg:h-[530px] lg:grid-cols-[320px_minmax(0,1fr)] lg:items-stretch">
        <aside className="flex h-[530px] overflow-hidden rounded-xl border border-border bg-white shadow-sm lg:h-full">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex h-[92px] shrink-0 items-center gap-3 border-b border-border px-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-saffron/10 text-saffron">
                <MapPin className="size-5" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-bold leading-5 text-foreground">Districts</h3>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                  Select a district to view detailed insights
                </p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {preparedDistricts.map((district) => {
                const active = district.name === selected.name;

                return (
                  <button
                    key={`${district.slug || district.name}`}
                    type="button"
                    onClick={() => setSelectedName(district.name)}
                    className={`relative flex h-16 w-full shrink-0 items-center gap-3 border-b border-border px-4 text-left transition-colors last:border-b-0 ${
                      active
                        ? "bg-[#fff7f2] text-saffron"
                        : "text-foreground hover:bg-secondary/55"
                    }`}
                  >
                    {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-saffron" />}
                    <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                      active ? "bg-saffron/12 text-saffron" : "bg-secondary text-muted-foreground"
                    }`}>
                      <MapPin className="size-[17px]" strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold leading-5">{district.name}</span>
                    </span>
                    <ChevronRight className={`size-4 shrink-0 ${active ? "text-saffron" : "text-muted-foreground"}`} strokeWidth={2} />
                  </button>
                );
              })}
            </div>

            <div className="flex h-[52px] shrink-0 items-center justify-center border-t border-border bg-secondary/40 px-5 text-center text-[11px] font-medium text-muted-foreground">
              <span>Scroll to explore more districts</span>
            </div>
          </div>
        </aside>

        <article className="flex min-h-[520px] min-w-0 flex-col rounded-xl border border-border bg-white p-3 shadow-sm lg:h-full lg:min-h-0">
          <DistrictHero district={selected} />

          <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
            <PriceInsightCard district={selected} />

            <div className="grid min-h-0 min-w-0 flex-1 gap-3 md:grid-cols-2">
              <ChipPanel
                title="Major Cities"
                subtitle={`Key cities in ${selected.name}`}
                icon={Building2}
                items={selected.majorCities}
                emptyText="City data is not available yet."
              />
              <ChipPanel
                title="Major Towns"
                subtitle={`Important towns in ${selected.name}`}
                icon={Landmark}
                items={selected.majorTowns}
                emptyText="Town data is not available yet."
              />
            </div>

            <div className="flex min-h-[58px] shrink-0 flex-col gap-3 rounded-lg border border-saffron/20 bg-[#fff8f3] px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-saffron/12 text-saffron">
                  <TrendingUp className="size-[18px]" strokeWidth={2} />
                </span>
                <p className="line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                  Explore the full district guide for locality, connectivity, growth, and property signals.
                </p>
              </div>
              <Link
                href={selected.href}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-saffron/60 bg-white px-3.5 text-[11px] font-bold text-saffron transition-colors hover:bg-saffron/10"
              >
                View Full District Page
                <ChevronRight className="size-3.5" strokeWidth={1.9} />
              </Link>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

function DistrictHero({ district }: { district: PreparedDistrict }) {
  return (
    <div className="flex min-h-[126px] min-w-0 shrink-0 items-center overflow-hidden rounded-lg border border-border bg-[#fffaf7] px-5 py-4">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase text-saffron">
          Selected District
        </p>
        <h3 className="mt-1.5 text-2xl font-bold leading-8 text-foreground md:text-[28px]">
          {district.name}
        </h3>
        <p className="mt-2 line-clamp-2 max-w-[650px] text-[11px] leading-[17px] text-muted-foreground">
          {district.description}
        </p>
      </div>
    </div>
  );
}

function prepareDistrict(district: DistrictItem, fallbackStateName: string): PreparedDistrict {
  const stateName = district.stateName || fallbackStateName;
  const href = district.routeSlug
    ? `/${district.routeSlug}`
    : district.slug
      ? stateExploreHref(district.slug)
      : stateExploreHref(`${district.name}-${stateSlug(stateName)}`);
  const majorCities = uniqueItems(district.overview?.major_cities, 6);
  const majorTowns = uniqueItems(district.overview?.major_towns, 6);
  const description = firstText(
    district.seo?.page_description,
    district.seo?.meta_description,
    `Explore price movement, cities, towns, and real estate signals across ${district.name}.`,
  );

  return {
    ...district,
    href,
    description,
    majorCities,
    majorTowns,
    priceTrend: asPriceTrend(district.investmentAngle?.price_trend),
  };
}

function PriceInsightCard({ district }: { district: PreparedDistrict }) {
  const trend = district.priceTrend;
  const yearlyGrowth = growthSince(trend, 1);
  const metrics = [
    { label: "Quarterly", value: growthLabel(scaleGrowth(yearlyGrowth, 0.25)), detail: "vs. last quarter" },
    { label: "Half Yearly", value: growthLabel(scaleGrowth(yearlyGrowth, 0.5)), detail: "vs. last 6 months" },
    { label: "Yearly", value: growthLabel(yearlyGrowth), detail: "vs. last year" },
  ];

  return (
    <div className="min-w-0 shrink-0 rounded-lg border border-border bg-white px-4 py-3">
      <div className="grid min-w-0 gap-3 sm:grid-cols-3 lg:grid-cols-[1.3fr_repeat(3,minmax(0,1fr))] lg:items-center">
        <div className="flex min-w-0 items-center gap-3 sm:col-span-3 lg:col-span-1">
          <div className="min-w-0">
            <p className="text-[13px] font-bold leading-5 text-foreground">Average Price Growth</p>
            <p className="mt-0.5 max-w-[220px] text-[11px] leading-4 text-muted-foreground">
              Average growth in property prices across {district.name}
            </p>
          </div>
        </div>

        {metrics.map((metric) => (
          <div key={metric.label} className="border-l border-border pl-3 lg:pl-5">
            <p className="text-[11px] font-medium leading-4 text-foreground/80">{metric.label}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xl font-bold leading-6 text-emerald-700">
              {metric.value}
              {metric.value !== "N/A" && <TrendingUp className="size-3.5" strokeWidth={2.4} />}
            </p>
            <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">{metric.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChipPanel({
  title,
  subtitle,
  icon: Icon,
  items,
  emptyText,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  items: string[];
  emptyText: string;
}) {
  const visibleItems = items.slice(0, 6);

  return (
    <div className="flex min-h-[156px] min-w-0 flex-col rounded-lg border border-border bg-white p-3.5">
      <div className="mb-3 flex min-h-10 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-saffron/10 text-saffron">
            <Icon className="size-[17px]" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h4 className="text-[13px] font-bold leading-5 text-foreground">{title}</h4>
            <p className="truncate text-[10px] leading-4 text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="grid flex-1 auto-rows-[34px] grid-cols-2 gap-1.5">
          {visibleItems.map((item) => (
            <span
              key={item}
              title={item}
              className="flex min-w-0 items-center rounded-lg border border-border bg-secondary/30 px-3 text-[11px] font-medium text-foreground"
            >
              <span className="truncate">{item}</span>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs leading-5 text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value.filter(Boolean).map(String) : [];
}

function uniqueItems(value: unknown, limit: number) {
  const seen = new Set<string>();
  return asArray(value)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
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

function growthSince(points: PriceTrendPoint[], yearsBack: number) {
  if (points.length < 2 || yearsBack <= 0) return null;
  const latest = points.at(-1);
  const previous = points[Math.max(0, points.length - 1 - yearsBack)];
  if (!latest || !previous || previous.averagePricePerSqft <= 0 || latest === previous) return null;
  return ((latest.averagePricePerSqft - previous.averagePricePerSqft) / previous.averagePricePerSqft) * 100;
}

function scaleGrowth(value: number | null, scale: number) {
  if (value === null || !Number.isFinite(value)) return null;
  return value * scale;
}

function growthLabel(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "N/A";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function firstText(...values: unknown[]) {
  const value = values.find((item) => typeof item === "string" && item.trim().length > 0);
  return value ? String(value) : "";
}
