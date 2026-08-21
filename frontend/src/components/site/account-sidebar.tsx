"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Eye, Heart, Search } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useRecentProperties,
  type RecentPropertyItem,
} from "@/context/recent-properties-context";
import { useSaved, type SavedItem } from "@/context/saved-context";
import {
  useSearchHistory,
  type SearchHistoryItem,
} from "@/context/search-history-context";
import { useSession, type SessionUser } from "@/context/session-context";
import { openAuthModal } from "@/lib/auth-modal";
import { generateSlug } from "@/lib/utils/slug";

function initials(name: string, email: string) {
  const source = name?.trim() || email || "";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (source[0] || "?").toUpperCase();
}

function displayPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `+91-${digits}` : phone;
}

type ActivityKey = "listings" | "searches" | "viewed" | "saved";

type ListingPreview = {
  pid: string;
  propertyType: string;
  listingType: string;
  status: string;
  image: string;
};

/**
 * The account panel, opened either from the header's avatar or from the home
 * page's activity card.
 *
 * `user` of null is a guest, and the same panel serves them: the counts are
 * real — built on this device and handed to the account when they sign in — but
 * every row that leads into the dashboard is inert, because the dashboard asks
 * for a sign-in and a row that only bounces them there is a row that lied. The
 * one thing that does ask them to sign in is the button that says so.
 */
export function AccountSidebar({
  user,
  open,
  onOpenChange,
}: {
  user: SessionUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { signOut } = useSession();
  const searches = useSearchHistory();
  const viewed = useRecentProperties();
  const saved = useSaved();
  const [selectedActivity, setSelectedActivity] = useState<ActivityKey>("searches");
  const [listingCountResult, setListingCountResult] = useState<{
    email: string;
    count: number;
    items: ListingPreview[];
  } | null>(null);
  const listingCount =
    listingCountResult && listingCountResult.email === user?.email
      ? listingCountResult.count
      : null;
  const listingItems =
    listingCountResult && listingCountResult.email === user?.email
      ? listingCountResult.items
      : [];

  useEffect(() => {
    if (!user || !open) return;

    let cancelled = false;
    const email = user.email;
    void (async () => {
      try {
        const response = await fetch("/api/my-properties", { cache: "no-store" });
        const data = (await response.json()) as {
          count?: number;
          items?: ListingPreview[];
        };
        if (!cancelled && response.ok) {
          setListingCountResult({
            email,
            count: data.count ?? 0,
            items: data.items ?? [],
          });
        }
      } catch {
        // Keep the count unsettled if the account read briefly fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, user]);

  const close = () => onOpenChange(false);

  const activityLinks = [
    // A guest has no listings of their own to count or open.
    ...(
      user
        ? [{
            key: "listings" as const,
            href: "/dashboard/properties",
            label: "My Listings",
            count: listingCount,
            icon: Building2,
            emptyTitle: "You have 0 listings for now",
            emptyAction: "List now",
            emptyHref: "/post-property",
          }]
        : []
    ),
    {
      key: "searches" as const,
      href: "/dashboard/recent-searches",
      label: "Recent Searches",
      count: searches.loaded ? searches.items.length : null,
      icon: Search,
      emptyTitle: "No recent searches yet",
      emptyAction: "Start new search",
      emptyHref: "/",
    },
    {
      key: "viewed" as const,
      href: "/dashboard/recently-viewed",
      label: "Viewed Properties",
      count: viewed.loaded ? viewed.items.length : null,
      icon: Eye,
      emptyTitle: "No viewed properties yet",
      emptyAction: "Browse properties",
      emptyHref: "/",
    },
    {
      key: "saved" as const,
      href: "/dashboard/saved",
      label: "Shortlisted Properties",
      count: saved.loaded ? saved.ids.length : null,
      icon: Heart,
      emptyTitle: "No shortlisted properties yet",
      emptyAction: "Browse properties",
      emptyHref: "/",
    },
  ];
  const activeActivity = activityLinks.find((item) => item.key === selectedActivity) ?? null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="gap-0 data-[side=right]:w-[368px] data-[side=right]:max-w-[90vw] data-[side=right]:border-l-0 data-[side=right]:sm:max-w-[368px]"
      >
        <SheetHeader className="border-b border-white/10 bg-[#0A2036] px-5 py-5">
          <SheetTitle className="sr-only">Your account</SheetTitle>
          <SheetDescription className="sr-only">
            Open your dashboard and property activity.
          </SheetDescription>

          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-saffron text-base font-bold text-saffron-foreground">
                {user?.profileImageUrl ? (
                  <Image
                    src={user.profileImageUrl}
                    alt={`${user.name || "User"} profile`}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : user ? (
                  initials(user.name, user.email)
                ) : (
                  "G"
                )}
              </div>

              <div className="min-w-0">
                <p className="truncate text-base font-bold text-white">
                  {user ? user.name || "Your account" : "Guest user"}
                </p>
                {user && (
                  <>
                    <p className="mt-0.5 truncate text-xs text-white/65">{user.email}</p>
                    {user.phone && (
                      <p className="mt-0.5 truncate text-xs text-white/65">
                        {displayPhone(user.phone)}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
            {user && (
              <Link
                href="/dashboard/profile"
                onClick={close}
                className="shrink-0 text-xs font-semibold text-white/70 transition-colors hover:text-white"
              >
                Edit
              </Link>
            )}
          </div>
        </SheetHeader>

        <nav aria-label="Account navigation" className="flex-1 overflow-y-auto px-4 py-4">
          {!user && (
            <button
              type="button"
              onClick={() => {
                close();
                openAuthModal("login");
              }}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-[#0A2036] px-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#12345d]"
            >
              Login / Sign up
            </button>
          )}

          <div className={user ? "" : "mt-6"}>
            <p className="px-1 text-base font-bold text-foreground">My Activity</p>
            <ul className="mt-3 grid grid-cols-4 gap-1.5">
              {activityLinks.map(({ key, href, label, count, icon: Icon }) => {
                const selected = selectedActivity === key;
                const row = (
                  <span
                    className={`relative flex h-[98px] flex-col items-center justify-center rounded-xl border px-1 py-2 text-center transition-colors ${
                      selected
                        ? "border-[#2563EB] bg-[#EFF6FF]"
                        : "border-[#C9D8EE] bg-background hover:border-[#2563EB] hover:bg-[#EFF6FF]"
                    }`}
                  >
                    <Icon className="size-5 text-[#2563EB]" strokeWidth={1.8} />
                    <span className="mt-1.5 flex min-h-8 items-center text-[10px] font-medium leading-4 text-foreground">
                      {label}
                    </span>
                    <span className="mt-1 min-w-7 rounded-full bg-[#DBEAFE] px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-[#1D4ED8]">
                      {count ?? "—"}
                    </span>
                    {selected && (
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-2 left-1/2 h-0.5 w-9 -translate-x-1/2 rounded-full bg-[#2563EB]"
                      />
                    )}
                  </span>
                );

                return (
                  <li key={href}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedActivity(key)}
                      className="block w-full"
                    >
                      {row}
                    </button>
                  </li>
                );
              })}
            </ul>

            {activeActivity && (
              <div
                className={`mt-5 flex h-[296px] flex-col rounded-xl bg-[#F4F7FC] ${
                  activeActivity.count !== null && activeActivity.count > 0
                    ? "px-3 py-3 text-left"
                    : "items-center justify-center px-4 py-6 text-center"
                }`}
              >
                {activeActivity.count === null ? (
                  <>
                    <div className="grid size-12 place-items-center rounded-full bg-[#DBEAFE] text-[#2563EB]">
                      <activeActivity.icon className="size-6" strokeWidth={1.5} />
                    </div>
                    <p className="mt-2.5 text-xs font-medium text-muted-foreground">
                      Loading activity...
                    </p>
                  </>
                ) : activeActivity.count === 0 ? (
                  <>
                    <div className="grid size-12 place-items-center rounded-full bg-[#DBEAFE] text-[#2563EB]">
                      <activeActivity.icon className="size-6" strokeWidth={1.5} />
                    </div>
                    <p className="mt-2.5 text-xs font-medium text-muted-foreground">
                      {activeActivity.emptyTitle}
                    </p>
                    {user || activeActivity.emptyHref === "/" ? (
                      <Link
                        href={activeActivity.emptyHref}
                        onClick={close}
                        className="mt-3 inline-flex h-8 items-center justify-center rounded-lg bg-[#DBEAFE] px-4 text-xs font-semibold text-[#3B82F6] transition-colors hover:bg-[#BFDBFE]"
                      >
                        {activeActivity.emptyAction}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          close();
                          openAuthModal("login");
                        }}
                        className="mt-3 inline-flex h-8 items-center justify-center rounded-lg bg-[#DBEAFE] px-4 text-xs font-semibold text-[#3B82F6] transition-colors hover:bg-[#BFDBFE]"
                      >
                        Login to view
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex min-h-0 w-full flex-1 flex-col">
                    <div className="min-h-0 flex-1 overflow-hidden">
                      {activeActivity.key === "listings" && (
                        <ListingPreviewList items={listingItems} onNavigate={close} />
                      )}
                      {activeActivity.key === "searches" && (
                        <SearchPreviewList items={searches.items} onNavigate={close} />
                      )}
                      {activeActivity.key === "viewed" && (
                        <PropertyPreviewList items={viewed.items} onNavigate={close} />
                      )}
                      {activeActivity.key === "saved" && (
                        <PropertyPreviewList items={saved.items} onNavigate={close} />
                      )}
                    </div>
                    {user ? (
                      <Link
                        href={activeActivity.href}
                        onClick={close}
                        className="mt-2 flex h-8 shrink-0 items-center justify-center rounded-lg bg-[#DBEAFE] px-4 text-xs font-semibold text-[#3B82F6] transition-colors hover:bg-[#BFDBFE]"
                      >
                        View all
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          close();
                          openAuthModal("login");
                        }}
                        className="mt-2 flex h-8 shrink-0 items-center justify-center rounded-lg bg-[#DBEAFE] px-4 text-xs font-semibold text-[#3B82F6] transition-colors hover:bg-[#BFDBFE]"
                      >
                        Login to view all
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <Link
            href="/post-property"
            onClick={close}
            className="group mt-4 block overflow-hidden rounded-lg border border-[#ffe0d1] bg-[#fff7f2] p-3 transition-colors hover:border-[#ffc3a7]"
          >
            <span className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3">
              <span className="relative h-[100px] overflow-hidden rounded-md bg-[#fff1e9]">
                <Image
                  src="/post-property-sidebar.png"
                  alt="Modern home ready to be listed"
                  fill
                  sizes="96px"
                  className="object-cover object-center"
                />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-bold leading-6 text-foreground">
                  Post Your <span className="text-saffron">Property</span>
                </span>
                <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                  Reach thousands of genuine buyers and tenants.
                </span>
              </span>
            </span>
            <span className="mt-3 flex h-10 w-full items-center justify-center rounded-lg bg-saffron text-sm font-semibold text-saffron-foreground transition-colors group-hover:bg-saffron/90">
              Post Property
            </span>
          </Link>
        </nav>

        {user && (
          <SheetFooter className="border-t border-border p-2.5">
            <button
              type="button"
              onClick={async () => {
                close();
                await signOut();
                router.push("/");
                router.refresh();
              }}
              className="flex h-10 w-full items-center rounded-lg px-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
            >
              Logout
            </button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ListingPreviewList({
  items,
  onNavigate,
}: {
  items: ListingPreview[];
  onNavigate: () => void;
}) {
  return (
    <ul className="grid grid-cols-2 gap-2">
      {items.slice(0, 4).map((item, index) => (
        <li key={item.pid || `${item.propertyType}-${index}`}>
          <Link
            href="/dashboard/properties"
            onClick={onNavigate}
            className="block h-[112px] overflow-hidden rounded-lg border border-[#DCE5F2] bg-background transition-colors hover:border-[#B8CEEA] hover:bg-[#EFF6FF]"
          >
            <span className="relative grid h-14 w-full place-items-center overflow-hidden bg-[#DBEAFE] text-[#3B82F6]">
              {item.image ? (
                <Image src={item.image} alt="" fill sizes="150px" className="object-cover" />
              ) : (
                <Building2 className="size-5" strokeWidth={1.5} />
              )}
            </span>
            <span className="block min-w-0 px-2 py-1.5">
              <span className="block truncate text-[10px] font-medium text-muted-foreground">
                {item.propertyType} · {item.listingType}
              </span>
              <span className="mt-0.5 block truncate text-[9px] capitalize text-muted-foreground/70">
                {item.status.replaceAll("_", " ")}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SearchPreviewList({
  items,
  onNavigate,
}: {
  items: SearchHistoryItem[];
  onNavigate: () => void;
}) {
  return (
    <ul className="space-y-2">
      {items.slice(0, 4).map((item) => (
        <li key={item.id}>
          <Link
            href={`/?q=${encodeURIComponent(item.query.trim() || item.label)}`}
            onClick={onNavigate}
            className="flex h-[52px] items-center gap-2.5 rounded-lg border border-[#DCE5F2] bg-background px-2.5 transition-colors hover:bg-[#EFF6FF]"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-[#DBEAFE] text-[#3B82F6]">
              <Search className="size-4" strokeWidth={1.6} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-muted-foreground">
                {item.label}
              </span>
              {(item.tab || item.category) && (
                <span className="mt-0.5 block truncate text-[10px] text-muted-foreground/70">
                  {[item.tab, item.category].filter(Boolean).join(" · ")}
                </span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function PropertyPreviewList({
  items,
  onNavigate,
}: {
  items: Array<RecentPropertyItem | SavedItem>;
  onNavigate: () => void;
}) {
  return (
    <ul className="grid grid-cols-2 gap-2">
      {items.slice(0, 4).map((item) => (
        <li key={item.propertyId}>
          <Link
            href={`/property/${item.propertyId}/${generateSlug(item.title)}`}
            onClick={onNavigate}
            className="block h-[112px] overflow-hidden rounded-lg border border-[#DCE5F2] bg-background transition-colors hover:border-[#B8CEEA] hover:bg-[#EFF6FF]"
          >
            <span className="relative block h-14 w-full overflow-hidden bg-[#DBEAFE]">
              {/* Activity snapshots may carry external image hosts from DB or local storage. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image || "/hero-home.jpg"}
                alt=""
                loading="lazy"
                className="size-full object-cover"
              />
            </span>
            <span className="block min-w-0 px-2 py-1.5">
              <span className="block truncate text-[10px] font-medium text-muted-foreground">
                {item.title}
              </span>
              <span className="mt-0.5 block truncate text-[9px] text-muted-foreground/70">
                {[item.price, item.locality || item.city].filter(Boolean).join(" · ")}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
