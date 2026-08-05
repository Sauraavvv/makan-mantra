"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { PropertyCard } from "@/components/property/property-card";
import { makeDummyProperties, type DummyProperty } from "@/lib/dummy-properties";

/** Shown as soon as the page loads. */
const INITIAL_VISIBLE = 20;

/** Added each time the sentinel comes into view. */
const SCROLL_STEP = 5;

/** Once a page is fully revealed, the rest is reached through pagination. */
const PAGE_SIZE = 40;

/**
 * Placeholder result count — listings are not wired up yet, so there is no real
 * total to page through. Swap this for the API's count when they land.
 */
const TOTAL_RESULTS = 240;

const TOTAL_PAGES = Math.max(1, Math.ceil(TOTAL_RESULTS / PAGE_SIZE));

/** Page numbers to render, collapsing long runs into a single gap. */
function pageWindow(current: number, total: number): Array<number | "gap"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  return sorted.flatMap((page, index) => {
    const previous = sorted[index - 1];
    return previous && page - previous > 1 ? ["gap" as const, page] : [page];
  });
}

export function PropertyList({ cityName }: { cityName: string }) {
  const [page, setPage] = useState(1);
  const [visible, setVisible] = useState(INITIAL_VISIBLE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const offset = (page - 1) * PAGE_SIZE;
  const pageCount = Math.min(PAGE_SIZE, TOTAL_RESULTS - offset);
  const shown = Math.min(visible, pageCount);
  const items: DummyProperty[] = makeDummyProperties(offset, shown);
  const pageFullyShown = shown >= pageCount;

  useEffect(() => {
    if (pageFullyShown) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;

        // A short delay so the spinner registers instead of flashing.
        setTimeout(() => setVisible((current) => current + SCROLL_STEP), 350);
      },
      { rootMargin: "400px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [pageFullyShown, shown]);

  const goToPage = useCallback((next: number) => {
    setPage(next);
    // Each page starts from the top with its own first batch.
    setVisible(INITIAL_VISIBLE);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div>
      <div ref={topRef} className="scroll-mt-24" />

      <div className="space-y-3">
        {items.map((property) => (
          <PropertyCard key={property.id} property={property} cityName={cityName} />
        ))}
      </div>

      {!pageFullyShown && (
        <div ref={sentinelRef} className="py-8 text-center">
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading more properties…
          </p>
        </div>
      )}

      {pageFullyShown && TOTAL_PAGES > 1 && (
        <nav
          aria-label="Property results pages"
          className="mt-6 flex flex-wrap items-center justify-center gap-1.5"
        >
          <PageButton
            onClick={() => goToPage(page - 1)}
            disabled={page === 1}
            label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </PageButton>

          {pageWindow(page, TOTAL_PAGES).map((entry, index) =>
            entry === "gap" ? (
              <span key={`gap-${index}`} className="px-1.5 text-sm text-muted-foreground">
                …
              </span>
            ) : (
              <PageButton
                key={entry}
                onClick={() => goToPage(entry)}
                current={entry === page}
                label={`Page ${entry}`}
              >
                {entry}
              </PageButton>
            ),
          )}

          <PageButton
            onClick={() => goToPage(page + 1)}
            disabled={page === TOTAL_PAGES}
            label="Next page"
          >
            <ChevronRight className="size-4" />
          </PageButton>
        </nav>
      )}

      {pageFullyShown && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Showing {offset + 1}–{offset + shown} of {TOTAL_RESULTS.toLocaleString("en-IN")} properties
        </p>
      )}
    </div>
  );
}

function PageButton({
  children,
  onClick,
  disabled = false,
  current = false,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  current?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={current ? "page" : undefined}
      className={
        current
          ? "grid size-9 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
          : "grid size-9 place-items-center rounded-lg border border-border bg-background text-sm font-medium transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
      }
    >
      {children}
    </button>
  );
}
