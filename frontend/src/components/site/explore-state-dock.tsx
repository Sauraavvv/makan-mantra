"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, Globe } from "lucide-react";

import { useLocation } from "@/context/location-context";
import { stateExploreHref } from "@/lib/state-routes";

/**
 * How long the dock spends sliding out past the hero's right edge, in ms.
 * Kept in step with the `duration-200` on the sliding wrapper below — the swap
 * is timed off this number, so the two have to agree.
 */
const SLIDE_MS = 200;

/**
 * A standing way into the visitor's own state, docked to the right of the hero.
 *
 * The home page is national — its listings, its markets and its builders are
 * everywhere at once — so the one page written about where the visitor actually
 * is sits several scrolls down, or behind the header's picker. This is the
 * shortcut, offered in the hero and gone once the reader has scrolled past it,
 * and it follows the location rather than naming a state of its own: it reads
 * the same settled value the rest of the site does, so detecting Haryana or
 * picking Jharkhand in the header re-points it in the same breath.
 */
export function ExploreStateDock() {
  const { meta } = useLocation();
  // Folded to begin with: the hero is the first thing a visitor reads, and a
  // panel that opens itself over the corner of it is asking for attention it
  // has not been given. The globe waits until it is wanted.
  const [open, setOpen] = useState(false);
  // True only in the middle of a swap, while the dock is parked off the right
  // edge. Folded and expanded are different widths, so neither can grow into
  // the other honestly — instead the dock withdraws, changes shape out of
  // sight, and slides back out as the other thing.
  const [tucked, setTucked] = useState(false);
  const timer = useRef<number | null>(null);
  // A second click landing mid-slide would swap the contents while they are
  // still travelling, so the dock ignores one until it has arrived.
  const sliding = useRef(false);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  const swapTo = useCallback((next: boolean) => {
    if (sliding.current) return;

    // Someone who has asked for less motion gets the change itself and none of
    // the travel: sliding it out only to slide it back would be the whole of
    // what they turned off.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setOpen(next);
      return;
    }

    sliding.current = true;
    setTucked(true);
    timer.current = window.setTimeout(() => {
      setOpen(next);
      // Two frames, not one: the first lets React paint the new contents while
      // they are still parked off-edge, so the second has a transform to
      // animate away from. Released in the same frame as the paint, the
      // browser would see no change to transition and the dock would appear in
      // place instead of sliding.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setTucked(false);
          sliding.current = false;
        }),
      );
    }, SLIDE_MS);
  }, []);

  // "India" is what the context reports when no state has settled yet — the
  // visitor is new, or picked All India deliberately. There is no state page
  // behind either, so there is nothing here to offer.
  if (meta.label === "India") return null;

  return (
    /* Absolute, not fixed: it belongs to the hero and leaves with it, rather
       than following the reader down a page it has nothing to say about.

       Hidden on phones. The chat launcher already holds the bottom-right corner
       there, and a second floating thing on a 360px screen is one too many. */
    <div className="absolute right-0 top-14 z-20 hidden sm:block">
      {/* The travelling layer. `translate-x-full` is measured against this
          element's own width, so folded and expanded each clear the edge
          exactly, and the hero's `overflow-x-clip` swallows whatever is past
          it — including the shadow, which would otherwise smear along the
          edge as a giveaway that the dock is still there. */}
      <div
        className={`transition-transform duration-200 ease-out ${
          tucked ? "translate-x-full" : "translate-x-0"
        }`}
      >
        {open ? (
          <div className="flex items-stretch overflow-hidden rounded-l-2xl border border-r-0 border-border bg-white shadow-lg">
            <Link
              href={stateExploreHref(meta.label)}
              className="flex items-center py-2.5 pl-3 pr-1.5"
            >
              <span className="min-w-0">
                <span className="block text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                  Explore
                </span>
                <span className="block max-w-[9rem] truncate text-[13px] font-bold leading-[18px] text-foreground">
                  {meta.label}
                </span>
              </span>
            </Link>

            {/* Folds away rather than closing for good: someone who wants the page
                clear right now should not have to lose the shortcut to get it. */}
            <button
              type="button"
              onClick={() => swapTo(false)}
              aria-label="Collapse"
              className="grid w-5 shrink-0 place-items-center border-l border-border text-muted-foreground"
            >
              <ChevronRight className="size-3.5" strokeWidth={2} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => swapTo(true)}
            aria-label={`Explore ${meta.label}`}
            className="flex items-center rounded-l-full border border-r-0 border-border bg-white py-2.5 pl-3 pr-2.5 shadow-lg"
          >
            {/* Folded, the tab has no room for the state's name, so it carries a
                mark instead — and only here. Expanded, the name is right there
                and a glyph beside it would be saying the same thing twice. */}
            <Globe className="size-[22px] shrink-0 text-foreground" strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}
