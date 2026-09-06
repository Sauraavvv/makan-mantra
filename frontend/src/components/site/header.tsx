"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowRight, BedDouble, ChevronDown, ChevronRight, Home, Loader2, LocateFixed, LockKeyhole, Mail, MailCheck, MapPin, Menu, Phone, Plus, Search, ShieldCheck, UserRound, X } from "lucide-react";
import { loginAction, registerModalAction } from "@/app/actions/auth";
import { ResendSetPasswordForm } from "@/components/auth/resend-set-password-form";
import { UserMenu } from "@/components/site/user-menu";
import { useSession } from "@/context/session-context";
import { Input } from "@/components/ui/input";
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
 * India's seven largest property markets, spelled the way the location pages
 * spell them — the sheet has "New Delhi" rather than "Delhi", which is a city
 * record; Delhi the state is the one the picker above deals in.
 */
const TOP_CITIES = [
  "Mumbai", "New Delhi", "Bangalore", "Hyderabad", "Pune", "Chennai", "Kolkata",
];

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

const PROPERTY_GROUPS = {
  sale: [
    { title: "Flats", slug: "flats", label: "Flats" },
    { title: "Villas", slug: "villas", label: "Villas" },
    { title: "Builder Floors", slug: "builder-floors", label: "Builder Floors" },
    { title: "Plots", slug: "plots", label: "Plots" },
    { title: "Office Spaces", slug: "office-spaces", label: "Office Spaces" },
    { title: "Shops", slug: "shops", label: "Shops" },
    { title: "Showrooms", slug: "showrooms", label: "Showrooms" },
  ],
  rent: [
    { title: "Flats", slug: "flats", label: "Flats" },
    { title: "Villas", slug: "villas", label: "Villas" },
    { title: "Builder Floors", slug: "builder-floors", label: "Builder Floors" },
    { title: "PGs", slug: "pgs", label: "PGs" },
    { title: "Office Spaces", slug: "office-spaces", label: "Office Spaces" },
    { title: "Shops", slug: "shops", label: "Shops" },
    { title: "Showrooms", slug: "showrooms", label: "Showrooms" },
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
};

function statePageHref(state: string, propertySlug: string, listingType: ListingType) {
  return `/${propertySlug}-for-${listingType}-in-${stateSlug(state)}`;
}

export function Header({
  showSearchBar = false,
  searchPlaceholder = "Search city, locality or project...",
  overlay = false,
  overlayTone = "tint",
  minimal = false,
}: HeaderProps = {}) {
  const { meta, setStateByName, requestPreciseLocation, locating } = useLocation();
  const { user: sessionUser, loaded: sessionLoaded } = useSession();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [showSearch, setShowSearch] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [authInitial, setAuthInitial] = useState<{ mode: AuthMode; email?: string; devOtp?: string }>({ mode: "login" });
  const [search, setSearch] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [citiesStatus, setCitiesStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [allCitiesOpen, setAllCitiesOpen] = useState(false);
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
          : "sticky top-0 z-40 w-full border-b border-white/10 bg-[#0A2036] text-white shadow-lg shadow-black/10"
      }
    >
      <div className="flex h-16 w-full items-center gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center text-xl font-bold tracking-tight sm:text-2xl">
          <span>
            Makan <span className="text-saffron">Mantraa</span>
          </span>
        </Link>

        {!minimal && isHome && (
          <nav className="ml-3 hidden items-center gap-1 lg:flex">
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
        {isHome && (
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
            /* Centred under the chip while it is one column, and pinned by its
               right edge once the city list opens.

               Growing rightward was the obvious reading of "add a column on the
               right", and it is wrong here: the chip sits at the right end of
               the header, so a panel that keeps its left edge and reaches for
               another 13rem runs off the window and puts the whole page on a
               horizontal scrollbar. 9.5rem - 32rem = -22.5rem holds the right
               edge exactly where the single column already ended, so the panel
               opens inward. Below `sm` the second column never opens and the
               plain centring stands. */
            <div
              className={`absolute left-1/2 top-full z-50 mt-3 flex -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover text-foreground shadow-2xl ${
                allCitiesOpen ? "sm:-translate-x-[22.5rem]" : ""
              }`}
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
              {/* Two to a row: seven names down a single column would be taller
                  than the whole state grid above them, for a list nobody has to
                  read in order. Reading only for now — the site's location is a
                  state, so a city here has nothing to set. */}
              <div className="grid grid-cols-2 gap-x-2 bg-white p-1.5">
                {TOP_CITIES.map((city) => (
                  <p
                    key={city}
                    title={city}
                    className="truncate rounded-md px-2 py-1.5 text-sm text-foreground"
                  >
                    {city}
                  </p>
                ))}
              </div>

              {/* The rest of them, off to the side rather than below: three
                  hundred names in this column would bury the states, and the
                  panel has room to its right that it is not otherwise using. */}
              <button
                onClick={() => setAllCitiesOpen((open) => !open)}
                aria-expanded={allCitiesOpen}
                className="flex w-full items-center justify-between gap-2 border-t border-border bg-muted px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
              >
                Other Cities
                <ChevronRight
                  className={`h-3.5 w-3.5 shrink-0 transition-transform ${allCitiesOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            {/* Absolutely filled rather than laid out, so its three hundred rows
                do not decide the panel's height — it takes the height the
                column beside it already has, and scrolls inside that. */}
            {allCitiesOpen && (
              <aside className="relative hidden w-52 shrink-0 border-l border-border bg-white sm:block">
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

        <form
          className={`relative hidden transition-all duration-300 md:block ${
            isHome ? "order-3 flex-1" : "flex-1"
          } ${
            shouldShowSearch
              ? "max-w-md opacity-100"
              : "pointer-events-none max-w-0 overflow-hidden opacity-0"
          }`}
          onSubmit={(event) => event.preventDefault()}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            className="h-9 border-white/15 bg-white text-foreground pl-9 focus-visible:ring-white/30"
          />
        </form>

        {minimal ? (
          <div className="ml-auto" />
        ) : !isHome ? (
            <nav className="ml-auto hidden items-center gap-1 lg:flex">
              {NAV.map((item) => (
                <MegaNavItem
                  key={item.label}
                  label={item.label}
                  listingType={item.label === "Rent" ? "rent" : "sale"}
                />
              ))}
            </nav>
        ) : null}

        {!minimal && (
            <Link
              href="/post-property"
              className={`${isHome ? "order-5" : ""} hidden h-9 shrink-0 items-center gap-1 rounded-full bg-saffron px-4 text-sm font-semibold text-saffron-foreground transition-colors hover:bg-saffron/90 sm:inline-flex`}
            >
              <Plus className="h-4 w-4" /> Post Property{" "}
              <span className="ml-1 rounded bg-white/20 px-1 text-[10px] font-bold">FREE</span>
            </Link>
        )}

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

function MegaNavItem({
  label,
  listingType,
}: {
  label: string;
  listingType: ListingType;
}) {
  const actionLabel = listingType === "rent" ? "Rent" : "Sale";

  return (
    <div className="group relative flex h-16 items-center">
      <button
        type="button"
        className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white group-hover:bg-white/10 group-hover:text-white"
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
      </button>

      <div className="invisible fixed inset-x-0 top-16 z-50 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="max-h-[72vh] overflow-y-auto border-t border-border bg-background px-4 py-6 text-foreground shadow-2xl">
          <div className="mx-auto grid max-w-7xl gap-x-8 gap-y-7 md:grid-cols-4">
            {PROPERTY_GROUPS[listingType].map((group) => (
              <div key={group.slug}>
                <h3 className="border-b border-border pb-3 text-base font-semibold">
                  {group.title}
                </h3>
                <div className="mt-4 grid gap-3">
                  {TOP_STATES.slice(0, 6).map((state) => (
                    <Link
                      key={`${group.slug}-${state}`}
                      href={statePageHref(state, group.slug, listingType)}
                      className="text-sm text-foreground/80 transition-colors hover:text-primary"
                    >
                      {group.label} for {actionLabel} in {state}
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
