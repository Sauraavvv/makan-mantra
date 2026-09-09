"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin, TrendingDown, TrendingUp } from "lucide-react";
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
  stateLabel: string;
  description: string;
  majorCities: string[];
  priceTrend: PriceTrendPoint[];
};

/** How many city names a card names before it starts counting them instead. */
const CITY_CHIPS = 3;

/**
 * Every district in the state, one card each, as a row that scrolls sideways.
 *
 * This replaced a master-detail panel — a list of names down the left, one
 * district's full profile on the right — which showed a state's districts one
 * at a time and made comparing two of them a matter of clicking back and forth.
 * The point of this section is to find the district worth opening, so the cards
 * carry a line about the place and the figures that separate it from its
 * neighbours. Everything else is on the page the card links to.
 *
 * The figures are read off the ten-year price series each district stores —
 * present, and exactly 2017 to 2026, for every district we have — so no card in
 * the row comes up empty and every card's rows mean the same thing.
 */
export function DistrictCarousel({
  districts,
  stateName,
}: {
  districts: DistrictItem[];
  stateName: string;
}) {
  const prepared = useMemo(
    () => districts.map((district) => prepareDistrict(district, stateName)),
    [districts, stateName],
  );

  const scroller = useRef<HTMLDivElement>(null);
  // Held together because they are read together, and because the initial
  // "nothing overflows" is what hides the arrows until a measurement says
  // otherwise — rather than showing two dead buttons on a state with one
  // district, which several of them have.
  const [scroll, setScroll] = useState({ overflowing: false, atStart: true, atEnd: false });

  const sync = useCallback(() => {
    const el = scroller.current;
    if (!el) return;

    const max = el.scrollWidth - el.clientWidth;
    setScroll({
      // A pixel of slack: fractional layout widths make an exactly-fitting row
      // report a scrollWidth a hair over its clientWidth.
      overflowing: max > 1,
      atStart: el.scrollLeft <= 1,
      atEnd: el.scrollLeft >= max - 1,
    });
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;

    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [sync]);

  const page = (direction: 1 | -1) => {
    const el = scroller.current;
    // A viewport at a time rather than a card at a time: the row is read in
    // screenfuls, and paging by one card leaves the reader tracking which of
    // the four in front of them is new.
    el?.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" });
  };

  if (prepared.length === 0) return null;

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-3xl font-bold leading-tight text-foreground md:text-4xl">
            Districts in {stateName}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {prepared.length === 1
              ? "Price movement and the pages beneath it."
              : `Price movement across ${prepared.length} districts.`}
          </p>
        </div>

        {scroll.overflowing && (
          <div className="hidden shrink-0 gap-2 sm:flex">
            <ArrowButton
              label="Previous districts"
              disabled={scroll.atStart}
              onClick={() => page(-1)}
            >
              <ChevronLeft className="size-5" strokeWidth={2.2} />
            </ArrowButton>
            <ArrowButton label="More districts" disabled={scroll.atEnd} onClick={() => page(1)}>
              <ChevronRight className="size-5" strokeWidth={2.2} />
            </ArrowButton>
          </div>
        )}
      </div>

      {/* Snapped to the start of a card, so a page never lands mid-card. */}
      <div
        ref={scroller}
        onScroll={sync}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto no-scrollbar"
      >
        {prepared.map((district) => (
          <DistrictCard key={district.slug || district.name} district={district} />
        ))}
      </div>
    </div>
  );
}

function ArrowButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-10 place-items-center rounded-full border border-border bg-white text-foreground transition-colors hover:border-saffron/60 hover:text-saffron disabled:cursor-default disabled:border-border disabled:bg-secondary/50 disabled:text-muted-foreground/50"
    >
      {children}
    </button>
  );
}

function DistrictCard({ district }: { district: PreparedDistrict }) {
  const trend = district.priceTrend;
  const latest = trend.at(-1);
  const cities = district.majorCities;
  const hidden = cities.length - CITY_CHIPS;

  return (
    <Link
      href={district.href}
      className="group flex w-[320px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-white transition-colors hover:border-saffron/60"
    >
      {/* The head, banded — the same shape the market-snapshot cards use: the
          name over the place it is in, a tinted tile holding the section's own
          icon, and the sentence about the district in a note beneath. The tint lives here rather than over the whole card, so the
          figures below sit on white.

          The note hangs half out of the band: the band takes no bottom
          padding, and the note pulls the band's foot up by half its own 90px
          — so the tint stops across the note's middle and its lower half sits
          on the white body, which is what ties the two halves of the card
          together. That is also why the note's fill is an opaque tint rather
          than another `bg-saffron/…`: a translucent one would read darker
          above the band's edge than below it. The body then starts clear of
          the overhang. */}
      <header className="shrink-0 bg-saffron/[0.08] px-3.5 pt-3.5 transition-colors group-hover:bg-saffron/[0.14]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold leading-tight text-foreground">
              {district.name}
            </h3>
            <p className="truncate text-xs text-muted-foreground">in {district.stateLabel}</p>
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-saffron/[0.16] text-saffron transition-colors group-hover:bg-saffron/25">
            <MapPin className="size-5" strokeWidth={1.9} />
          </span>
        </div>

        {/* Four lines of the district's own write-up, cut where it runs out of
            room rather than at a sentence — the stored text is a full page of
            prose and any rule for finding "the first sentence" in it breaks on
            the first abbreviation or figure it meets.

            A fixed height, not just a clamp: it is what makes every card's
            head the same depth, so the figures below line up across the row
            and can be read as a column. */}
        <div className="relative -mb-[45px] mt-2.5 rounded-xl border border-saffron/25 bg-[#feefe6] px-2.5 py-2">
          <p className="h-[72px] overflow-hidden text-[12px] font-medium leading-[18px] text-foreground/85">
            <span className="line-clamp-4">{district.description}</span>
          </p>
        </div>
      </header>

      <div className="flex flex-1 flex-col px-3.5 pb-3 pt-[57px]">
        {trend.length > 1 && latest ? (
          <div className="overflow-hidden rounded-lg border border-border bg-white">
            <p className="border-b border-border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Price per sqft
            </p>
            {/* Ruled like a table because that is what it is: the same three
                rows in the same order on every card. */}
            <dl className="divide-y divide-border px-2.5 text-[13px]">
              <Row label={`Avg ${latest.year}`}>
                <span className="font-bold tabular-nums text-foreground">
                  ₹{latest.averagePricePerSqft.toLocaleString("en-IN")}
                </span>
              </Row>
              <Row label="1 year">
                <Growth value={growthOverSteps(trend, 1)} />
              </Row>
              <Row label="5 years">
                <Growth value={growthOverSteps(trend, 5)} />
              </Row>
            </dl>
          </div>
        ) : (
          /* The handful of districts we know only by name — the state page
             lists them from its own overview when there is no district record
             behind them. Same box, so the row keeps its shape. */
          <div className="grid h-[120px] place-items-center rounded-lg border border-dashed border-border bg-white px-3 text-center text-[11px] text-muted-foreground">
            Price data coming soon
          </div>
        )}

        {/* The district's own cities, under its figures.

            Three of them and a count, on one line that never wraps: the row
            below is scanned across cards, so this has to be the same height on
            every one of them. The names share the width and truncate
            individually, which matters here — a few districts store a city as
            a whole descriptive phrase, and letting that one shrink first keeps
            its short neighbours whole. */}
        {cities.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Major cities
            </p>
            <div className="mt-1.5 flex gap-1.5">
              {cities.slice(0, CITY_CHIPS).map((city) => (
                <span
                  key={city}
                  title={city}
                  className="min-w-0 truncate rounded-md border border-border bg-secondary/60 px-2 py-0.5 text-[11px] font-medium text-foreground"
                >
                  {city}
                </span>
              ))}
              {hidden > 0 && (
                <span
                  title={cities.slice(CITY_CHIPS).join(", ")}
                  className="shrink-0 rounded-md border border-border bg-secondary/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                >
                  +{hidden}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <dt className="truncate text-muted-foreground">{label}</dt>
      <dd className="shrink-0">{children}</dd>
    </div>
  );
}

function Growth({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;

  const rising = value >= 0;

  return (
    <span
      className={`flex items-center gap-1 font-bold tabular-nums ${
        rising ? "text-emerald-700" : "text-red-600"
      }`}
    >
      {rising ? (
        <TrendingUp className="size-3.5" strokeWidth={2.4} />
      ) : (
        <TrendingDown className="size-3.5" strokeWidth={2.4} />
      )}
      {`${value > 0 ? "+" : ""}${value.toFixed(1)}%`}
    </span>
  );
}

function prepareDistrict(district: DistrictItem, fallbackStateName: string): PreparedDistrict {
  const stateLabel = district.stateName || fallbackStateName;
  const href = district.routeSlug
    ? `/${district.routeSlug}`
    : district.slug
      ? stateExploreHref(district.slug)
      : stateExploreHref(`${district.name}-${stateSlug(stateLabel)}`);

  return {
    ...district,
    href,
    stateLabel,
    description: firstText(
      district.seo?.page_description,
      district.seo?.meta_description,
      `Property prices, connectivity and growth across ${district.name}.`,
    ),
    majorCities: uniqueItems(district.overview?.major_cities),
    priceTrend: asPriceTrend(district.investmentAngle?.price_trend),
  };
}

/** Names, trimmed and de-duplicated case-insensitively, in the stored order. */
function uniqueItems(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => {
      if (!item || seen.has(item.toLowerCase())) return false;
      seen.add(item.toLowerCase());
      return true;
    });
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

/**
 * Growth from `steps` entries back to the latest one, as a percentage.
 *
 * Counted in entries rather than in years because the series is what we have:
 * a gap in it would make "five years back" and "five entries back" different
 * questions, and the one we can answer honestly is the second. Every district
 * currently carries an unbroken 2017–2026, so today they are the same question.
 */
function growthOverSteps(points: PriceTrendPoint[], steps: number) {
  if (points.length < 2 || steps <= 0 || steps >= points.length) return null;

  const latest = points[points.length - 1];
  const previous = points[points.length - 1 - steps];
  if (previous.averagePricePerSqft <= 0) return null;

  return (
    ((latest.averagePricePerSqft - previous.averagePricePerSqft) / previous.averagePricePerSqft) * 100
  );
}

function firstText(...values: unknown[]) {
  const value = values.find((item) => typeof item === "string" && item.trim().length > 0);
  return value ? String(value) : "";
}
