export type PropertyStat = {
  label: string;
  value: string;
  /** One figure per bar carries the colour; the rest would compete with it. */
  accent?: boolean;
};

/**
 * The shape of the market on this page, read at a glance: how much is listed,
 * what it costs, and the two or three attributes that decide a shortlist.
 *
 * Which attributes those are depends on what is being sold — a plot has a
 * facing and a land use, a flat has a configuration and a possession date —
 * so the page picks the set and this only lays it out.
 */
export function PropertyStatsBar({ stats }: { stats: PropertyStat[] }) {
  if (stats.length === 0) return null;

  return (
    /* Sized to their contents rather than shared out evenly: "residential" and
       "north, northwest, northeast and southeast" are not the same width and
       forcing them to be would strand one in whitespace and wrap the other.
       Past the page's width the row scrolls rather than wrapping, so the bar
       stays one line on a phone. */
    <div className="overflow-x-auto">
      <dl className="flex w-max gap-2.5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-background px-3 py-2"
          >
            <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/80">
              {stat.label}
            </dt>
            <dd
              className={`mt-0.5 whitespace-nowrap text-[13px] font-bold ${
                stat.accent ? "text-saffron" : "text-foreground"
              }`}
            >
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Placeholder figures. Listings are not wired up yet — the results below come
 * from `makeDummyProperties` and the count beside them is invented too — so
 * these stand in until there is a real aggregate to read. Swap the values
 * when the listings API lands; the labels are what each set is really about.
 */
const PLACEHOLDER = {
  listings: "730",
  price: "₹5L to ₹3Cr",
  rent: "₹4,500 to ₹1.2L",
  deposit: "1 to 3 months rent",
  rate: "₹50 to ₹38,462 per sq ft",
  rentRate: "₹15 to ₹210 per sq ft",
  area: "850 to 9,600 sq ft",
  facing: "north, northwest, northeast and southeast",
  config: "1 BHK to 5 BHK",
  possession: "ready to move and under construction",
  floor: "ground to 12th",
  furnishing: "unfurnished, semi and fully furnished",
  occupancy: "single, double and triple sharing",
};

/** Rooms and a configuration; shortlisted on how the family fits. */
const RESIDENTIAL = new Set(["flat", "villa", "builder_floor"]);

/** Floor space; shortlisted on frontage, floor and what is already fitted. */
const COMMERCIAL = new Set(["shop", "showroom", "office_space"]);

/**
 * Which figures a page carries, decided by the pair it is written for.
 *
 * Both halves of the pair change the answer, and they change it in different
 * ways. The property type decides what the thing even has — land has a facing
 * and no bedrooms, a bed in a shared room has neither. The listing type
 * decides which of those a buyer or a tenant is actually weighing: a rate per
 * square foot is how a home is valued and not how it is let, and a possession
 * date means nothing to someone moving in next month, who wants to know what
 * furniture comes with it and what the deposit is.
 *
 * The site stores fourteen of the sixteen possible pairs — plots are never
 * let and a paying-guest bed is never sold — so there is no set written for
 * either of those.
 */
export function buildPropertyStats({
  propertyType,
  listingType,
}: {
  propertyType?: string;
  listingType?: string;
}): PropertyStat[] {
  const renting = listingType === "rent";
  const listings: PropertyStat = {
    label: "TOTAL LISTINGS",
    value: PLACEHOLDER.listings,
    accent: true,
  };

  if (propertyType === "plot") {
    return [
      listings,
      { label: "TOTAL PRICE", value: PLACEHOLDER.price },
      { label: "RATE / SQ FT", value: PLACEHOLDER.rate },
      { label: "PLOT AREA", value: PLACEHOLDER.area },
      { label: "FACING", value: PLACEHOLDER.facing },
      { label: "PLOT TYPE", value: "residential" },
    ];
  }

  if (propertyType === "pg") {
    return [
      listings,
      { label: "MONTHLY RENT", value: PLACEHOLDER.rent },
      { label: "SECURITY DEPOSIT", value: PLACEHOLDER.deposit },
      { label: "OCCUPANCY", value: PLACEHOLDER.occupancy },
      { label: "FURNISHING", value: PLACEHOLDER.furnishing },
      { label: "PREFERRED FOR", value: "men, women and working professionals" },
    ];
  }

  if (propertyType && COMMERCIAL.has(propertyType)) {
    // The one place a per-square-foot figure survives the move to renting:
    // commercial space is quoted that way whether it is bought or leased.
    return [
      listings,
      renting
        ? { label: "MONTHLY RENT", value: PLACEHOLDER.rent }
        : { label: "TOTAL PRICE", value: PLACEHOLDER.price },
      renting
        ? { label: "RENT / SQ FT", value: PLACEHOLDER.rentRate }
        : { label: "RATE / SQ FT", value: PLACEHOLDER.rate },
      { label: "BUILT-UP AREA", value: PLACEHOLDER.area },
      { label: "FLOOR", value: PLACEHOLDER.floor },
      { label: "FURNISHING", value: PLACEHOLDER.furnishing },
    ];
  }

  if (renting && (!propertyType || RESIDENTIAL.has(propertyType))) {
    return [
      listings,
      { label: "MONTHLY RENT", value: PLACEHOLDER.rent },
      { label: "SECURITY DEPOSIT", value: PLACEHOLDER.deposit },
      { label: "CARPET AREA", value: PLACEHOLDER.area },
      { label: "CONFIGURATION", value: PLACEHOLDER.config },
      { label: "FURNISHING", value: PLACEHOLDER.furnishing },
    ];
  }

  return [
    listings,
    { label: "TOTAL PRICE", value: PLACEHOLDER.price },
    { label: "RATE / SQ FT", value: PLACEHOLDER.rate },
    { label: "CARPET AREA", value: PLACEHOLDER.area },
    { label: "CONFIGURATION", value: PLACEHOLDER.config },
    { label: "POSSESSION", value: PLACEHOLDER.possession },
  ];
}
