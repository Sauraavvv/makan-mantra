"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Gem,
  Home,
  IndianRupee,
  KeyRound,
  Landmark,
  Lightbulb,
  Loader2,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

import { useLocation } from "@/context/location-context";
import {
  DEFAULT_SNAPSHOT_SLUG,
  fetchMarketSnapshot,
  toSnapshotSlug,
  type MarketSnapshot,
  type PriceBand,
} from "@/lib/market-snapshot";

const CARD_COUNT = 5;

/** Each card gets its own tinted head so the carousel reads as five distinct panels. */
const CARD_ACCENTS = [
  {
    text: "text-[#1160F0]",
    head: "bg-[#1160F0]/10",
    tile: "bg-[#1160F0]/15",
    insight: "bg-[#1160F0]/8 border-[#1160F0]/25",
  },
  {
    text: "text-[#0F8B8D]",
    head: "bg-[#0F8B8D]/10",
    tile: "bg-[#0F8B8D]/15",
    insight: "bg-[#0F8B8D]/8 border-[#0F8B8D]/25",
  },
  {
    text: "text-[#7A1FD1]",
    head: "bg-[#7A1FD1]/10",
    tile: "bg-[#7A1FD1]/15",
    insight: "bg-[#7A1FD1]/8 border-[#7A1FD1]/25",
  },
  {
    text: "text-[#C2410C]",
    head: "bg-[#F97316]/10",
    tile: "bg-[#F97316]/18",
    insight: "bg-[#F97316]/8 border-[#F97316]/28",
  },
  {
    text: "text-[#C2255C]",
    head: "bg-[#C2255C]/10",
    tile: "bg-[#C2255C]/15",
    insight: "bg-[#C2255C]/8 border-[#C2255C]/25",
  },
] as const;

/** Colours the initials bubbles so a list of developers reads as distinct rows. */
const AVATAR_TONES = [
  "bg-[#1160F0]/12 text-[#1160F0]",
  "bg-[#0F8B8D]/12 text-[#0F8B8D]",
  "bg-[#7A1FD1]/12 text-[#7A1FD1]",
  "bg-[#F97316]/14 text-[#C2410C]",
  "bg-[#C2255C]/12 text-[#C2255C]",
] as const;

function formatInr(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

/** Rents read better shortened: 7000 → ₹7K, 130000 → ₹1.3L. */
function formatCompactInr(value: number) {
  if (value >= 100000) {
    const lakhs = value / 100000;
    return `₹${lakhs % 1 === 0 ? lakhs : lakhs.toFixed(1)}L`;
  }
  if (value >= 1000) {
    const thousands = value / 1000;
    return `₹${thousands % 1 === 0 ? thousands : thousands.toFixed(1)}K`;
  }
  return `₹${value}`;
}

function formatCrore(value: number) {
  return `₹${value % 1 === 0 ? value : Number(value.toFixed(2))} Cr`;
}

function formatRange(
  min: number | null | undefined,
  max: number | null | undefined,
  format: (value: number) => string,
) {
  if (min == null && max == null) return null;
  if (min == null) return format(max as number);
  if (max == null) return format(min);
  return `${format(min)} – ${format(max)}`;
}

/** "+1.8%" and "1.8%" both mean 1.8. */
function parsePercent(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function initialsOf(name: string) {
  const words = name
    .replace(/[^A-Za-z\s&]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !/^(and|the|group|india|ltd|limited|pvt|private)$/i.test(word));

  if (words.length === 0) return name.slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

/**
 * The headline fact for each card, derived from the same data the card lists —
 * whatever leads, costs the most, or moved the most in this market.
 */
function trendInsight(snapshot: MarketSnapshot) {
  const trend = snapshot.price_trend_growth_quarterly;
  const latest = parsePercent(trend.q2_current_year) ?? parsePercent(trend.q1_current_year);
  if (latest == null) return null;

  const yearAgo = trend.q2_current_year
    ? parsePercent(trend.q2_previous_year)
    : parsePercent(trend.q1_previous_year);
  const sign = latest > 0 ? `+${latest}` : `${latest}`;
  const base = `${snapshot.city} prices moved ${sign}% in the latest quarter`;

  return yearAgo == null ? `${base}.` : `${base}, against ${yearAgo > 0 ? "+" : ""}${yearAgo}% a year earlier.`;
}

function priceInsight(snapshot: MarketSnapshot) {
  const average = snapshot.asking_price_per_sq_ft.city_wide_metrics?.average_per_sq_ft_inr;
  const premiumMax = snapshot.asking_price_per_sq_ft.premium_locales?.max_price_inr;
  if (average == null) return null;

  const base = `Homes here average ${formatInr(average)} per sq ft`;
  return premiumMax == null ? `${base}.` : `${base}, with premium locales reaching ${formatInr(premiumMax)}.`;
}

function rentInsight(snapshot: MarketSnapshot) {
  let best: { where: string; bhk: string; rent: number } | null = null;

  for (const segment of snapshot.monthly_average_rent_by_bhk) {
    for (const config of segment.bhk_configurations ?? []) {
      const rent = config.max_rent_inr;
      if (rent != null && (!best || rent > best.rent)) {
        // Segment labels read awkwardly mid-sentence, so name the localities instead.
        const localities = segment.example_localities?.slice(0, 2).join(" and ");
        best = { where: localities || segment.segment, bhk: config.bhk_type, rent };
      }
    }
  }

  if (!best) return null;
  return `Rents peak at ${formatCompactInr(best.rent)} a month for ${best.bhk} homes in ${best.where}.`;
}

function developerInsight(snapshot: MarketSnapshot) {
  const leader = snapshot.top_developers[0];
  if (!leader) return null;

  const credentials = [
    leader.total_projects ? `${leader.total_projects} projects` : null,
    leader.total_experience_years ? `${leader.total_experience_years} years of experience` : null,
  ].filter(Boolean);

  const base = `${leader.developer_name} leads in ${snapshot.state_name}`;
  return credentials.length === 0 ? `${base}.` : `${base} with ${credentials.join(" and ")}.`;
}

function projectInsight(snapshot: MarketSnapshot) {
  const priciest = snapshot.top_projects.reduce<MarketSnapshot["top_projects"][number] | null>(
    (best, project) =>
      project.max_price_crore_inr != null && (!best || project.max_price_crore_inr > (best.max_price_crore_inr ?? 0))
        ? project
        : best,
    null,
  );

  if (!priciest) return null;
  const range = formatRange(priciest.min_price_crore_inr, priciest.max_price_crore_inr, formatCrore);
  return `${priciest.project_name} tops the list at ${range}.`;
}

function SectionCard({
  index,
  title,
  stateName,
  icon,
  insight,
  href,
  children,
}: {
  index: number;
  title: string;
  stateName: string;
  icon: React.ReactNode;
  /** The one leading fact this card is really about, shown above the list. */
  insight: string | null;
  href: string;
  children: React.ReactNode;
}) {
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
  // The last card snaps by its trailing edge; a leading snap point would sit past
  // the maximum scroll offset, so the browser would pull back and clip it.
  const snap = index === CARD_COUNT - 1 ? "snap-end" : "snap-start";

  return (
    <article
      // 4.5rem is the page's horizontal chrome (section px-4 + panel px-5), so on
      // phones a card fills the scroller exactly instead of overflowing it.
      className={`flex h-[470px] w-[min(calc(100vw-4.5rem),400px)] shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-background ${snap}`}
    >
      <header className={`shrink-0 px-4 pb-3 pt-3.5 ${accent.head}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold leading-tight text-foreground">{title}</h3>
            <p className="truncate text-xs text-muted-foreground">in {stateName}</p>
          </div>
          <Link
            href={href}
            aria-label={`${title} in ${stateName} — explore more`}
            className={`grid size-11 shrink-0 place-items-center rounded-xl transition-opacity hover:opacity-80 ${accent.tile} ${accent.text}`}
          >
            {icon}
          </Link>
        </div>

        {insight && (
          <div className={`mt-2.5 flex items-start gap-2 rounded-xl border px-2.5 py-2 ${accent.insight}`}>
            <Lightbulb className={`mt-0.5 size-4 shrink-0 ${accent.text}`} strokeWidth={1.9} />
            <p className="text-[11px] font-medium leading-snug text-foreground/85">{insight}</p>
          </div>
        )}
      </header>
      {/* No inner scroll: every card is sized so its list fits whole, and rows
          stretch into whatever height is left so short states show no dead space. */}
      <div className="flex min-h-0 flex-1 flex-col px-4 py-3">{children}</div>
    </article>
  );
}

/** Six-quarter growth line, sized for the short card rather than a full-width chart. */
function QuarterlyTrend({ trend }: { trend: MarketSnapshot["price_trend_growth_quarterly"] }) {
  const points = [
    { label: "Q1", scope: "Prev Yr", value: parsePercent(trend.q1_previous_year) },
    { label: "Q2", scope: "Prev Yr", value: parsePercent(trend.q2_previous_year) },
    { label: "Q3", scope: "Prev Yr", value: parsePercent(trend.q3_previous_year) },
    { label: "Q4", scope: "Prev Yr", value: parsePercent(trend.q4_previous_year) },
    { label: "Q1", scope: "Curr Yr", value: parsePercent(trend.q1_current_year) },
    { label: "Q2", scope: "Curr Yr", value: parsePercent(trend.q2_current_year) },
  ].filter((point): point is { label: string; scope: string; value: number } => point.value != null);

  if (points.length < 2) return null;

  const width = 372;
  const height = 112;
  const padding = { top: 20, right: 14, bottom: 24, left: 14 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const plotted = points.map((point, index) => ({
    ...point,
    x: padding.left + (index / (points.length - 1)) * plotWidth,
    y: padding.top + plotHeight - ((point.value - min) / span) * plotHeight,
  }));
  const path = plotted
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="Quarterly price growth"
    >
      <path d={path} fill="none" className="stroke-[#1160F0]" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {plotted.map((point, index) => (
        <g key={`${point.scope}-${point.label}-${index}`}>
          <circle cx={point.x} cy={point.y} r="3.4" className="fill-background stroke-[#1160F0]" strokeWidth="2" />
          <text x={point.x} y={point.y - 10} textAnchor="middle" className="fill-foreground text-[10px] font-bold">
            {point.value > 0 ? `+${point.value}` : point.value}%
          </text>
          <text x={point.x} y={height - 12} textAnchor="middle" className="fill-muted-foreground text-[9px] font-semibold">
            {point.label}
          </text>
          <text x={point.x} y={height - 3} textAnchor="middle" className="fill-muted-foreground/70 text-[8px]">
            {point.scope}
          </text>
        </g>
      ))}
    </svg>
  );
}

function PriceBandRow({
  icon,
  label,
  value,
  localities,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  localities?: string[];
  tone: string;
}) {
  if (!value) return null;

  return (
    <div className="flex flex-1 items-center gap-2.5 py-1.5">
      <span className={`grid size-9 shrink-0 place-items-center rounded-xl border border-border ${tone}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="min-w-0 text-[11px] font-semibold leading-tight text-muted-foreground">{label}</p>
          <p className="shrink-0 text-[11px] font-bold leading-tight text-foreground">{value}</p>
        </div>
        {localities && localities.length > 0 && (
          <p className="mt-0.5 text-[9px] leading-tight text-muted-foreground">{localities.join(", ")}</p>
        )}
      </div>
    </div>
  );
}

function bandRange(band: PriceBand | null | undefined) {
  return formatRange(band?.min_price_inr, band?.max_price_inr, formatInr);
}

export function MarketSnapshot({ initial }: { initial: MarketSnapshot | null }) {
  const { meta } = useLocation();
  const [snapshot, setSnapshot] = useState(initial);
  const [requestResult, setRequestResult] = useState<{
    slug: string;
    status: "ready" | "unavailable";
  }>(
    initial
      ? { slug: initial.slug, status: "ready" }
      : { slug: "", status: "unavailable" },
  );
  const [retryKey, setRetryKey] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // "India" means we never learned the visitor's state, so the default stands.
  const wantedSlug = meta.label === "India" ? DEFAULT_SNAPSHOT_SLUG : toSnapshotSlug(meta.label);

  useEffect(() => {
    if (!wantedSlug) return;
    if (wantedSlug === snapshot?.slug) return;

    let cancelled = false;
    fetchMarketSnapshot(wantedSlug).then((next) => {
      if (cancelled) return;
      if (next) {
        setSnapshot(next);
        setRequestResult({ slug: wantedSlug, status: "ready" });
      } else {
        setRequestResult({ slug: wantedSlug, status: "unavailable" });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [retryKey, wantedSlug, snapshot?.slug]);

  if (!snapshot || snapshot.slug !== wantedSlug) {
    const stateName = meta.label === "India" ? "Delhi" : meta.label;
    const requestState =
      requestResult.slug === wantedSlug ? requestResult.status : "loading";

    return (
      <section className="bg-secondary px-4 py-4 md:py-5">
        <div className="mx-auto max-w-[1250px] rounded-[20px] border border-border bg-background px-5 py-5">
          <h2 className="text-2xl font-bold md:text-3xl">
            {stateName} Real Estate Market Snapshot
          </h2>
          <div className="mt-4 grid min-h-40 place-items-center rounded-lg border border-dashed border-border bg-secondary/40 px-5 text-center">
            {requestState === "loading" ? (
              <div>
                <Loader2 className="mx-auto size-6 animate-spin text-primary" strokeWidth={1.8} />
                <p className="mt-2 text-sm text-muted-foreground">Loading {stateName} market data...</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {stateName} market data could not be loaded.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRequestResult({ slug: "", status: "unavailable" });
                    setRetryKey((current) => current + 1);
                  }}
                  className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
                >
                  <RefreshCw className="size-3.5" strokeWidth={1.8} />
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  const exploreHref = `/explore-${snapshot.slug}`;
  const price = snapshot.asking_price_per_sq_ft;
  const villas = price.independent_builder_floors_or_villas;
  const cityWide = price.city_wide_metrics;

  const scroll = (direction: "left" | "right") => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const track = scroller.firstElementChild;
    const cards = track ? (Array.from(track.children) as HTMLElement[]) : [];
    if (cards.length === 0) return;

    const current = scroller.scrollLeft;
    const maxScroll = scroller.scrollWidth - scroller.clientWidth;
    const scrollerLeft = scroller.getBoundingClientRect().left;
    const cardWidth = cards[0].offsetWidth;

    // Stops are measured off the live layout rather than assumed to be multiples
    // of the card width — the scroller's padding offsets every snap point, and
    // guessing leaves the browser snapping back to where it started.
    const stops = cards
      .map((card) => current + (card.getBoundingClientRect().left - scrollerLeft))
      // A stop less than half a card from the end would leave the last card
      // clipped and cost an extra click, so the end replaces it.
      .filter((stop) => stop >= 0 && maxScroll - stop > cardWidth / 2);
    stops.push(maxScroll);

    const target =
      direction === "left"
        ? [...stops].reverse().find((stop) => stop < current - 2) ?? 0
        : stops.find((stop) => stop > current + 2) ?? maxScroll;

    scroller.scrollTo({ left: target, behavior: "smooth" });
  };

  return (
    <section className="bg-secondary px-4 py-4 md:py-5">
      <div className="mx-auto max-w-[1250px] rounded-[20px] border border-border bg-background px-5 py-5">
        <div className="mb-4">
          <h2 className="text-2xl font-bold md:text-3xl">
            {snapshot.state_name} Real Estate Market Snapshot
          </h2>
          <div className="mt-1 flex items-center justify-between gap-4">
            <p className="min-w-0 flex-1 text-muted-foreground">
              Explore prices, rents, top developers and projects in {snapshot.state_name}
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                aria-label="Scroll market snapshot left"
                onClick={() => scroll("left")}
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-secondary"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                aria-label="Scroll market snapshot right"
                onClick={() => scroll("right")}
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-secondary"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </div>

        <div>
          <div
            ref={scrollerRef}
            // Snapping belongs on the scroll container, not the track inside it.
            className="-mx-1 snap-x snap-mandatory overflow-x-auto scroll-smooth px-1 pb-2 no-scrollbar"
          >
            <div className="flex w-max gap-4">
              <SectionCard
                index={0}
                title="Market Overview"
                stateName={snapshot.state_name}
                icon={<TrendingUp className="size-5" strokeWidth={1.9} />}
                insight={trendInsight(snapshot)}
                href={exploreHref}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-foreground">{snapshot.city}</p>
                  {snapshot.market_status_as_of && (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      as of {snapshot.market_status_as_of}
                    </span>
                  )}
                </div>

                <p className="mt-3 text-[11px] font-semibold text-foreground">
                  Price Trend <span className="font-normal text-muted-foreground">(Quarterly Growth)</span>
                </p>
                <div className="flex flex-1 items-center">
                  <QuarterlyTrend trend={snapshot.price_trend_growth_quarterly} />
                </div>

                {snapshot.price_trend_growth_quarterly.note && (
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    {snapshot.price_trend_growth_quarterly.note}
                  </p>
                )}
              </SectionCard>

              <SectionCard
                index={1}
                title="Price Insights"
                stateName={snapshot.state_name}
                icon={<IndianRupee className="size-5" strokeWidth={1.9} />}
                insight={priceInsight(snapshot)}
                href={exploreHref}
              >
                <p className="text-[11px] font-bold text-foreground">Asking Price per Sq. Ft.</p>
                <div className="mt-1 flex flex-1 flex-col divide-y divide-border">
                  <PriceBandRow
                    icon={<Home className="size-3.5" strokeWidth={1.9} />}
                    label="Affordable Pockets"
                    value={bandRange(price.affordable_pockets)}
                    localities={price.affordable_pockets?.example_localities}
                    tone="bg-[#0F8B8D]/10 text-[#0F8B8D]"
                  />
                  <PriceBandRow
                    icon={<Building2 className="size-3.5" strokeWidth={1.9} />}
                    label="Mid-Segment Locales"
                    value={bandRange(price.mid_segment_locales)}
                    localities={price.mid_segment_locales?.example_localities}
                    tone="bg-[#1160F0]/10 text-[#1160F0]"
                  />
                  <PriceBandRow
                    icon={<Gem className="size-3.5" strokeWidth={1.9} />}
                    label="Premium Locales"
                    value={bandRange(price.premium_locales)}
                    localities={price.premium_locales?.example_localities}
                    tone="bg-[#F97316]/12 text-[#C2410C]"
                  />
                  <PriceBandRow
                    icon={<Landmark className="size-3.5" strokeWidth={1.9} />}
                    label="Builder Floors / Villas"
                    value={formatRange(villas?.min_price_crore_inr, villas?.max_price_crore_inr, formatCrore)}
                    tone="bg-[#7A1FD1]/10 text-[#7A1FD1]"
                  />
                </div>

                {cityWide && (
                  <div className="mt-2.5 rounded-xl border border-[#1160F0]/20 bg-[#1160F0]/5 p-2.5">
                    <p className="text-[10px] font-semibold text-[#1160F0]">City-Wide Average</p>
                    <div className="mt-1.5 grid grid-cols-2 gap-2">
                      {cityWide.average_per_sq_meter_inr != null && (
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {formatInr(cityWide.average_per_sq_meter_inr)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">per sq meter</p>
                        </div>
                      )}
                      {cityWide.average_per_sq_ft_inr != null && (
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {formatInr(cityWide.average_per_sq_ft_inr)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">per sq ft</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </SectionCard>

              <SectionCard
                index={2}
                title="Rent Insights"
                stateName={snapshot.state_name}
                icon={<KeyRound className="size-5" strokeWidth={1.9} />}
                insight={rentInsight(snapshot)}
                href={exploreHref}
              >
                <p className="text-[11px] font-bold text-foreground">Monthly Average Rent by BHK</p>
                <div className="mt-1 flex flex-1 flex-col divide-y divide-border">
                  {snapshot.monthly_average_rent_by_bhk.map((segment) => {
                    const configs = segment.bhk_configurations ?? [];

                    return (
                      <div key={segment.segment} className="flex flex-1 flex-col justify-center py-2">
                        <p className="text-[11px] font-semibold leading-tight text-foreground">{segment.segment}</p>
                        {segment.example_localities && segment.example_localities.length > 0 && (
                          <p className="mt-0.5 text-[9px] leading-snug text-muted-foreground">
                            {segment.example_localities.join(", ")}
                          </p>
                        )}
                        <div
                          className="mt-1.5 grid gap-1.5"
                          // One column per configuration so a 4 BHK row never wraps.
                          style={{ gridTemplateColumns: `repeat(${Math.max(configs.length, 1)}, minmax(0, 1fr))` }}
                        >
                          {configs.map((config) => (
                            <div key={config.bhk_type} className="rounded-lg bg-muted px-1 py-1 text-center">
                              <p className="text-[9px] font-semibold leading-tight text-muted-foreground">
                                {config.bhk_type}
                              </p>
                              <p className="text-[10px] font-bold leading-tight text-foreground">
                                {formatRange(config.min_rent_inr, config.max_rent_inr, formatCompactInr)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard
                index={3}
                title="Top Developers"
                stateName={snapshot.state_name}
                icon={<Building2 className="size-5" strokeWidth={1.9} />}
                insight={developerInsight(snapshot)}
                href={exploreHref}
              >
                <div className="flex flex-1 flex-col divide-y divide-border">
                  {snapshot.top_developers.map((developer, index) => (
                    <div key={developer.developer_name} className="flex flex-1 items-center gap-2.5 py-1.5">
                      <span
                        className={`grid size-9 shrink-0 place-items-center rounded-xl border border-border text-[10px] font-bold ${
                          AVATAR_TONES[index % AVATAR_TONES.length]
                        }`}
                      >
                        {initialsOf(developer.developer_name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold leading-tight text-foreground">{developer.developer_name}</p>
                        <p className="mt-0.5 flex flex-wrap gap-x-2 text-[10px] font-medium leading-tight text-muted-foreground">
                          {developer.total_projects != null && <span>{developer.total_projects} Projects</span>}
                          {developer.total_experience_years != null && (
                            <span>{developer.total_experience_years} Years</span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                index={4}
                title="Top Projects"
                stateName={snapshot.state_name}
                icon={<Landmark className="size-5" strokeWidth={1.9} />}
                insight={projectInsight(snapshot)}
                href={exploreHref}
              >
                <div className="flex flex-1 flex-col divide-y divide-border">
                  {snapshot.top_projects.map((project, index) => (
                    <div key={project.project_name} className="flex flex-1 items-center gap-2.5 py-1.5">
                      <span
                        className={`grid size-9 shrink-0 place-items-center rounded-xl border border-border ${
                          AVATAR_TONES[index % AVATAR_TONES.length]
                        }`}
                      >
                        <Building2 className="size-4" strokeWidth={1.9} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="min-w-0 text-[11px] font-bold leading-tight text-foreground">
                            {project.project_name}
                          </p>
                          <p className="shrink-0 text-[11px] font-bold leading-tight text-[#C2255C]">
                            {formatRange(project.min_price_crore_inr, project.max_price_crore_inr, formatCrore)}
                          </p>
                        </div>
                        {project.location && (
                          <p className="mt-0.5 text-[9px] leading-tight text-muted-foreground">{project.location}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
