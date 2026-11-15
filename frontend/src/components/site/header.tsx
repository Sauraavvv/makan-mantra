"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowRight, BedDouble, ChevronDown, ChevronRight, Clapperboard, Home, Loader2, LocateFixed, LockKeyhole, Mail, MailCheck, MapPin, Menu, Phone, Plus, Search, ShieldCheck, UserRound, X } from "lucide-react";
import { loginAction, registerModalAction } from "@/app/actions/auth";
import { ResendSetPasswordForm } from "@/components/auth/resend-set-password-form";
import { HeaderSearch } from "@/components/site/header-search";
import { UserMenu } from "@/components/site/user-menu";
import { ShortlistMenu } from "@/components/site/shortlist-menu";
import { useSession } from "@/context/session-context";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLocation } from "@/context/location-context";
import { DotPattern } from "@/registry/magicui/dot-pattern";
import { subscribeAuthModal } from "@/lib/auth-modal";
import { stateSlug } from "@/lib/state-routes";
import { stateCardImage } from "@/lib/state-images";
import { STATES } from "@/lib/states";


const NAV = [
  { label: "Buy", icon: Home },
  { label: "Rent", icon: BedDouble },
];

const TOP_STATES = [
  "Maharashtra", "Kerala", "Karnataka", "Haryana", "Telangana",
  "Tamil Nadu", "Gujarat", "Uttar Pradesh", "Rajasthan",
];

/**
 * India's largest property markets, spelled the way the location pages spell
 * them — the sheet has "New Delhi" rather than "Delhi", which is a city record;
 * Delhi the state is the one the picker above deals in. Likewise "Gurugram",
 * not the "Gurgaon" people still type.
 *
 * Twelve of them, which is exactly four rows of the three-wide grid below.
 */
const TOP_CITIES = [
  "Mumbai", "New Delhi", "Bangalore", "Hyderabad",
  "Pune", "Chennai", "Kolkata", "Gurugram",
  "Noida", "Ahmedabad", "Jaipur", "Lucknow",
];

/** The picker's first column, `w-[…19rem]` below, in the pixels it measures in. */
const PANEL_PX = 304;
/** Its second column, `w-52`. */
const ALL_CITIES_PX = 208;
/** Air left between the panel and the window edge before the side is flipped. */
const VIEWPORT_MARGIN_PX = 8;

/** The picker lists every state A–Z; TOP_STATES only drives the shortcut chips. */
const STATES_ALPHABETICAL = [...STATES].sort((a, b) => a.localeCompare(b));

function StateCard({
  state,
  selected,
  onClick,
}: {
  state: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      /*
       * Ruled apart rather than spaced apart: the tiles sit flush and a hairline
       * runs the full height of a cell down its right edge and the full width
       * along its foot, so the grid closes into a table of cells rather than
       * floating tick marks between them.
       *
       * `nth-child(4n)` is the last tile of a row at four columns; its right
       * rule would hang on the panel's inner edge with nothing beyond it.
       */
      className={`group relative flex flex-col items-center p-1 text-center
        after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-black/10 after:content-['']
        before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-black/10 before:content-['']
        [&:nth-child(4n)]:after:hidden ${selected ? "ring-2 ring-inset ring-saffron/50" : ""}`}
    >
      {/* Grey until it is pointed at, so the grid reads as one field of shapes
          and the state under the cursor is the only one wearing colour. The one
          already picked keeps its colour — it is not waiting to be found.

          The colour arriving is the whole of the hover: the tile itself does
          not light up. Doing both said the same thing twice, and the shading
          was the half that drowned out the drawing. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={stateCardImage(state)}
        // The name is set below rather than read off the picture, so the button
        // is already labelled and this would only say it twice.
        alt=""
        width={150}
        height={150}
        // A set height, not one derived from the tile's width: the row height is
        // what the grid below is measured in, and deriving it from the width
        // made that measurement drift with the panel's border and padding.
        className={`h-14 w-full rounded-lg object-contain transition-[filter] duration-150 group-hover:grayscale-0 ${
          selected ? "grayscale-0" : "grayscale"
        }`}
      />
      {/* Type, not pixels. The names used to be drawn into the artwork, which
          meant each one was set at whatever size its tile had been scaled to —
          "Chandigarh" twice the size of "Kerala" two tiles over. Two lines are
          reserved whether or not the second is used, so every row is the same
          height and the grid's measurement below holds. */}
      <span
        className={`mt-1 line-clamp-2 h-[26px] w-full text-[10px] font-medium leading-[13px] ${
          selected ? "text-saffron" : "text-foreground"
        }`}
      >
        {state}
      </span>
    </button>
  );
}

/**
 * `slug` is the plural the URLs are spelled with, `type` the singular the
 * database stores. Both are needed: the mobile nav still builds its links from
 * the slug, while the panel on desktop looks its links up by type.
 */
const PROPERTY_GROUPS = {
  sale: [
    { title: "Flats", slug: "flats", label: "Flats", type: "flat" },
    { title: "Villas", slug: "villas", label: "Villas", type: "villa" },
    { title: "Builder Floors", slug: "builder-floors", label: "Builder Floors", type: "builder_floor" },
    { title: "Plots", slug: "plots", label: "Plots", type: "plot" },
    { title: "Office Spaces", slug: "office-spaces", label: "Office Spaces", type: "office_space" },
    { title: "Shops", slug: "shops", label: "Shops", type: "shop" },
    { title: "Showrooms", slug: "showrooms", label: "Showrooms", type: "showroom" },
  ],
  rent: [
    { title: "Flats", slug: "flats", label: "Flats", type: "flat" },
    { title: "Villas", slug: "villas", label: "Villas", type: "villa" },
    { title: "Builder Floors", slug: "builder-floors", label: "Builder Floors", type: "builder_floor" },
    { title: "PGs", slug: "pgs", label: "PGs", type: "pg" },
    { title: "Office Spaces", slug: "office-spaces", label: "Office Spaces", type: "office_space" },
    { title: "Shops", slug: "shops", label: "Shops", type: "shop" },
    { title: "Showrooms", slug: "showrooms", label: "Showrooms", type: "showroom" },
  ],
};

type ListingType = keyof typeof PROPERTY_GROUPS;
type AuthMode = "login" | "register" | "verify";

type HeaderProps = {
  showSearchBar?: boolean;
  searchPlaceholder?: string;
  /** Lays the header over the page hero instead of taking space above it. */
  overlay?: boolean;
  /** Background used in overlay mode. */
  overlayTone?: "tint" | "solid";
  /** Hides the Buy/Rent nav and the "Post Property" CTA (used on the post-property page itself). */
  minimal?: boolean;
  /** Bar colour outside overlay mode: brand navy by default, black on the Explore pages. */
  tone?: "navy" | "black";
};

/**
 * The page for a property type in a place, under one listing type.
 *
 * Works for a city as well as a state: both slug the same way, which was
 * checked against the database across 168 city combinations with no mismatch.
 * Districts do not — they carry their state as a suffix — so this is not for
 * them.
 */
function statePageHref(place: string, propertySlug: string, listingType: ListingType) {
  return `/${propertySlug}-for-${listingType}-in-${stateSlug(place)}`;
}

export function Header({
  showSearchBar = false,
  searchPlaceholder = "Search city, locality or project...",
  overlay = false,
  overlayTone = "tint",
  minimal = false,
  tone = "navy",
}: HeaderProps = {}) {
  const { meta, setStateByName, requestPreciseLocation, locating } = useLocation();
  const { user: sessionUser, loaded: sessionLoaded } = useSession();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [showSearch, setShowSearch] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [authInitial, setAuthInitial] = useState<{ mode: AuthMode; email?: string; devOtp?: string }>({ mode: "login" });
  const [search, setSearch] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [citiesStatus, setCitiesStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [allCitiesOpen, setAllCitiesOpen] = useState(false);
  const [citiesSide, setCitiesSide] = useState<"right" | "left">("right");
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Guards the fetch below without being a dependency of it: a failed attempt
  // clears this so reopening the picker tries again, which a state variable
  // would turn into a retry loop while the panel stayed open.
  const citiesRequested = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = STATES_ALPHABETICAL.filter((s) =>
    s.toLowerCase().includes(search.toLowerCase())
  );
  // The detected (or picked) state leads the grid; "India" means we have none.
  const pickerStates = STATES_ALPHABETICAL.includes(meta.label)
    ? [meta.label, ...STATES_ALPHABETICAL.filter((s) => s !== meta.label)]
    : STATES_ALPHABETICAL;
  const shouldShowSearch = showSearchBar || showSearch;
  const searchTakesHeader = shouldShowSearch && searchExpanded;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    let timeoutId = 0;

    if (auth === "login" || auth === "register" || auth === "verify") {
      timeoutId = window.setTimeout(() => {
        setAuthInitial({
          mode: auth,
          email: params.get("email") || undefined,
          devOtp: params.get("devOtp") || undefined,
        });
        setLoginOpen(true);
      }, 0);

      params.delete("auth");
      params.delete("email");
      params.delete("devOtp");
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", nextUrl);
    }

    return () => window.clearTimeout(timeoutId);
  }, []);

  function closeDropdown() {
    setDropdownOpen(false);
    setAllCitiesOpen(false);
  }

  /**
   * Opens the city column to the right, and to the left when the right is not
   * wide enough to hold it.
   *
   * Right is where it belongs — it is the column being added, and it should
   * appear after the one it belongs to. But the chip sits at the right end of
   * the header, so on a narrow window the second column can run past the edge
   * and put the whole page on a horizontal scrollbar. Measuring the room at the
   * moment it opens costs one layout read and never gets that wrong; guessing a
   * side and living with it does.
   */
  function toggleAllCities() {
    if (allCitiesOpen) {
      setAllCitiesOpen(false);
      return;
    }

    const chip = dropdownRef.current?.getBoundingClientRect();
    // The panel already reaches half its own width past the chip's centre.
    const panelRight = chip ? chip.left + chip.width / 2 + PANEL_PX / 2 : 0;
    const room = chip ? window.innerWidth - panelRight - VIEWPORT_MARGIN_PX : 0;

    setCitiesSide(room >= ALL_CITIES_PX ? "right" : "left");
    setAllCitiesOpen(true);
  }

  function openAuthModal(mode: AuthMode = "login") {
    setAuthInitial({ mode });
    setLoginOpen(true);
  }

  // Anything on the page can ask for the modal, which the `?auth=` read above
  // cannot serve: that runs once, on mount, and a button on the page the header
  // is already mounted on never gets a second one.
  useEffect(() => subscribeAuthModal((mode) => openAuthModal(mode)), []);

  // Every city we publish a page for, fetched the first time the side panel is
  // asked for rather than on every page load — the seven above it are a
  // constant, so most visitors never need this at all.
  useEffect(() => {
    if (!allCitiesOpen || citiesRequested.current) return;

    citiesRequested.current = true;
    setCitiesStatus("loading");
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/cities");
        if (!res.ok) throw new Error(String(res.status));

        const data = (await res.json()) as { cities?: string[] };
        if (cancelled) return;

        setCities(data.cities ?? []);
        setCitiesStatus("ready");
      } catch {
        if (cancelled) return;

        citiesRequested.current = false;
        setCitiesStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [allCitiesOpen]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        closeDropdown();
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const heroSearch = document.getElementById("hero-search");

    if (!heroSearch) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowSearch(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );

    observer.observe(heroSearch);
    return () => observer.disconnect();
  }, []);

  return (
    <>
    <header
      className={
        overlay
          ? `absolute inset-x-0 top-0 z-40 w-full border-b border-white/10 text-white ${
              overlayTone === "tint" ? "bg-black/35 backdrop-blur-md" : "bg-[#0A2036]"
            }`
          : `sticky top-0 z-40 w-full border-b border-white/10 text-white shadow-lg shadow-black/10 ${
              tone === "black" ? "bg-black" : "bg-[#0A2036]"
            }`
      }
    >
      <div className="flex h-16 w-full items-center gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center text-xl font-bold tracking-tight sm:text-2xl">
          <span>
            Makan <span className="text-saffron">Mantraa</span>
          </span>
        </Link>

        {/* Beside the wordmark on every page. It used to sit here on the home
            page and be re-rendered further down with `ml-auto` everywhere else,
            so Buy and Rent jumped from the left of the bar to the right the
            moment you opened a state page. */}
        {!minimal && !searchTakesHeader && (
          /* `relative` here rather than on each item: both panels are `left-0`,
             and hung off their own word they started at different places — Rent's
             a word further right than Buy's. Anchored to the row instead, the
             two open at the same edge and the panel stops moving as the pointer
             crosses between them. */
          <nav className="relative ml-3 hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <MegaNavItem
                key={item.label}
                label={item.label}
                listingType={item.label === "Rent" ? "rent" : "sale"}
              />
            ))}
          </nav>
        )}

        {/* Location dropdown — home page only */}
        {isHome && !searchTakesHeader && (
        <div
          ref={dropdownRef}
          className={`relative shrink-0 ${isHome ? "order-4 ml-auto" : ""}`}
          onMouseEnter={() => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
            setDropdownOpen(true);
          }}
          onMouseLeave={() => {
            closeTimerRef.current = setTimeout(() => {
              closeDropdown();
              setSearch("");
            }, 150);
          }}
        >
          <button
            onClick={() => { setDropdownOpen((o) => !o); setSearch(""); }}
            className="flex h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            <MapPin className="h-3.5 w-3.5 text-saffron shrink-0" />
            <span className="max-w-[90px] truncate">{meta.label}</span>
            <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {dropdownOpen && (
            /* Hung off the header rather than floating under the chip: 15px
               clears the button's 14px of centring and the header's own 1px
               rule, and with no top border and no top radius the panel reads as
               the navbar continuing downward.

               Whichever side the city column takes, the first column does not
               move: opening right pins the panel's left edge where it already
               was (-9.5rem, which is what -translate-x-1/2 comes to at 19rem),
               and opening left pins its right edge instead (9.5 - 32 =
               -22.5rem). Both leave the states exactly 9.5rem either side of
               the chip. Below `sm` the second column never opens at all. */
            <div
              className={`absolute left-1/2 top-full z-50 mt-[15px] flex -translate-x-1/2 overflow-hidden rounded-b-xl border border-t-0 border-border bg-popover text-foreground shadow-2xl ${
                allCitiesOpen && citiesSide === "left" ? "flex-row-reverse sm:-translate-x-[22.5rem]" : ""
              } ${allCitiesOpen && citiesSide === "right" ? "sm:-translate-x-[9.5rem]" : ""}`}
            >
            <div className="w-[min(calc(100vw-2rem),19rem)] shrink-0">
              {/* Search */}
              <div className="bg-muted p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search state or UT…"
                    className="h-9 w-full rounded-lg bg-background pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {/* Detect + Reset.
                  The state being shown is not named here any more: the chip
                  this panel hangs off already carries it, and the row is worth
                  more as two things to do than as a label repeating what is an
                  inch above it. */}
              <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
                {/* The IP already put the visitor in a state; this is for anyone
                    who wants the locality-accurate one, and it is the only place
                    the browser's permission prompt can come from. */}
                <button
                  onClick={async () => {
                    await requestPreciseLocation();
                    closeDropdown();
                  }}
                  disabled={locating}
                  className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-foreground transition-colors hover:text-primary disabled:opacity-60"
                >
                  {locating ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                  ) : (
                    <LocateFixed className="h-3.5 w-3.5 shrink-0 text-primary" />
                  )}
                  <span className="truncate">
                    {locating ? "Finding your location…" : "Detect my location"}
                  </span>
                </button>
                {/* Back to the all-India view, which is a pick like any other —
                    detection will not quietly undo it on the next visit. */}
                <button
                  onClick={() => { setStateByName(null); closeDropdown(); }}
                  className="shrink-0 text-xs font-medium text-primary hover:underline"
                >
                  Reset
                </button>
              </div>

              {search ? (
                /* List mode when searching. Capped at the grid's own height so
                   the panel does not jump as the field is typed into. */
                <div className="max-h-[196px] overflow-y-auto p-1.5">
                  {filtered.map((state) => {
                    const selected = meta.label === state;
                    return (
                      <button
                        key={state}
                        onClick={() => { setStateByName(state); closeDropdown(); }}
                        className={`group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent ${selected ? "bg-saffron/10 font-semibold text-saffron" : "text-foreground"}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={stateCardImage(state)}
                          alt={state}
                          width={36}
                          height={24}
                          className={`h-6 w-9 shrink-0 rounded object-contain transition-[filter] duration-150 group-hover:grayscale-0 ${
                            selected ? "grayscale-0" : "grayscale"
                          }`}
                        />
                        <span>{state}</span>
                      </button>
                    );
                  })}
                  {filtered.length === 0 && (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">No states found</div>
                  )}
                </div>
              ) : (
                /* Grid mode. White, the same ground the icons are drawn on, so
                   a tile ends at its rule rather than at a change of colour. */
                <div className="flex flex-col bg-white">
                  {/* Two whole rows and nothing of the third.
                      A tile is 4px of padding, a 56px icon, a 4px gap, two
                      reserved lines of 13px, and 4px of padding again — 94px,
                      and the rows are flush now that rules divide them. Two
                      rows (188) under 8px of head room is 196.

                      No padding at the foot, deliberately. With it the box ran
                      8px past the second row's rule, and that rule then read as
                      a line floating over a strip of white rather than as the
                      edge the grid stops at. */}
                  <div className="h-[196px] overflow-y-auto p-1 pt-2 pb-0">
                    <div className="grid grid-cols-4">
                      {pickerStates.map((state) => (
                        <StateCard
                          key={state}
                          state={state}
                          selected={meta.label === state}
                          onClick={() => { setStateByName(state); closeDropdown(); }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Ruled underneath only: the grid above already ends on a rule,
                  and a border here too would double it. */}
              <p className="border-b border-border bg-muted px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Top Cities
              </p>
              {/* Three to a row, four rows deep, ruled the way the state grid
                  above is: a hairline down the right of every cell but the
                  last in its row, and along the bottom of every row but the
                  last — which already has the "Other Cities" rule under it,
                  and would otherwise carry two lines a pixel apart.

                  The grid is flush to the panel's edges so those rules run its
                  full width, matching the headings above and below them; the
                  padding that used to sit here moved inside the cells, so the
                  block is the same height it was.

                  Reading only for now — the site's location is a state, so a
                  city here has nothing to set. */}
              <div className="grid grid-cols-3 bg-white">
                {TOP_CITIES.map((city) => (
                  <p
                    key={city}
                    title={city}
                    className="relative truncate px-3 py-2 text-sm text-foreground
                      after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-black/10 after:content-['']
                      before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-black/10 before:content-['']
                      [&:nth-child(3n)]:after:hidden [&:nth-child(n+10)]:before:hidden"
                  >
                    {city}
                  </p>
                ))}
              </div>

              {/* The rest of them, off to the side rather than below: three
                  hundred names in this column would bury the states, and the
                  panel has room to its right that it is not otherwise using. */}
              <button
                onClick={toggleAllCities}
                aria-expanded={allCitiesOpen}
                className="flex w-full items-center justify-between gap-2 border-t border-border bg-muted px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
              >
                Other Cities
                {/* Turns to face the column it opened, so it reads as the way
                    back once there is something to close. */}
                <ChevronRight
                  className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                    allCitiesOpen && citiesSide === "right" ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            {/* Absolutely filled rather than laid out, so its three hundred rows
                do not decide the panel's height — it takes the height the
                column beside it already has, and scrolls inside that. */}
            {allCitiesOpen && (
              <aside
                className={`relative hidden w-52 shrink-0 border-border bg-white sm:block ${
                  citiesSide === "left" ? "border-r" : "border-l"
                }`}
              >
                <div className="absolute inset-0 flex flex-col">
                  <p className="shrink-0 border-b border-border bg-muted px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    All Cities
                  </p>
                  <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
                    {citiesStatus === "ready" && cities.length > 0 ? (
                      cities.map((city) => (
                        <p
                          key={city}
                          title={city}
                          className="truncate rounded-md px-2 py-1.5 text-sm text-foreground"
                        >
                          {city}
                        </p>
                      ))
                    ) : (
                      <p className="px-2 py-2 text-xs text-muted-foreground">
                        {citiesStatus === "error" ? "Couldn't load cities" : "Loading cities…"}
                      </p>
                    )}
                  </div>
                </div>
              </aside>
            )}
          </div>
          )}
        </div>
        )}

        {/* `overflow-hidden` only while collapsed: expanded, the suggestion
            list hangs below the bar and the clip that keeps the box from
            showing at zero width would take the list with it. */}
        <HeaderSearch
          placeholder={searchPlaceholder}
          active={shouldShowSearch}
          onPanelOpenChange={setSearchExpanded}
          className={`hidden transition-all duration-300 md:flex ${
            isHome ? "order-3 flex-1" : "flex-1"
          } ${
            shouldShowSearch
              ? searchTakesHeader
                ? "max-w-none opacity-100"
                : "max-w-xl lg:max-w-2xl opacity-100"
              : "pointer-events-none max-w-0 overflow-hidden opacity-0"
          }`}
        />

        {/* What pushes the actions to the right edge. The home page does not
            need it: its location chip carries an `ml-auto` of its own, and the
            chip only renders there. The search box cannot do this job — it is
            `hidden md:block` and collapses to no width when there is nothing to
            search, so on a phone it would push nothing. */}
        {!isHome && <div className="ml-auto" />}

        {!minimal && (
            <Link
              href="/post-property"
              className={`${isHome ? "order-5" : ""} hidden h-9 shrink-0 items-center gap-1 rounded-full bg-saffron px-4 text-sm font-semibold text-saffron-foreground transition-colors hover:bg-saffron/90 sm:inline-flex`}
            >
              <Plus className="h-4 w-4" /> Post Property{" "}
              <span className="ml-1 rounded bg-white/20 px-1 text-[10px] font-bold">FREE</span>
            </Link>
        )}

        {/* Beside the CTA rather than in the account menu: a shortlist is
            checked far more often than an account is, and a signed-out visitor
            has one too. Shares `order-5` with the button above it, so source
            order settles which comes first. */}
        {/* Property Reels — the full-screen, scroll-through feed. Beside the
            shortlist: both are quick ways back into listings. */}
        <Link
          href="/reels"
          aria-label="Property reels"
          title="Property reels"
          className={`${isHome ? "order-5" : ""} relative grid size-9 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20`}
        >
          <Clapperboard className="size-4" />
        </Link>

        <div className={isHome ? "order-5" : ""}>
          <ShortlistMenu />
        </div>

        {/* Nothing is rendered until the first session read settles, so the
            Login button never flashes for someone who is already signed in. */}
        {sessionLoaded &&
          (sessionUser ? (
            <div className={`${isHome ? "order-6" : ""} hidden md:block`}>
              <UserMenu user={sessionUser} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal("login")}
              className={`${isHome ? "order-6" : ""} hidden h-9 shrink-0 items-center rounded-full border border-white/15 px-4 text-sm font-semibold text-white hover:bg-white/10 md:inline-flex`}
            >
              Login
            </button>
          ))}

        <Sheet>
          <SheetTrigger
            aria-label="Open menu"
            className={`${isHome ? "order-7" : ""} inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-white/30 lg:hidden`}
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle>
                Makan <span className="text-saffron">Mantraa</span>
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 flex flex-col gap-1">
              {sessionUser ? (
                <div className="mb-2 flex items-center gap-3 rounded-md border border-input bg-background px-3 py-2">
                  <UserMenu user={sessionUser} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{sessionUser.name || "Your account"}</p>
                    <p className="truncate text-xs text-muted-foreground">{sessionUser.email}</p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal("login")}
                  className="mb-2 flex w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
                >
                  Login
                </button>
              )}
              {!minimal && (
                <>
                  {NAV.map((item) => (
                    <MobileNavSection
                      key={item.label}
                      label={item.label}
                      icon={item.icon}
                      listingType={item.label === "Rent" ? "rent" : "sale"}
                    />
                  ))}
                  <Link
                    href="/post-property"
                    className="mt-4 inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg bg-saffron text-sm font-medium text-saffron-foreground transition-colors hover:bg-saffron/90"
                  >
                    <Plus className="h-4 w-4" /> Post Property FREE
                  </Link>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
    {loginOpen && (
      <LoginModal
        initialMode={authInitial.mode}
        initialEmail={authInitial.email}
        initialDevOtp={authInitial.devOtp}
        onClose={() => setLoginOpen(false)}
      />
    )}
    </>
  );
}

function LoginModal({
  initialMode,
  initialEmail,
  initialDevOtp,
  onClose,
}: {
  initialMode: AuthMode;
  initialEmail?: string;
  initialDevOtp?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { refresh: refreshSession } = useSession();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [verifyEmail, setVerifyEmail] = useState(initialEmail || "");
  const [devOtp, setDevOtp] = useState(initialDevOtp || "");
  const [emailWarning, setEmailWarning] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [verifyError, setVerifyError] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const otpInputs = useRef<(HTMLInputElement | null)[]>([]);
  const [loginState, loginActionState, loginPending] = useActionState(
    async (_previousState: Awaited<ReturnType<typeof loginAction>>, formData: FormData) => {
      const result = await loginAction(undefined, formData);

      // Signing in lands on the home page now, with the avatar in place of the
      // Login button — so the session has to be re-read before navigating.
      if (result?.success) {
        await refreshSession();
        onClose();
        router.push("/");
      }

      return result;
    },
    undefined,
  );
  const [registerState, registerActionState, registerPending] = useActionState(
    async (_previousState: Awaited<ReturnType<typeof registerModalAction>>, formData: FormData) => {
      const result = await registerModalAction(undefined, formData);
      if (result?.success && result.email) {
        setVerifyEmail(result.email);
        setDevOtp(result.devOtp || "");
        setEmailWarning(result.emailWarning || "");
        setOtp(["", "", "", "", "", ""]);
        setVerifyError("");
        setMode("verify");
      }
      return result;
    },
    undefined,
  );
  const isRegister = mode === "register";
  const isVerify = mode === "verify";
  const activeState = isRegister ? registerState : loginState;

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) otpInputs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, event: React.KeyboardEvent) {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  }

  async function handleOtpSubmit(event: React.FormEvent) {
    event.preventDefault();
    const code = otp.join("");
    if (code.length < 6) return;

    setVerifyError("");
    setVerifyLoading(true);

    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: verifyEmail, otp: code }),
    });
    const data = await res.json();
    setVerifyLoading(false);

    if (!res.ok) {
      setVerifyError(data.error || "Verification failed");
      return;
    }

    // Verifying signs the account in, so it lands on the home page too.
    await refreshSession();
    onClose();
    router.push("/");
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-[2px]">
      <button
        type="button"
        aria-label="Close login"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div className="relative grid max-h-[calc(100vh-3rem)] w-full max-w-5xl overflow-hidden rounded-xl border border-white/20 bg-background text-foreground shadow-2xl lg:grid-cols-[1fr_430px]">
        <button
          type="button"
          aria-label="Close login"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-background/80 text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <section className="relative hidden overflow-hidden bg-[#0A2036] p-10 text-white lg:flex lg:min-h-[560px] lg:flex-col lg:justify-between">
          <DotPattern width={12} height={12} className="[mask-image:radial-gradient(360px_circle_at_center,white,transparent)]" />
          <div className="relative z-10 text-2xl font-bold">
            Makan <span className="text-saffron">Mantraa</span>
          </div>

          <div className="relative z-10 max-w-md">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white/85">
              <ShieldCheck className="h-4 w-4 text-saffron" />
              {isVerify ? "Email verification" : isRegister ? "Verified account access" : "Secure owner and buyer access"}
            </div>
            <h2 className="text-4xl font-bold leading-tight">
              {isVerify
                ? "One quick step to secure your account."
                : isRegister
                  ? "Create an account for your next property move."
                  : "Manage your property journey with confidence."}
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/70">
              {isVerify
                ? "Enter the code sent to your inbox to activate your Makan Mantraa account."
                : isRegister
                  ? "Save searches, post listings, and manage buyer or tenant conversations from one place."
                  : "Sign in to save searches, manage listings, review leads, and continue where you left off."}
            </p>
          </div>

          <p className="relative z-10 text-sm text-white/55">Trusted property access across India.</p>
        </section>

        <section className="overflow-y-auto p-6 sm:p-8 lg:p-10">
          <div className="mb-8 pr-8">
            <p className="mb-2 text-sm font-semibold text-primary">
              {isVerify ? "Check your email" : isRegister ? "Get started" : "Welcome back"}
            </p>
            <h2 className="text-3xl font-bold tracking-tight">
              {isVerify ? "Enter verification code" : isRegister ? "Create your account" : "Sign in to your account"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {isVerify
                ? "We sent a 6-digit code to your email address."
                : isRegister
                  ? "Join Makan Mantraa to manage listings and property searches."
                  : "Access your dashboard, leads, and saved property searches."}
            </p>
          </div>

          {isVerify ? (
            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MailCheck className="h-4 w-4 text-primary" />
                  Verification code sent to
                </div>
                <div className="mt-1 break-all font-semibold">{verifyEmail}</div>
              </div>

              {devOtp && (
                <div className="rounded-lg border border-saffron/30 bg-saffron/10 px-3 py-2 text-sm">
                  <div className="font-semibold text-foreground">Dev testing OTP: {devOtp}</div>
                  {emailWarning && (
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">
                      Email was not sent because Resend is in testing mode.
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { otpInputs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(event) => handleOtpChange(index, event.target.value)}
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    className="h-12 w-11 rounded-lg border border-input bg-background text-center text-lg font-bold outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15"
                  />
                ))}
              </div>

              {verifyError && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {verifyError}
                </div>
              )}

              <button
                type="submit"
                disabled={verifyLoading || otp.join("").length < 6}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {verifyLoading ? "Verifying..." : "Verify email"}
                {!verifyLoading && <ArrowRight className="h-4 w-4" />}
              </button>

              <p className="text-center text-sm text-muted-foreground">
                Wrong email?{" "}
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="font-semibold text-primary hover:underline"
                >
                  Go back
                </button>
              </p>
            </form>
          ) : (
          <>
          <form action={isRegister ? registerActionState : loginActionState} className="space-y-4">
            {isRegister && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Full name</label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    name="name"
                    type="text"
                    required
                    placeholder="Saurav Sharma"
                    className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  name="email"
                  type="email"
                  required
                  // Arriving from an email link (?auth=register&email=…) should not
                  // mean typing the address out again.
                  defaultValue={initialEmail || ""}
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15"
                />
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Mobile number</label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    name="phone"
                    type="tel"
                    required
                    inputMode="numeric"
                    autoComplete="tel"
                    pattern="(\+91[\s-]?)?[6-9][0-9]{9}"
                    title="Enter a 10-digit Indian mobile number"
                    placeholder="9876543210"
                    className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium">Password</label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  name="password"
                  type="password"
                  required
                  minLength={isRegister ? 8 : undefined}
                  placeholder={isRegister ? "Min. 8 characters" : "Your password"}
                  className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15"
                />
              </div>
            </div>

            {activeState?.error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {activeState.error}

                {/* A post-property account has no password yet, so the OTP screen
                    would lead nowhere — it needs a fresh set-password link. */}
                {activeState.needsSetPassword ? (
                  <ResendSetPasswordForm compact defaultEmail={activeState.email} />
                ) : (
                  !isRegister &&
                  loginState?.email && (
                    <button
                      type="button"
                      onClick={() => {
                        setVerifyEmail(loginState.email || "");
                        setDevOtp("");
                        setEmailWarning("");
                        setOtp(["", "", "", "", "", ""]);
                        setVerifyError("");
                        setMode("verify");
                      }}
                      className="ml-1 font-medium underline"
                    >
                      Verify now
                    </button>
                  )
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isRegister ? registerPending : loginPending}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isRegister
                ? registerPending ? "Creating account..." : "Create account"
                : loginPending ? "Signing in..." : "Sign in"}
              {!(isRegister ? registerPending : loginPending) && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isRegister ? "Already have an account?" : "Don\u0027t have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(isRegister ? "login" : "register")}
              className="font-semibold text-primary hover:underline"
            >
              {isRegister ? "Sign in" : "Create one"}
            </button>
          </p>
          </>
          )}
        </section>
      </div>
    </div>
  );
}

/**
 * Buy and Rent, opened.
 *
 * A rail of property categories down the left, and the pages for whichever one
 * is under the pointer laid out to the right. The grid this replaced printed
 * all seven categories at once with six state links under each — forty-two
 * links in one breath, none of them grouped by anything a reader was looking
 * for.
 *
 * The links are read, not built. They used to be assembled from a hardcoded
 * list of cities and states on the assumption that a page exists at
 * `{plural}-for-{listing}-in-{place}` — but the published set is reseeded and
 * reshuffled at midnight IST, so a nav that spells its own URLs is guessing at
 * yesterday's answer. `/api/nav-links` returns the ones that exist today.
 */
/**
 * The slug, spelled out: `flats-for-sale-in-jind-haryana` reads as
 * `Flats For Sale In Jind Haryana`.
 *
 * Every word is capitalised, small ones included. Sentence case would render
 * these as names, and they are not names — they are the paths the rows go to,
 * set down in something a reader can take in at a glance.
 */
function readableSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

type NavLink = { slug: string; label: string; name: string };

type NavLinkGroup = {
  property_type: string;
  listing_type: ListingType;
  city: NavLink[];
  district: NavLink[];
  state: NavLink[];
};

/**
 * `skeleton` is the width the loading rows stand at, in characters — roughly
 * what a slug at that level runs to, since a district's repeats its state on
 * the end and a city's does not.
 */
const NAV_COLUMNS = [
  { key: "city", title: "By City", skeleton: 26 },
  { key: "district", title: "By District", skeleton: 38 },
  { key: "state", title: "By State", skeleton: 28 },
] as const;

/**
 * One request per state, not one per nav item.
 *
 * Buy and Rent are separate components but want the same document — every
 * property type and both listing types come back together — so the promise is
 * held at module scope and the second caller joins the first one's fetch.
 *
 * Keyed by state rather than replaced, because the state is a thing the
 * visitor changes back and forth in the picker beside this nav, and the answer
 * for one they have already been shown is still the answer.
 */
const navLinks = new Map<string, Promise<NavLinkGroup[]>>();

function loadNavLinks(state: string | null) {
  // "India" is what the location context reports before a state has settled,
  // and the backend reads a missing state the same way: nothing to put first,
  // so the columns are drawn from the whole country.
  const scope = state && state !== "India" ? state : "";
  const cached = navLinks.get(scope);
  if (cached) return cached;

  const request = fetch(`/api/nav-links${scope ? `?state=${encodeURIComponent(scope)}` : ""}`)
    .then((res) => (res.ok ? res.json() : { groups: [] }))
    .then((data: { groups?: NavLinkGroup[] }) => data.groups ?? [])
    .catch(() => {
      // Dropped rather than kept: a held rejection would answer every later
      // caller for the life of the page, and the next hover should be allowed
      // to ask again.
      navLinks.delete(scope);
      return [] as NavLinkGroup[];
    });

  navLinks.set(scope, request);
  return request;
}

function MegaNavItem({
  label,
  listingType,
}: {
  label: string;
  listingType: ListingType;
}) {
  const groups = PROPERTY_GROUPS[listingType];
  // Held as "which category was pointed at", so the panel opens on the first
  // one and follows the pointer without waiting to be clicked.
  const [activeSlug, setActiveSlug] = useState(groups[0].slug);
  const active = groups.find((group) => group.slug === activeSlug) ?? groups[0];
  // `null` is "not answered yet" and an empty array is "answered, nothing to
  // show" — the columns have to tell a panel still loading from one the
  // backend had nothing for.
  const [links, setLinks] = useState<NavLinkGroup[] | null>(null);

  // The same settled value the rest of the site reads, so detecting Haryana
  // from the visitor's IP or picking Jharkhand in the header beside this nav
  // re-points the columns in the same breath.
  const { meta } = useLocation();

  // On mount rather than on hover: the panel opens the instant a pointer
  // crosses the word, and a request started then would land after the reader
  // is already looking at the empty columns.
  useEffect(() => {
    let cancelled = false;

    void loadNavLinks(meta.label).then((groups) => {
      if (!cancelled) setLinks(groups);
    });

    return () => {
      cancelled = true;
    };
  }, [meta.label]);

  const column = links?.find(
    (group) => group.property_type === active.type && group.listing_type === listingType,
  );

  return (
    <div className="group flex h-16 items-center">
      <button
        type="button"
        className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white group-hover:bg-white/10 group-hover:text-white"
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
      </button>

      {/* `:focus-visible`, not `:focus-within`. A mouse click on the button
          focused it and `focus-within` then held the panel open after the
          pointer had left, so hovering the other of Buy and Rent laid a second
          panel over the first. `:focus-visible` is not set by a click, only by
          keyboard focus, so the tab order still opens the panel while a click
          no longer pins it. */}
      <div className="invisible absolute left-0 top-full z-50 opacity-0 transition group-hover:visible group-hover:opacity-100 group-has-[:focus-visible]:visible group-has-[:focus-visible]:opacity-100">
        {/* No top border and square top corners, like the location picker
            beside it, so the panel reads as the bar continuing downwards. */}
        {/* The `15rem` subtracted is not a gutter — it is the room the panel
            has already spent before it starts. It hangs `left-0` off the nav
            row, which begins past the wordmark, so the width that fits is the
            viewport minus that offset. */}
        <div className="flex w-[min(calc(100vw-15rem),72rem)] overflow-hidden rounded-b-xl border border-t-0 border-border bg-popover text-foreground shadow-2xl">
          {/* The rail. Every category the site sells or lets — more than the
              five the hero's search tabs name. */}
          <div className="w-52 shrink-0 border-r border-border bg-muted/60 py-2">
            {groups.map((group) => {
              const selected = group.slug === active.slug;

              return (
                <button
                  key={group.slug}
                  type="button"
                  onMouseEnter={() => setActiveSlug(group.slug)}
                  onFocus={() => setActiveSlug(group.slug)}
                  aria-pressed={selected}
                  className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-semibold ${
                    selected ? "bg-popover text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <span className="truncate">{group.title}</span>
                  <ChevronRight
                    className={`size-3.5 shrink-0 ${selected ? "text-saffron" : "text-transparent"}`}
                    strokeWidth={2.2}
                  />
                </button>
              );
            })}
          </div>

          {/* The pages themselves, one column per level the site indexes on,
              each row printing the path it goes to rather than the name of the
              place at the end of it. */}
          {/* `auto` tracks, not three equal thirds. The columns hold slugs of
              very different lengths — a district's carries its state on the
              end, a city's carries nothing — so equal thirds wrapped every
              district row onto two lines while the city column sat half
              empty. Each track takes the width its own longest slug wants and
              they share what is left over. */}
          <div className="grid min-w-0 flex-1 grid-cols-[auto_auto_auto] gap-x-6 p-5">
            {NAV_COLUMNS.map((meta) => (
              <div key={meta.key} className="min-w-0">
                <h3 className="border-b border-border pb-2 text-sm font-bold">{meta.title}</h3>
                <div className="mt-3 grid">
                  {links === null
                    ? /* Held open at the height the rows will take, so the
                         panel does not resize under the pointer when they
                         arrive. */
                      Array.from({ length: 8 }, (_, row) => (
                        <div key={row} className="py-1.5" aria-hidden>
                          {/* Sized to roughly the slug this row will hold, so
                              the auto tracks settle near their final widths
                              instead of snapping when the links arrive. */}
                          <div
                            className="h-3.5 animate-pulse rounded bg-muted"
                            style={{ width: `${meta.skeleton}ch` }}
                          />
                        </div>
                      ))
                    : (column?.[meta.key] ?? []).map((link) => (
                        <Link
                          key={link.slug}
                          href={`/${link.slug}`}
                          /* Wrapped, not truncated: the part of a slug that
                             names the place is at the end, so clipping the
                             overflow would cut off the only half that differs
                             between one row and the next. Spelled out the
                             words break on their own spaces, so `break-all`
                             is no longer needed to get a long one onto two
                             lines. With the tracks sized above it only comes
                             to that on a narrow window. */
                          className="py-1.5 text-[12px] leading-4 text-foreground/80 transition-colors hover:text-primary"
                        >
                          {readableSlug(link.slug)}
                        </Link>
                      ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileNavSection({
  label,
  icon: Icon,
  listingType,
}: {
  label: string;
  icon: typeof Home;
  listingType: ListingType;
}) {
  const firstGroup = PROPERTY_GROUPS[listingType][0];
  const actionLabel = listingType === "rent" ? "Rent" : "Sale";

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm font-semibold"
      >
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </button>
      <div className="grid gap-2 border-t border-border px-3 py-3">
        {TOP_STATES.slice(0, 6).map((state) => (
          <Link
            key={`${label}-${state}`}
            href={statePageHref(state, firstGroup.slug, listingType)}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            {firstGroup.label} for {actionLabel} in {state}
          </Link>
        ))}
      </div>
    </div>
  );
}
