"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, MapPin, Search } from "lucide-react";

import { useSearchHistory } from "@/context/search-history-context";

/** Short of this a search matches most of the country, which helps nobody. */
const MIN_CHARS = 3;

/** Long enough that a typed word is one request, not one per letter. */
const DEBOUNCE_MS = 200;

/**
 * The two filters the search itself is asked under.
 *
 * `/api/locations/suggest` answers per property type and listing type — the
 * same three letters under Flat/Buy and Villa/Rent lead to two different pages
 * — though it takes either as absent, which is what clearing one means.
 *
 * `category` is what the search history records the search under, so a search
 * made here is filed the way the hero would have filed it.
 */
const PROPERTY_TYPES = [
  { label: "Flat", type: "flat", category: "Flats" },
  { label: "Villa", type: "villa", category: "Villas" },
  { label: "Builder Floor", type: "builder_floor", category: "Builder Floors" },
  { label: "Plot", type: "plot", category: "Plots/Land" },
  { label: "PG", type: "pg", category: "PGs" },
  { label: "Office Space", type: "office_space", category: "Commercial" },
  { label: "Shop", type: "shop", category: "Commercial" },
  { label: "Showroom", type: "showroom", category: "Commercial" },
];

const LISTING_TYPES = [
  { label: "Buy", type: "sale" },
  { label: "Rent", type: "rent" },
];

/**
 * The rest of the filter row.
 *
 * Screens, not searches — nothing here reaches `/api/locations/suggest`, which
 * answers on a place name under one property type and one listing type and
 * knows nothing about bedrooms or budget. They are multi-select and start
 * empty, so a chip with no count is a filter nobody has asked for, which is
 * also the truth about what it does.
 */
const EXTRA_FILTERS = [
  {
    key: "budget",
    label: "Budget",
    options: [
      "Under ₹25L",
      "₹25L – ₹50L",
      "₹50L – ₹1Cr",
      "₹1Cr – ₹2Cr",
      "Above ₹2Cr",
    ],
  },
  {
    key: "bhk",
    label: "Bedroom",
    options: ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5+ BHK"],
  },
  {
    key: "postedBy",
    label: "Posted By",
    options: ["Owner", "Builder", "Dealer / Agent"],
  },
];

const PROJECT_STAGES = ["New Launch", "Under Construction", "Ready to move"];

/**
 * The navbar itself leads with deep navy and uses saffron for emphasis. The
 * panel keeps the same ink, but uses a quiet warm surface beneath its white
 * controls so it feels part of Makan Mantraa instead of a copied-blue UI.
 */
const PANEL_BG = "#FFF5EB";
const PANEL_RAISED_BG = "#FFFFFF";
const PANEL_LINE = "#E8D8CA";
const PANEL_INK = "#0A2036";

type Suggestion = {
  name: string;
  category: string;
  context: string;
  slug: string;
};

/** Everything the panel edits, held apart from what the search is running on. */
type Filters = {
  /** Many-choice: a visitor can ask for flats and builder floors at once. */
  property: string[];
  listing: string | null;
  extras: Record<string, string[]>;
};

type PanelPlacement = {
  left: number;
  top: number;
  width: number;
};

const NO_FILTERS: Filters = { property: [], listing: null, extras: {} };

const OPENING_FILTERS: Filters = {
  property: [PROPERTY_TYPES[0].type],
  listing: LISTING_TYPES[0].type,
  // These are the three project stages shown first in the expanded navbar
  // search. They are broad enough to be useful as the opening state, while
  // the visitor can still turn any of them off before searching.
  extras: { availability: PROJECT_STAGES },
};

function countFilters(filters: Filters) {
  return (
    filters.property.length +
    (filters.listing ? 1 : 0) +
    Object.values(filters.extras).reduce(
      (total, chosen) => total + chosen.length,
      0,
    )
  );
}

/**
 * The search bar in the header, once the hero's has scrolled out of sight.
 *
 * It used to be a box you could type into and nothing else: no handler on the
 * input, and a submit that only called `preventDefault`. This is the same
 * type-ahead the hero runs — the location pages themselves, matched on their
 * own names — reduced to the part that fits a navbar.
 *
 * The filter button opens a sheet over the bar holding the field itself, the
 * filters, and the options of whichever one is open, all in the one surface.
 * Nothing in it takes effect until Search: the panel edits a draft, and any
 * other way out — a click outside, Escape — throws the draft away. A filter row that applied as you touched it would be
 * re-running the search under every half-made combination on the way to the
 * one that was wanted.
 */
export function HeaderSearch({
  placeholder,
  className = "",
  /** False while the bar is collapsed, so nothing outlives the box. */
  active = true,
  /** Lets the header make room while the compact field becomes the panel. */
  onPanelOpenChange,
}: {
  placeholder: string;
  className?: string;
  active?: boolean;
  onPanelOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const { track } = useSearchHistory();
  const [query, setQuery] = useState("");

  // What the search is actually running under.
  const [filters, setFilters] = useState<Filters>(OPENING_FILTERS);
  // What the panel is editing. Seeded from `filters` each time it opens.
  const [draft, setDraft] = useState<Filters>(OPENING_FILTERS);

  const [filtersOpen, setFiltersOpen] = useState(false);
  // Which filter has its options showing. One at a time — they open into the
  // same strip of the panel, so a second would push the first off it.
  const [openChip, setOpenChip] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [panelPlacement, setPanelPlacement] = useState<PanelPlacement | null>(
    null,
  );

  const rowRef = useRef<HTMLDivElement>(null);
  // The panel is portalled to `body`, so it is not inside the row and the
  // outside-click test has to be told about it separately.
  const panelRef = useRef<HTMLDivElement>(null);

  const { property, listing } = filters;
  // The effect below compares its dependencies by identity, and `property` is
  // a fresh array on every render. Joined, it changes only when the choice
  // does — which is also the form the endpoint wants it in.
  const propertyParam = property.join(",");

  // The type-ahead.
  useEffect(() => {
    // Nothing to clear on the way out: what is on screen is derived from the
    // query below, so a query that has shrunk under the threshold hides the
    // list without this effect having to write state to say so.
    const term = query.trim();
    if (term.length < MIN_CHARS) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams({ q: term });
          if (propertyParam) params.set("type", propertyParam);
          if (listing) params.set("listing", listing);

          const response = await fetch(
            `/api/locations/suggest?${params.toString()}`,
          );
          if (!response.ok || cancelled) return;

          const data = (await response.json()) as {
            suggestions?: Suggestion[];
          };
          if (cancelled) return;

          setSuggestions(data.suggestions ?? []);
          setHighlight(-1);
          setOpen(true);
        } catch {
          // Leave whatever is on screen; the next keystroke tries again.
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // On the filters as well as the text: they are part of the question, and
    // the list has to say where these letters lead under the pair now set.
  }, [listing, propertyParam, query]);

  useEffect(() => {
    if (!open && !filtersOpen) return;

    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        rowRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      )
        return;

      setOpen(false);
      // Away without Search is away without applying: the draft is dropped.
      setFiltersOpen(false);
      setOpenChip(null);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      // The open filter's options first, then the panel — Escape backs out one
      // step at a time rather than closing everything at once.
      if (openChip) setOpenChip(null);
      else setFiltersOpen(false);
    };

    window.addEventListener("pointerdown", closeOnOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [filtersOpen, open, openChip]);

  // The field and its panel are one interaction. The header uses this signal
  // to widen the field in place before the portalled panel takes over.
  useEffect(() => {
    onPanelOpenChange?.(filtersOpen);
  }, [filtersOpen, onPanelOpenChange]);

  // Scrolling back up collapses the bar to nothing, and the panel is portalled
  // to `body` — it does not go with the box the way the suggestion list does,
  // so it has to be put away by hand. Adjusted during render rather than in an
  // effect: an effect would paint the panel once over a bar that is no longer
  // there before taking it down, and this closes it for good rather than
  // hiding it, so scrolling back down does not bring it out again.
  const [wasActive, setWasActive] = useState(active);
  if (wasActive !== active) {
    setWasActive(active);

    if (!active) {
      setFiltersOpen(false);
      setOpenChip(null);
      setOpen(false);
    }
  }

  // Derived rather than stored, so the list cannot outlive the text it belongs
  // to — deleting back to two characters hides it in the same render, and
  // scrolling back up takes the list with the bar.
  const showSuggestions =
    active &&
    open &&
    suggestions.length > 0 &&
    query.trim().length >= MIN_CHARS;

  function openPanel() {
    // Seeded here rather than watched in an effect: the panel is only ever
    // opened by a click, so the click is where the draft comes from.
    setDraft(filters);
    // Property type is what the suggest endpoint is actually narrowed by, so
    // its answers are what the panel opens on — the useful opening state,
    // rather than making the first click a second, otherwise empty,
    // interaction.
    setOpenChip("property");
    updatePanelPlacement();
    setOpen(false);
    setFiltersOpen(true);
  }

  /** Keep the portalled panel locked to the navbar field that opened it. */
  function updatePanelPlacement() {
    const searchBar = rowRef.current?.getBoundingClientRect();
    if (!searchBar) return;

    setPanelPlacement({
      left: searchBar.left,
      // The panel's first row replaces the compact field at the same vertical
      // point, so it reads as that navbar search expanding in place.
      top: searchBar.top,
      width: searchBar.width,
    });
  }

  useEffect(() => {
    if (!filtersOpen) return;

    updatePanelPlacement();
    window.addEventListener("resize", updatePanelPlacement);

    // The header deliberately widens this anchor when the panel opens. Watch
    // the element itself (not just the viewport) so the portalled surface
    // follows every frame of that width transition.
    const observer = new ResizeObserver(updatePanelPlacement);
    if (rowRef.current) observer.observe(rowRef.current);

    return () => {
      window.removeEventListener("resize", updatePanelPlacement);
      observer.disconnect();
    };
  }, [filtersOpen]);

  function applyDraft() {
    setFilters(draft);
    setFiltersOpen(false);
    setOpenChip(null);
  }

  function setDraftListing(value: string | null) {
    setDraft((current) => ({ ...current, listing: value }));
  }

  function toggleDraftProperty(type: string) {
    setDraft((current) => ({
      ...current,
      property: current.property.includes(type)
        ? current.property.filter((entry) => entry !== type)
        : [...current.property, type],
    }));
  }

  function toggleDraftExtra(key: string, option: string) {
    setDraft((current) => {
      const chosen = current.extras[key] ?? [];

      return {
        ...current,
        extras: {
          ...current.extras,
          [key]: chosen.includes(option)
            ? chosen.filter((entry) => entry !== option)
            : [...chosen, option],
        },
      };
    });
  }

  function selectSuggestion(item: Suggestion) {
    const label = item.name.trim();
    if (label) {
      void track({
        label,
        tab: listing === "rent" ? "Rent" : "Buy",
        // The first of what was asked for. With several chosen there is no one
        // category the search belongs to, and the first is the one the reader
        // picked first.
        category:
          PROPERTY_TYPES.find((entry) => entry.type === property[0])
            ?.category ?? "Property",
        query: label,
      });
    }

    setOpen(false);
    setFiltersOpen(false);
    setQuery(item.name);
    router.push(`/${item.slug}`);
  }

  function handleKeys(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((index) =>
        index <= 0 ? suggestions.length - 1 : index - 1,
      );
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    // Enter on a highlighted row takes it; Enter with the list open and
    // nothing highlighted takes the best match, which is what pressing Enter
    // straight after typing means.
    if (!showSuggestions) return;

    const chosen = suggestions[highlight >= 0 ? highlight : 0];
    if (chosen) selectSuggestion(chosen);
  }

  /** The field, wherever it is standing — in the bar, or inside the panel. */
  /**
   * The matches, drawn one of two ways.
   *
   * Hanging off the compact navbar field it is a dropdown in its own right:
   * bordered, shadowed, floating over the page. Inside the panel it is the
   * panel's own second half — no border, no shadow, the full width of the
   * sheet — because the sheet is already the surface it would have been
   * floating on.
   */
  function suggestionList(inPanel: boolean) {
    return (
      <div
        id="header-search-suggestions"
        role="listbox"
        aria-label="Matching locations"
        className={
          inPanel
            ? "max-h-[22rem] overflow-y-auto overscroll-contain py-2"
            : "absolute left-0 top-full z-50 mt-1 max-h-[19rem] w-full min-w-[18rem] overflow-y-auto overscroll-contain rounded-xl border py-1 shadow-2xl"
        }
        style={
          inPanel
            ? undefined
            : { backgroundColor: PANEL_RAISED_BG, borderColor: PANEL_LINE }
        }
      >
        {suggestions.map((item, index) => (
          <button
            key={item.slug}
            id={`header-search-suggestion-${index}`}
            type="button"
            role="option"
            aria-selected={index === highlight}
            /* The list closes on `pointerdown` anywhere outside it, and a
               click is a pointerdown first — without this the row would be
               gone before the click landed on it. */
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => selectSuggestion(item)}
            onMouseEnter={() => setHighlight(index)}
            className={`flex w-full items-center gap-3 text-left ${
              inPanel ? "px-5 py-2.5 sm:px-8" : "px-3 py-2"
            } ${index === highlight ? "bg-[#EDF4FF]" : ""}`}
            style={{ color: PANEL_INK }}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-saffron/10 text-saffron">
              <MapPin className="size-4" strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {item.name}
              </span>
              <span className="block truncate text-xs opacity-60">
                {item.context}
              </span>
            </span>
            {/* Three rows can carry the same name — a city, the district
                around it and the state above that — so the label is what
                separates them. */}
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide opacity-60"
              style={{ backgroundColor: PANEL_BG }}
            >
              {item.category}
            </span>
          </button>
        ))}
      </div>
    );
  }

  function field(inPanel: boolean) {
    return (
      <form className="relative min-w-0 flex-1" onSubmit={submit}>
        {!inPanel && (
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <input
          autoFocus={inPanel}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeys}
          onFocus={() => {
            // The compact navbar field is now the trigger for the complete
            // search experience. Once it is focused, this copy is replaced by
            // the panel's larger field, so there is still only one place to
            // type at a time.
            if (!inPanel) {
              openPanel();
              return;
            }

            if (suggestions.length > 0) setOpen(true);
          }}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={showSuggestions}
          aria-controls="header-search-suggestions"
          aria-autocomplete="list"
          aria-activedescendant={
            highlight >= 0 ? `header-search-suggestion-${highlight}` : undefined
          }
          className={
            inPanel
              ? "h-10 w-full bg-transparent px-1 text-sm text-[#0A2036] outline-none placeholder:text-muted-foreground"
              : "h-9 w-full rounded-md border border-white/15 bg-white pl-9 pr-3 text-sm text-foreground outline-none"
          }
        />

        {!inPanel && showSuggestions && suggestionList(false)}
      </form>
    );
  }

  return (
    <div ref={rowRef} className={`h-9 items-center gap-2 ${className}`}>
      {/* The field stays in the bar until the panel takes it — two of them on
          screen at once would be two places to type the same thing. */}
      {!filtersOpen && field(false)}

      {filtersOpen &&
        /* Through a portal to `body`. The sheet covers the bar it belongs to
           and runs wider than it, neither of which it can do from inside a
           field that is `max-w-md` in the header's own stacking context.

           The click-catcher under it takes a click meant for "put this away"
           and keeps it off whatever is behind. Closing is the outside-pointer
           listener's job, above. */
        createPortal(
          <>
            {/* The panel floats over the results it is refining. A quiet veil
                keeps the page visible for orientation without letting the
                busy listing grid compete with the controls. */}
            <div
              aria-hidden
              className="fixed inset-0 z-[44] bg-[#061727]/55 backdrop-blur-[1px]"
            />

            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Search properties"
              className="fixed z-[45] max-h-[calc(100vh-5rem)] overflow-y-auto rounded-xl border border-[#0A2036]/10 bg-white text-[#0A2036] shadow-[0_22px_48px_rgba(2,12,25,0.38)]"
              style={
                panelPlacement
                  ? {
                      left: panelPlacement.left,
                      top: panelPlacement.top,
                      width: panelPlacement.width,
                    }
                  : undefined
              }
            >
              {/* Search details live in one uninterrupted row, like the
                  reference treatment: intent, place, a plain-language prompt,
                  then the optional voice affordance. */}
              <div className="flex min-h-[3.25rem] items-center gap-2 border-b border-slate-200 px-3 sm:min-h-[3.5rem] sm:gap-3 sm:px-6">
                {/* One capsule split in two, not two buttons side by side.

                    Buy and Rent is the only filter here with exactly two
                    answers, and a menu to choose between two is a click spent
                    finding out what the other one was.

                    The chosen half grows in both directions — wider and
                    taller — so it stands out past the other's line and the
                    capsule comes out stepped rather than flat. Navy for the
                    side that is on and saffron for the side that is waiting:
                    the site's own two colours, and the half you are not on is
                    the one worth reaching for. Only the outer
                    edges are rounded: the two meet square, which is what keeps
                    them one shape instead of two lozenges touching. Which edge
                    is round follows position, not selection, so the capsule
                    keeps its ends while the step moves across it. */}
                <div className="flex shrink-0 items-center">
                  {LISTING_TYPES.map((entry, index) => {
                    const selected = draft.listing === entry.type;

                    return (
                      <button
                        key={entry.type}
                        type="button"
                        onClick={() => setDraftListing(entry.type)}
                        aria-pressed={selected}
                        className={`flex items-center justify-center font-bold transition-all duration-200 ${
                          index === 0 ? "rounded-l-full" : "rounded-r-full"
                        } ${
                          selected
                            ? "h-8 bg-[#0A2036] px-3.5 text-[13px] text-white"
                            : "h-6 bg-saffron px-2.5 text-[10px] text-saffron-foreground hover:bg-saffron/90"
                        }`}
                      >
                        {entry.label}
                      </button>
                    );
                  })}
                </div>

                {/* A rule of its own rather than a border on the capsule's
                    box, so it can be shorter than the row: run the full
                    height it meets the row's own top and bottom edges and
                    reads as a wall between two panes. Held short and centred
                    it is what it means — a pause between two controls. */}
                <span
                  aria-hidden
                  className="h-7 w-px shrink-0 bg-slate-200 sm:mx-1"
                />

                {field(true)}

                <span
                  aria-hidden
                  className="h-7 w-px shrink-0 bg-slate-200 sm:mx-1"
                />

                {/* In the bar rather than down in the footer: it is the end of
                    the sentence the row is making — this, here, under these —
                    and a reader who has just finished typing should not have
                    to travel past the whole filter row to act on it. */}
                <button
                  type="button"
                  onClick={applyDraft}
                  className="h-9 w-28 shrink-0 rounded-lg bg-[#0A2036] text-xs font-bold text-white shadow-[0_3px_7px_rgba(2,12,25,0.22)] transition-colors hover:bg-[#12345d]"
                >
                  Search
                </button>
              </div>

              {/* The matches take the panel over while they are showing.
                  Filters answer "narrow this"; a list of places answers "which
                  place" — and the reader typing a name is in the middle of the
                  second question. Shown together the list floated over the
                  chips and half covered them, which is worse than not showing
                  them at all. They come back the moment the list goes. */}
              {showSuggestions ? (
                suggestionList(true)
              ) : (
                <div className="px-5 pb-5 pt-5 sm:px-8">
                  {/* The filters lead the panel's body. The "Filters" label
                    that used to head them is gone: it was naming a row of
                    filters for a reader already looking at one. */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* The one filter the search is actually narrowed by, so it
                      leads the row. It was missing: the chip standing here
                      said "Property Types" and opened the project stages, and
                      the real list had no way in at all. */}
                    <FilterChip
                      label="Property Type"
                      count={draft.property.length}
                      open={openChip === "property"}
                      onToggle={() =>
                        setOpenChip((was) =>
                          was === "property" ? null : "property",
                        )
                      }
                    />
                    <FilterChip
                      label="Availability"
                      count={(draft.extras.availability ?? []).length}
                      open={openChip === "availability"}
                      onToggle={() =>
                        setOpenChip((was) =>
                          was === "availability" ? null : "availability",
                        )
                      }
                    />
                    {EXTRA_FILTERS.map((filter) => (
                      <FilterChip
                        key={filter.key}
                        label={filter.label}
                        count={(draft.extras[filter.key] ?? []).length}
                        open={openChip === filter.key}
                        onToggle={() =>
                          setOpenChip((was) =>
                            was === filter.key ? null : filter.key,
                          )
                        }
                      />
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        setDraft(NO_FILTERS);
                        setOpenChip(null);
                      }}
                      disabled={countFilters(draft) === 0}
                      /* Centred under the Search button, not merely ranged against
                       its edge.

                       Both are given the same `w-28` and the same right edge,
                       so their centres fall on one line without either width
                       having to be measured: `-mr-2` undoes the 8px the
                       panel's body is inset past the search row above it —
                       `px-5 sm:px-8` against `px-3 sm:px-6`. */
                      className="-mr-2 ml-auto w-28 text-center text-sm font-bold text-saffron transition-opacity hover:opacity-75 disabled:pointer-events-none disabled:opacity-40"
                    >
                      Clear filter
                    </button>
                  </div>

                  {/* Answers open beneath the chip row rather than covering the
                    controls beside them, so changing one filter never blocks
                    the next.

                    No box around them: a white card on a white panel was a
                    border drawing a boundary with nothing on either side of
                    it. The gap above and the chip left open are what say
                    which filter these belong to. */}
                  {openChip && (
                    <div
                      className={`mt-9 gap-y-3 ${
                        openChip === "property"
                          ? /* `max-content` columns, not four equal quarters:
                             the panel is as wide as the navbar and quarters
                             of it left the options strung out across the
                             whole thing. Sized to their own labels they pack
                             to the left and still line up in a grid. */
                            "grid w-fit grid-cols-[repeat(4,max-content)] gap-x-9"
                          : "flex flex-wrap gap-x-10"
                      }`}
                    >
                      {openChip === "availability" &&
                        PROJECT_STAGES.map((option) => (
                          <FilterOption
                            key={option}
                            label={option}
                            checked={(draft.extras.availability ?? []).includes(
                              option,
                            )}
                            onToggle={() =>
                              toggleDraftExtra("availability", option)
                            }
                          />
                        ))}

                      {/* Four across, so the eight fall into two even rows
                        rather than one long line that runs the width of the
                        panel and makes the reader track back to find the
                        next. */}
                      {openChip === "property" &&
                        PROPERTY_TYPES.map((entry) => (
                          <FilterOption
                            key={entry.type}
                            label={entry.label}
                            checked={draft.property.includes(entry.type)}
                            onToggle={() => toggleDraftProperty(entry.type)}
                          />
                        ))}

                      {EXTRA_FILTERS.filter(
                        (filter) => filter.key === openChip,
                      ).map((filter) =>
                        filter.options.map((option) => (
                          <FilterOption
                            key={option}
                            label={option}
                            checked={(draft.extras[filter.key] ?? []).includes(
                              option,
                            )}
                            onToggle={() =>
                              toggleDraftExtra(filter.key, option)
                            }
                          />
                        )),
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}

/** One filter, named, with what it is set to counted beside it. */
function FilterChip({
  label,
  count,
  open,
  onToggle,
}: {
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={`flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-colors ${
        open
          ? "border-saffron/40 bg-saffron/10 text-[#0A2036]"
          : "hover:border-saffron/50"
      }`}
      style={
        open
          ? undefined
          : { backgroundColor: PANEL_RAISED_BG, borderColor: PANEL_LINE }
      }
    >
      {label}
      {count > 0 && (
        <span className="grid size-[18px] shrink-0 place-items-center rounded-full bg-saffron text-[10px] font-bold text-saffron-foreground">
          {count}
        </span>
      )}
      <ChevronDown
        className={`size-3.5 shrink-0 opacity-50 transition-transform ${
          open ? "rotate-180" : ""
        }`}
      />
    </button>
  );
}

/**
 * One answer to the open filter.
 *
 * A box rather than a pill, and the same box for the single-choice filters as
 * for the many-choice ones: the row is read as a set of things that are on or
 * off, and two shapes would be claiming a difference the panel does not make.
 */
function FilterOption({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className="flex items-center gap-2 text-xs font-medium text-muted-foreground"
    >
      <span
        /* Navy, the panel's own "on" colour — the same one filling the
           selected half of the Buy/Rent capsule and the Search button. Saffron
           is what the panel uses to offer something, not to confirm it. */
        className={`grid size-5 shrink-0 place-items-center rounded-sm border transition-colors ${
          checked ? "border-[#0A2036] bg-[#0A2036]" : ""
        }`}
        style={checked ? undefined : { borderColor: PANEL_LINE }}
      >
        <Check
          className={`size-3.5 ${checked ? "text-white" : "text-transparent"}`}
          strokeWidth={3}
        />
      </span>
      <span className={checked ? "" : "opacity-70"}>{label}</span>
    </button>
  );
}
