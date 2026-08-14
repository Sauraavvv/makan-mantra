"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Clock3,
  Heart,
  Images,
  MapPin,
  Scaling,
  Search,
  type LucideIcon,
} from "lucide-react";

import { useRecentProperties, type RecentPropertyItem } from "@/context/recent-properties-context";
import { useSearchHistory } from "@/context/search-history-context";
import { useSaved, type SavedItem } from "@/context/saved-context";

type PropertyItem = RecentPropertyItem | SavedItem;

export type DashboardPostedProperty = {
  pid: string | null;
  status: string;
  propertyType: string;
  listingType: string;
  details: string | null;
  image: string;
  mediaCount: number;
  createdAt: string | null;
};

const POSTED_DATE_FORMAT = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

function ActivitySection({
  title,
  subtitle,
  icon: Icon,
  iconClassName,
  actionClassName = "text-primary hover:text-primary/80",
  action,
  children,
}: {
  title: string;
  subtitle: string;
  /** Optional: the property sections run without one, on the title alone. */
  icon?: LucideIcon;
  iconClassName?: string;
  actionClassName?: string;
  action: { label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-border bg-card px-4 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:px-6 sm:py-6">
      <header className="mb-5 flex min-w-0 items-center gap-4 sm:mb-6">
        {Icon && (
          <span className={`grid size-14 shrink-0 place-items-center rounded-xl ${iconClassName}`}>
            <Icon className="size-7" strokeWidth={1.8} />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h2 className="text-[19px] font-bold leading-tight text-foreground sm:text-[21px]">
            {title}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-[13px]">{subtitle}</p>
        </div>

        <Link
          href={action.href}
          className={`inline-flex shrink-0 items-center gap-2 text-xs font-semibold transition-colors sm:text-sm ${actionClassName}`}
        >
          <span className="hidden sm:inline">{action.label}</span>
          <ArrowRight className="size-4" strokeWidth={1.8} />
        </Link>
      </header>

      {children}
    </section>
  );
}

function PropertyActivityCard({
  item,
  shortlisted,
  onRemove,
}: {
  item: PropertyItem;
  shortlisted?: boolean;
  onRemove?: () => void;
}) {
  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-border bg-card">
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {/* Recent history can contain both local assets and remote listing images. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.image || "/hero-home.jpg"} alt="" className="h-full w-full object-cover" />
        {shortlisted && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${item.title} from shortlist`}
            className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-card/95 text-saffron shadow-sm"
          >
            <Heart className="size-4 fill-saffron" strokeWidth={1.8} />
          </button>
        )}
      </div>
      <div className="p-3">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <h3 className="line-clamp-2 min-w-0 flex-1 text-[13px] font-bold leading-[18px] text-foreground">
            {item.title}
          </h3>
          <p className="shrink-0 text-xs font-bold text-saffron">{item.price}</p>
        </div>
        <p className="mt-1.5 flex items-center gap-1 truncate text-[10px] text-muted-foreground">
          <MapPin className="size-3 shrink-0" strokeWidth={1.8} />
          {[item.locality, item.city].filter(Boolean).join(", ")}
        </p>
        <div className="mt-2 flex min-w-0 items-center gap-3 border-t border-border pt-2 text-[10px] text-muted-foreground">
          {item.config && <span className="truncate">{item.config}</span>}
          {item.area && (
            <span className="flex shrink-0 items-center gap-1">
              <Scaling className="size-3" strokeWidth={1.8} />
              {item.area}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function PostedPropertyCard({ property }: { property: DashboardPostedProperty }) {
  const isSold = property.status === "sold";

  return (
    <Link
      href="/dashboard/properties"
      className="group min-w-0 overflow-hidden rounded-lg border border-border bg-background transition-colors hover:border-[#9ed4d5] hover:bg-[#fbfefe]"
    >
      <div className="relative aspect-[16/8] overflow-hidden bg-[#eef7f7]">
        {property.image ? (
          // User submissions may contain Cloudinary URLs that are not in Next's image allowlist.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={property.image}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <span className="grid h-full w-full place-items-center text-[#0f8b8d]">
            <Building2 className="size-9" strokeWidth={1.5} />
          </span>
        )}

        <span
          className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold ${
            isSold
              ? "bg-[#e8f7f3] text-[#08755f]"
              : "bg-[#fff1e9] text-[#c44d16]"
          }`}
        >
          {isSold ? "Sold out" : "With our team"}
        </span>
      </div>

      <div className="p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-foreground">{property.propertyType}</h3>
            <p className="mt-0.5 text-xs font-semibold text-[#0f8b8d]">{property.listingType}</p>
          </div>
          {property.pid && (
            <span className="shrink-0 font-mono text-[10px] font-bold text-muted-foreground">
              {property.pid}
            </span>
          )}
        </div>

        {property.details && (
          <p className="mt-2 line-clamp-2 min-h-8 text-xs leading-4 text-muted-foreground">
            {property.details}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-[10px] text-muted-foreground">
          {property.createdAt && (
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5" strokeWidth={1.8} />
              {POSTED_DATE_FORMAT.format(new Date(property.createdAt))}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Images className="size-3.5" strokeWidth={1.8} />
            {property.mediaCount} {property.mediaCount === 1 ? "file" : "files"}
          </span>
        </div>
      </div>
    </Link>
  );
}

function LoadingRow() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-[220px] animate-pulse rounded-lg border border-border bg-muted/40"
        />
      ))}
    </div>
  );
}

function EmptyActivity({
  title,
  description,
  accent,
}: {
  title: string;
  description: string;
  /** `navy` is the theme's own primary; `orange` stays the shortlist accent. */
  accent: "navy" | "orange";
}) {
  const isNavy = accent === "navy";

  return (
    <div
      className={`grid min-h-[150px] place-items-center rounded-lg border border-dashed px-5 py-6 text-center ${
        isNavy ? "border-primary/25 bg-primary/[0.03]" : "border-[#ffd0bb] bg-[#fffdfb]"
      }`}
    >
      <div>
        <p className="text-[15px] font-bold text-foreground sm:text-base">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{description}</p>
        <Link
          href="/"
          className={`mt-5 inline-flex h-10 items-center justify-center rounded-lg px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90 ${
            isNavy ? "bg-primary" : "bg-[#ff6422]"
          }`}
        >
          Browse properties
        </Link>
      </div>
    </div>
  );
}

export function DashboardPropertyActivity({
  postedProperties,
}: {
  postedProperties: DashboardPostedProperty[];
}) {
  const searches = useSearchHistory();
  const recent = useRecentProperties();
  const saved = useSaved();
  const searchItems = searches.items.slice(0, 4);
  const recentItems = recent.items.slice(0, 3);
  const savedItems = saved.items.slice(0, 3);

  return (
    <div className="space-y-6">
      {postedProperties.length > 0 && (
        <ActivitySection
          title="My Properties"
          subtitle="Your latest property submissions"
          icon={Building2}
          iconClassName="bg-[#eaf7f7] text-[#0f8b8d]"
          actionClassName="text-[#0f8b8d] hover:text-[#087274]"
          action={{ label: "Manage all", href: "/dashboard/properties" }}
        >
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {postedProperties.map((property, index) => (
              <PostedPropertyCard key={property.pid ?? index} property={property} />
            ))}
          </div>
        </ActivitySection>
      )}

      <ActivitySection
        title="Recent Searches"
        subtitle="Quick access to your latest searches"
        action={{ label: "View all", href: "/dashboard/recent-searches" }}
      >
        {!searches.loaded ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-[76px] animate-pulse rounded-lg border border-border bg-muted/40"
              />
            ))}
          </div>
        ) : searchItems.length > 0 ? (
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {searchItems.map((search) => (
              <Link
                key={search.id}
                href={`/?q=${encodeURIComponent(search.query || search.label)}`}
                className="flex h-[76px] min-w-0 items-center gap-3 rounded-lg border border-border bg-background px-3 shadow-[0_4px_14px_rgba(15,23,42,0.05)] transition-colors hover:border-primary/30 hover:bg-primary/[0.03]"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Search className="size-5" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate text-xs font-bold text-foreground"
                    title={search.label}
                  >
                    {search.label}
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                    {[search.tab, search.category].filter(Boolean).join("  /  ")}
                  </span>
                </span>
                <Clock3 className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.7} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-primary/25 bg-primary/[0.03] px-6 py-6 text-center">
            <p className="text-sm font-bold text-foreground">No recent searches</p>
            <Link
              href="/"
              className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline"
            >
              Browse properties
            </Link>
          </div>
        )}
      </ActivitySection>

      <ActivitySection
        title="Recently Viewed Properties"
        subtitle="Continue where you left off"
        actionClassName="text-primary hover:text-primary/80"
        action={{ label: "Browse properties", href: "/" }}
      >
        {!recent.loaded ? (
          <LoadingRow />
        ) : recentItems.length > 0 ? (
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentItems.map((item) => (
              <PropertyActivityCard key={item.propertyId} item={item} />
            ))}
          </div>
        ) : (
          <EmptyActivity
            title="No recently viewed properties"
            description="Properties you open or interact with will appear here."
            accent="navy"
          />
        )}
      </ActivitySection>

      {postedProperties.length === 0 && (
        <ActivitySection
          title="Shortlisted Properties"
          subtitle="Save your favourite properties"
          actionClassName="text-[#ff6422] hover:text-[#e74f10]"
          action={{ label: "View all", href: "/dashboard/saved" }}
        >
          {!saved.loaded ? (
            <LoadingRow />
          ) : savedItems.length > 0 ? (
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {savedItems.map((item) => (
                <PropertyActivityCard
                  key={item.propertyId}
                  item={item}
                  shortlisted
                  onRemove={() => {
                    void saved.toggle(item.propertyId, item);
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyActivity
              title="No shortlisted properties"
              description="Save properties to compare them later."
              accent="orange"
            />
          )}
        </ActivitySection>
      )}
    </div>
  );
}
