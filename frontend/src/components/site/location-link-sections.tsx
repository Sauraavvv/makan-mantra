import Link from "next/link";
import { ArrowRight, Building2, MapPin } from "lucide-react";

export type LocationPropertyPage = {
  slug: string;
  property_type: string | null;
  listing_type: string | null;
};

export type LocationDistrict = {
  name: string;
  slug: string | null;
  cities: { name: string; slug: string | null }[];
};

export type LocationLinkSections = {
  state: string;
  property_pages: LocationPropertyPage[];
  districts: LocationDistrict[];
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  flat: "Flats",
  villa: "Villas",
  plot: "Plots",
  builder_floor: "Builder Floors",
  office_space: "Office Spaces",
  shop: "Shops",
  showroom: "Showrooms",
  pg: "PGs",
};

const LISTING_GROUPS = [
  { value: "sale", label: "For Sale" },
  { value: "rent", label: "For Rent" },
] as const;

function propertyTypeLabel(type: string | null) {
  if (!type) return "Properties";
  return PROPERTY_TYPE_LABELS[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PropertyTypeLinks({
  pages,
  displayName,
}: {
  pages: LocationPropertyPage[];
  displayName: string;
}) {
  const groups = LISTING_GROUPS.map((group) => ({
    ...group,
    items: pages.filter((page) => page.listing_type === group.value),
  })).filter((group) => group.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold md:text-3xl">Property Types in {displayName}</h2>
        <p className="mt-1 text-muted-foreground">
          Browse every property type we cover across {displayName}.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {groups.map((group) => (
          <div key={group.value} className="rounded-xl border border-border bg-secondary/40 p-5">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </h3>

            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {group.items.map((page) => (
                <li key={page.slug}>
                  <Link
                    href={`/${page.slug}`}
                    className="group flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-secondary"
                  >
                    <span className="flex items-center gap-2">
                      <Building2 className="size-4 text-primary" strokeWidth={1.8} />
                      {propertyTypeLabel(page.property_type)}
                    </span>
                    <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DistrictCityLinks({
  districts,
  displayName,
}: {
  districts: LocationDistrict[];
  displayName: string;
}) {
  if (districts.length === 0) return null;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold md:text-3xl">Districts &amp; Cities in {displayName}</h2>
        <p className="mt-1 text-muted-foreground">
          Explore {districts.length} districts and the cities that fall under them.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {districts.map((district) => (
          <div
            key={district.name}
            className="rounded-xl border border-border bg-secondary/40 p-4 transition-colors hover:border-primary/30"
          >
            {district.slug ? (
              <Link
                href={`/${district.slug}`}
                className="group flex items-center gap-2 text-sm font-bold text-foreground transition-colors hover:text-primary"
              >
                <MapPin className="size-4 shrink-0 text-primary" strokeWidth={1.8} />
                {district.name}
                <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ) : (
              <span className="flex items-center gap-2 text-sm font-bold">
                <MapPin className="size-4 shrink-0 text-primary" strokeWidth={1.8} />
                {district.name}
              </span>
            )}

            {district.cities.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {district.cities.map((city) =>
                  city.slug ? (
                    <li key={city.name}>
                      <Link
                        href={`/${city.slug}`}
                        className="inline-flex rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                      >
                        {city.name}
                      </Link>
                    </li>
                  ) : (
                    <li
                      key={city.name}
                      className="inline-flex rounded-full bg-background px-3 py-1 text-xs text-muted-foreground"
                    >
                      {city.name}
                    </li>
                  ),
                )}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
