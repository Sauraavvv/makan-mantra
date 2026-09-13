"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

/** Short of this a search matches most of the country, so we do not ask. */
const MIN_CHARS = 3;

/** Long enough that a typed word costs one request rather than one per letter. */
const DEBOUNCE_MS = 200;

type Suggestion = {
  name: string;
  category: string;
  context: string;
  slug: string;
};

/**
 * Moving this page to somewhere else.
 *
 * Every row in `location_pages` is one place under one property type and one
 * listing type, and carries the slug of the page for exactly that pairing. So
 * the search is narrowed to the pairing this page already is: picking Gurugram
 * from a page about flats for rent lands on flats for rent in Gurugram, not on
 * whatever Gurugram page happened to sort first. It changes the place and
 * nothing else, which is the only thing being asked of it.
 */
export function LocationSearchBox({
  propertyType,
  listingType,
  currentLocation,
}: {
  propertyType?: string;
  listingType?: string;
  currentLocation?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  // -1 is "nothing picked yet", which is not the same as "the first one".
  const [highlight, setHighlight] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

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
          if (propertyType) params.set("type", propertyType);
          if (listingType) params.set("listing", listingType);

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
  }, [listingType, propertyType, query]);

  useEffect(() => {
    if (!open) return;

    const close = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };

    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  // Derived rather than stored, so the list cannot outlive the text it belongs
  // to — deleting back to two characters hides it in the same render.
  const showSuggestions =
    open && suggestions.length > 0 && query.trim().length >= MIN_CHARS;

  function handleKeys(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const chosen = suggestions[highlight >= 0 ? highlight : 0];
      if (chosen) router.push(`/${chosen.slug}`);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative py-3">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeys}
        placeholder={
          currentLocation ? `Change from ${currentLocation}` : "Change location"
        }
        aria-label="Search another location"
        role="combobox"
        aria-expanded={showSuggestions}
        aria-controls="filter-location-suggestions"
        aria-autocomplete="list"
        aria-activedescendant={
          highlight >= 0 ? `filter-location-suggestion-${highlight}` : undefined
        }
        className="h-9 w-full truncate rounded-lg border border-border bg-background pl-8 pr-8 text-[13px] outline-none transition-colors focus:border-primary/60"
      />

      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setOpen(false);
          }}
          aria-label="Clear"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}

      {showSuggestions && (
        /* Over the sections below rather than pushing them down: the list is
           a passing thing and the panel behind it should still read as one
           standing column. */
        <div
          id="filter-location-suggestions"
          role="listbox"
          aria-label="Matching locations"
          className="absolute left-0 right-0 top-full z-20 max-h-[17rem] overflow-y-auto overscroll-contain rounded-lg border border-border bg-popover py-1 text-foreground shadow-2xl"
        >
          {suggestions.map((item, index) => (
            <button
              key={item.slug}
              id={`filter-location-suggestion-${index}`}
              type="button"
              role="option"
              aria-selected={index === highlight}
              // Keeps the field focused, so the blur does not close the list
              // out from under the click that is landing on it.
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => router.push(`/${item.slug}`)}
              onMouseEnter={() => setHighlight(index)}
              className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-left ${
                index === highlight ? "bg-accent/60" : ""
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-foreground">
                  {item.name}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {item.context}
                </span>
              </span>
              {/* Three rows can carry the same name — a city, the district
                  around it and the state above that — so the label is what
                  separates them. */}
              <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                {item.category}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
