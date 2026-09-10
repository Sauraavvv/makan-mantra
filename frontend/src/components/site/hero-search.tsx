"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  BedDouble,
  Building2,
  ChevronDown,
  Home,
  LandPlot,
  MapPin,
  Mic,
  Search,
  Store,
} from "lucide-react";
import { useLocation } from "@/context/location-context";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useSearchHistory } from "@/context/search-history-context";

/** What is being looked for, not what is being done with it — the tabs name a
 *  kind of property, so a search carries the kind rather than buy-or-rent. */
const TABS = [
  { label: "Flat", icon: Building2 },
  { label: "Villa", icon: Home },
  { label: "PG", icon: BedDouble },
  { label: "Plot", icon: LandPlot },
  { label: "Commercial", icon: Store },
] as const;

type Tab = (typeof TABS)[number]["label"];
type ListingType = "buy" | "rent";

/** The stored category for a search, in the site's own wording. */
const CATEGORY_BY_TAB: Record<Tab, string> = {
  Flat: "Flats",
  Villa: "Villas",
  PG: "PGs",
  Plot: "Plots/Land",
  Commercial: "Commercial",
};

/**
 * The tab, in the wording `location_pages` stores.
 *
 * This is what turns the tabs from labels into a filter: every row in that
 * collection is one place under one property type and one listing type, and it
 * carries the slug of the page for exactly that combination. So the tab and
 * Buy/Rent do not colour the results — they choose which page a place goes to.
 *
 * Commercial maps to shops. The site stores three commercial types — shop,
 * showroom and office_space — under one tab, and shops are much the commonest
 * of them; splitting the tab is a separate decision.
 */
const PROPERTY_TYPE_BY_TAB: Record<Tab, string> = {
  Flat: "flat",
  Villa: "villa",
  PG: "pg",
  Plot: "plot",
  Commercial: "shop",
};

/** Short of this a search matches most of the country, so we do not ask. */
const SUGGEST_MIN_CHARS = 3;

/** Long enough that a typed word costs one request rather than one per letter. */
const SUGGEST_DEBOUNCE_MS = 200;

type Suggestion = {
  name: string;
  category: string;
  context: string;
  slug: string;
};

const SEARCH_PROMPTS = ["Search by City", "Search by Locality", "Search by Keyword"] as const;
const TRENDING_LOCATION_LIMIT = 6;

type HeroSearchProps = {
  align?: "center" | "left";
  locationName?: string;
  /** State whose city/district names should be shown in Trending Searches. */
  areaStateName?: string;
  /** District context: its own cities lead, then the closest districts fill in. */
  areaDistrictName?: string;
  /** Offset the full search treatment so its inset tab row aligns to page copy. */
  alignTabsWithHeading?: boolean;
  /** Slide the bar up into place on mount — the landing hero asks for it, inner pages don't. */
  animateIn?: boolean;
};

export function HeroSearch({
  align = "center",
  locationName,
  areaStateName,
  areaDistrictName,
  alignTabsWithHeading = false,
  animateIn = false,
}: HeroSearchProps = {}) {
  const router = useRouter();
  const { meta } = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const { track } = useSearchHistory();
  const [activeTab, setActiveTab] = useState<Tab>("Flat");
  const [listingType, setListingType] = useState<ListingType>("buy");
  const [listingMenuOpen, setListingMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [promptLength, setPromptLength] = useState(0);
  const [deletingPrompt, setDeletingPrompt] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  // -1 is "nothing picked yet", which is not the same as "the first one" — it
  // is what lets Enter fall through to a plain search when the reader typed
  // something the list does not cover.
  const [highlight, setHighlight] = useState(-1);
  const [locationsByScope, setLocationsByScope] = useState<Record<string, string[]>>({});
  const [visibleTrendingCount, setVisibleTrendingCount] = useState(TRENDING_LOCATION_LIMIT);
  const listingMenuRef = useRef<HTMLDivElement>(null);
  const suggestBoxRef = useRef<HTMLDivElement>(null);
  const requestedAreaScopes = useRef(new Set<string>());
  const trendingRowRef = useRef<HTMLDivElement>(null);
  const trendingMeasureRef = useRef<HTMLDivElement>(null);

  const { isSupported: micSupported, status: micStatus, toggle: toggleMic } =
    useSpeechRecognition((text) => setQuery(text));

  const areaState = areaStateName || meta.label;
  const areaDistrict = areaDistrictName?.trim() || undefined;
  const areaScopeKey = `${areaState}\u0001${areaDistrict ?? ""}`;
  const trending = useMemo(() => {
    const names: string[] = [];
    const seen = new Set<string>();
    const sharedLocations = locationsByScope[areaScopeKey] ?? [];
    const fallback = areaDistrict
      ? locationName
        ? [locationName]
        : []
      : areaState === meta.label
        ? meta.from
        : locationName
          ? [locationName]
          : [];
    const source = sharedLocations.length > 0 ? sharedLocations : fallback;

    for (const value of source) {
      const name = value.trim();
      const key = name.toLowerCase();
      if (!name || seen.has(key)) continue;
      names.push(name);
      seen.add(key);
    }

    return names.slice(0, TRENDING_LOCATION_LIMIT);
  }, [areaDistrict, areaScopeKey, areaState, locationName, locationsByScope, meta.from, meta.label]);
  const fixedListingType = activeTab === "PG" ? "rent" : activeTab === "Plot" ? "buy" : null;

  function selectTab(tab: Tab) {
    setActiveTab(tab);
    setListingMenuOpen(false);

    if (tab === "PG") setListingType("rent");
    if (tab === "Plot") setListingType("buy");
  }

  useEffect(() => {
    if (!listingMenuOpen) return;

    const closeMenu = (event: PointerEvent) => {
      if (!listingMenuRef.current?.contains(event.target as Node)) setListingMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setListingMenuOpen(false);
    };

    window.addEventListener("pointerdown", closeMenu);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [listingMenuOpen]);

  /**
   * The type-ahead.
   *
   * Re-runs on the filters as well as on the text, because the filters are part
   * of the question: the same three letters under Flat/Buy and under Villa/Rent
   * lead to two different pages, and the list has to say which.
   */
  useEffect(() => {
    // Nothing to clear on the way out: what is on screen is derived from the
    // query below, so a query that has shrunk under the threshold hides the
    // list without this effect having to write state to say so.
    const term = query.trim();
    if (term.length < SUGGEST_MIN_CHARS) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams({
            q: term,
            type: PROPERTY_TYPE_BY_TAB[activeTab],
            listing: listingType === "buy" ? "sale" : "rent",
          });
          const response = await fetch(`/api/locations/suggest?${params.toString()}`);
          if (!response.ok || cancelled) return;

          const data = (await response.json()) as { suggestions?: Suggestion[] };
          if (cancelled) return;

          setSuggestions(data.suggestions ?? []);
          setHighlight(-1);
          setSuggestOpen(true);
        } catch {
          // Leave whatever is on screen; the next keystroke tries again.
        }
      })();
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeTab, listingType, query]);

  useEffect(() => {
    if (!suggestOpen) return;

    const close = (event: PointerEvent) => {
      if (!suggestBoxRef.current?.contains(event.target as Node)) setSuggestOpen(false);
    };

    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [suggestOpen]);

  useEffect(() => {
    if (areaState === "India" || requestedAreaScopes.current.has(areaScopeKey)) return;
    requestedAreaScopes.current.add(areaScopeKey);
    let cancelled = false;

    void (async () => {
      try {
        const params = new URLSearchParams({ state: areaState });
        if (areaDistrict) params.set("district", areaDistrict);

        const response = await fetch(`/api/cities?${params.toString()}`, {
          cache: "no-store",
        });
        if (!response.ok) return;

        const data = (await response.json()) as { cities?: unknown; locations?: unknown };
        const rawLocations = Array.isArray(data.locations)
          ? data.locations
          : Array.isArray(data.cities)
            ? data.cities
            : [];
        const locations = rawLocations
          .filter((name): name is string => typeof name === "string" && Boolean(name.trim()));

        if (!cancelled && locations.length > 0) {
          setLocationsByScope((current) => ({ ...current, [areaScopeKey]: locations }));
        }
      } catch {
        // The static context values remain a useful loading/error fallback.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [areaDistrict, areaScopeKey, areaState]);

  const trendingKey = trending.join("\u0001");

  useEffect(() => {
    const row = trendingRowRef.current;
    const measureRow = trendingMeasureRef.current;
    if (!row || !measureRow) return;

    const measureVisibleLocations = () => {
      const heading = measureRow.querySelector<HTMLElement>("[data-trending-measure-heading]");
      const items = Array.from(
        measureRow.querySelectorAll<HTMLElement>("[data-trending-measure-item]"),
      );
      if (!heading) return;

      const start = heading.getBoundingClientRect().left;
      let count = 0;

      for (const item of items) {
        if (item.getBoundingClientRect().right - start > row.clientWidth) break;
        count += 1;
      }

      setVisibleTrendingCount((current) => (current === count ? current : count));
    };

    let frame = window.requestAnimationFrame(measureVisibleLocations);
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            window.cancelAnimationFrame(frame);
            frame = window.requestAnimationFrame(measureVisibleLocations);
          });

    resizeObserver?.observe(row);
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
    };
  }, [trendingKey]);

  const prompt = SEARCH_PROMPTS[promptIndex];
  const promptFinished = promptLength === prompt.length;
  const promptCleared = promptLength === 0;

  useEffect(() => {
    if (shouldReduceMotion) return;

    const delay = promptFinished && !deletingPrompt ? 1500 : deletingPrompt ? 35 : 65;
    const timer = window.setTimeout(() => {
      if (promptFinished && !deletingPrompt) {
        setDeletingPrompt(true);
        return;
      }

      if (promptCleared && deletingPrompt) {
        setDeletingPrompt(false);
        setPromptIndex((index) => (index + 1) % SEARCH_PROMPTS.length);
        return;
      }

      setPromptLength((length) => length + (deletingPrompt ? -1 : 1));
    }, delay);

    return () => window.clearTimeout(timer);
  }, [deletingPrompt, promptCleared, promptFinished, promptIndex, promptLength, shouldReduceMotion]);

  const searchPlaceholder = shouldReduceMotion
    ? SEARCH_PROMPTS[0]
    : prompt.slice(0, promptLength);

  function saveSearch(searchQuery: string) {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    void track({
      label: trimmed,
      tab: listingType === "buy" ? "Buy" : "Rent",
      category: CATEGORY_BY_TAB[activeTab],
      query: trimmed,
    });
  }

  // Derived rather than stored, so the list cannot outlive the text it belongs
  // to — deleting back to two characters hides it in the same render.
  const showSuggestions =
    suggestOpen && suggestions.length > 0 && query.trim().length >= SUGGEST_MIN_CHARS;

  /** Takes the reader to the page for this place under the filters on screen. */
  function selectSuggestion(item: Suggestion) {
    saveSearch(item.name);
    setSuggestOpen(false);
    setQuery(item.name);
    router.push(`/${item.slug}`);
  }

  function handleSearchKeys(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Escape") {
      setSuggestOpen(false);
    }
  }

  // Reduced-motion visitors get the bar in its final place, no travel.
  const playEntry = animateIn && !shouldReduceMotion;

  return (
    <div
      className={`w-full max-w-4xl ${align === "center" ? "mx-auto" : ""} ${
        alignTabsWithHeading ? "-translate-x-[6%]" : ""
      }`}
    >
      <motion.div
        id="hero-search"
        className="mt-6 w-full"
        initial={playEntry ? { opacity: 0, y: 40 } : false}
        animate={playEntry ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();

            // Enter on a highlighted row takes it; Enter with the list open and
            // nothing highlighted takes the best match, which is what pressing
            // Enter on a search box is understood to mean.
            const chosen = suggestions[highlight >= 0 ? highlight : 0];
            if (showSuggestions && chosen) {
              selectSuggestion(chosen);
              return;
            }

            saveSearch(query);
          }}
          /* The cards sit over a single surface, so the slim navy area at either
             side of the search row naturally continues down behind the trending
             searches too. */
          className="relative pt-[5.7rem] sm:pt-[3.35rem]"
        >
          {/* Individual cards rather than a shared tab strip. They overlap the
              panel below, matching the layered search treatment in the reference.
              On a phone the cards flow into two rows to preserve readable labels. */}
          <div className="absolute top-0 left-1/2 z-10 grid w-[88%] -translate-x-1/2 grid-cols-3 gap-1 sm:grid-cols-5 sm:gap-1.5">
          {TABS.map(({ label, icon: Icon }) => {
            const active = activeTab === label;

            return (
              <button
                key={label}
                type="button"
                onClick={() => selectTab(label)}
                aria-pressed={active}
                className={`relative flex h-10 min-w-0 translate-y-2 items-center justify-center gap-1 rounded-t-xl border border-white/20 px-1 text-xs font-semibold shadow-[0_-8px_20px_rgba(2,12,25,0.16)] transition-colors sm:h-12 sm:translate-y-[6px] sm:gap-1.5 sm:px-1.5 sm:text-[13px] ${
                  active
                    ? "bg-[#173653] text-white"
                    : "bg-[#071a2d]/90 text-white/75 hover:bg-[#102a43] hover:text-white"
                }`}
              >
                <Icon className="size-[14px] shrink-0 sm:size-4" strokeWidth={1.9} />
                <span className="truncate">{label}</span>
                {active && (
                  <span className="absolute inset-x-4 bottom-2 h-0.5 rounded-t-full bg-white sm:inset-x-6" />
                )}
              </button>
            );
          })}
        </div>

        {/* Wider than the cards above and the trending strip below, which are
            both 88% — the search row is the thing being reached for, so it
            still oversails them. Just by less than the full 6% a side that
            running to the container's own edge gave it. */}
        <div className="relative z-20 mx-auto w-[96%] rounded-2xl border border-white/20 bg-[#061727]/90 p-3 shadow-[0_18px_45px_rgba(2,12,25,0.3)] backdrop-blur-md">
          <div className="flex flex-col rounded-xl bg-white shadow-[0_10px_24px_rgba(2,12,25,0.18)] sm:h-14 sm:flex-row sm:items-center">
            <div
              ref={listingMenuRef}
              className="relative flex h-11 shrink-0 items-center border-b border-border sm:h-full sm:w-28 sm:border-b-0 sm:border-r"
            >
              {fixedListingType ? (
                <span className="px-4 text-base font-bold text-[#0A2036]">
                  {fixedListingType === "rent" ? "Rent" : "Buy"}
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setListingMenuOpen((open) => !open)}
                    aria-expanded={listingMenuOpen}
                    aria-haspopup="listbox"
                    className="flex h-full w-full items-center justify-between gap-1 px-4 text-left text-base font-bold text-[#0A2036] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0A2036]"
                  >
                    {listingType === "buy" ? "Buy" : "Rent"}
                    <ChevronDown
                      className={`size-4 shrink-0 text-[#0A2036] transition-transform ${listingMenuOpen ? "rotate-180" : ""}`}
                      strokeWidth={2.2}
                    />
                  </button>

                  {listingMenuOpen && (
                    <div
                      role="listbox"
                      aria-label="Listing type"
                      /* The header's location panel, in miniature: no top
                         border and square top corners, so it reads as the bar
                         continuing downwards rather than as a second card
                         floating under it. Its own width, not the field's. */
                      className="absolute left-0 top-full z-30 w-32 overflow-hidden rounded-b-xl border border-t-0 border-border bg-popover p-1 text-foreground shadow-2xl"
                    >
                      {(["buy", "rent"] as const).map((type) => {
                        const selected = listingType === type;
                        const label = type === "buy" ? "Buy" : "Rent";

                        return (
                          <button
                            key={type}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => {
                              setListingType(type);
                              setListingMenuOpen(false);
                            }}
                            className={`flex h-9 w-full items-center rounded-md px-3 text-left text-sm font-semibold transition-colors ${
                              selected
                                ? "bg-[#0A2036] text-white"
                                : "text-foreground hover:bg-accent"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            <div
              ref={suggestBoxRef}
              className="relative flex h-11 min-w-0 flex-1 items-center gap-2.5 px-4 sm:h-full"
            >
              <Search className="size-5 shrink-0 text-muted-foreground" strokeWidth={2} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleSearchKeys}
                onFocus={() => {
                  if (suggestions.length > 0) setSuggestOpen(true);
                }}
                placeholder={micStatus === "listening" ? "Listening…" : searchPlaceholder}
                aria-label="Search by locality, builder or project"
                /* The browser's own history dropdown draws over ours and does
                   not know about the filters, so it is turned off outright —
                   along with the phone keyboard's autocorrect, which mangles
                   place names it has never met. */
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                role="combobox"
                aria-expanded={showSuggestions}
                aria-controls="hero-search-suggestions"
                aria-autocomplete="list"
                aria-activedescendant={
                  highlight >= 0 ? `hero-search-suggestion-${highlight}` : undefined
                }
                className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />

              {showSuggestions && (
                /* Hung off the text field rather than the whole white row, so
                   it lines up under what was typed. Above the listing menu's
                   own z-30 — both can be open at once, and this one is the one
                   being read. */
                /* Its own width rather than the full stretch of the field —
                   a list of place names does not need the whole bar — and the
                   header's panel styling: flat top corners meeting the bar's
                   own bottom edge, so it reads as the bar continuing down. */
                <div
                  id="hero-search-suggestions"
                  role="listbox"
                  aria-label="Matching locations"
                  className="absolute left-0 top-full z-40 max-h-[19rem] w-[min(calc(100vw-3rem),24rem)] overflow-y-auto overscroll-contain rounded-b-xl border border-t-0 border-border bg-popover py-1 text-foreground shadow-2xl"
                >
                  {suggestions.map((item, index) => (
                    <button
                      key={item.slug}
                      id={`hero-search-suggestion-${index}`}
                      type="button"
                      role="option"
                      aria-selected={index === highlight}
                      onPointerDown={(event) => event.preventDefault()}
                      onClick={() => selectSuggestion(item)}
                      onMouseEnter={() => setHighlight(index)}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left ${
                        index === highlight ? "bg-accent/60" : ""
                      }`}
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-saffron/10 text-saffron">
                        <MapPin className="size-4" strokeWidth={2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {item.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.context}
                        </span>
                      </span>
                      {/* Three rows can carry the same name — a city, the
                          district around it and the state above that — so the
                          label is what separates them. */}
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        {item.category}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {micSupported && (
                <button
                  type="button"
                  onClick={toggleMic}
                  aria-label={micStatus === "listening" ? "Stop listening" : "Voice search"}
                  className={`grid size-9 shrink-0 place-items-center rounded-full transition-colors ${
                    micStatus === "listening"
                      ? "animate-pulse bg-red-500 text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Mic className="size-4" />
                </button>
              )}
            </div>

            <div className="flex shrink-0 items-center px-2 pb-2 sm:pb-0 sm:pr-2.5">
              <button
                type="submit"
                className="h-11 w-full rounded-lg bg-[#0A2036] px-8 text-base font-bold text-white shadow-sm transition-colors hover:bg-[#12345d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2036] sm:w-auto"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        <div className="relative z-10 mx-auto -mt-px w-[88%] rounded-b-xl border border-white/20 bg-[#061727]/90 px-3 py-4 shadow-[0_14px_30px_rgba(2,12,25,0.24)] backdrop-blur-md sm:px-4">
          <div
            ref={trendingRowRef}
            className="flex min-w-0 flex-nowrap items-center gap-2 overflow-hidden whitespace-nowrap"
          >
            <span className="shrink-0 text-sm font-bold text-white">Trending Searches :</span>
            {trending.slice(0, visibleTrendingCount).map((label, index) => (
              <Fragment key={label}>
                {index > 0 && (
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-base text-saffron drop-shadow-[0_0_5px_rgba(255,122,26,0.9)]"
                  >
                    •
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setQuery(label)}
                  className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-white/85 transition-colors hover:text-white hover:underline hover:underline-offset-4 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {label}
                  <ArrowUpRight className="size-3 shrink-0" strokeWidth={2.2} />
                </button>
              </Fragment>
            ))}
          </div>

          <div
            ref={trendingMeasureRef}
            aria-hidden="true"
            className="pointer-events-none absolute invisible left-0 top-0 flex w-max items-center gap-2 whitespace-nowrap"
          >
            <span data-trending-measure-heading className="shrink-0 text-sm font-bold text-white">
              Trending Searches :
            </span>
            {trending.map((label, index) => (
              <div key={label} data-trending-measure-item className="flex shrink-0 items-center gap-2">
                {index > 0 && <span className="text-base text-saffron">•</span>}
                <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-white/85">
                  {label}
                  <ArrowUpRight className="size-3 shrink-0" strokeWidth={2.2} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </form>
    </motion.div>
    </div>
  );
}
