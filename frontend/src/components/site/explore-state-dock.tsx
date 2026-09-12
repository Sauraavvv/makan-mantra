"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Globe } from "lucide-react";

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
export function ExploreStateDock({
  /**
   * Where the dock lives.
   *
   * `"hero"` keeps it inside the banner it is placed in, so it scrolls away
   * with it — the home page's arrangement, and the reason this stopped being
   * `fixed`: riding the right edge down the whole page put a second standing
   * button beside the chat launcher on every section.
   *
   * `"viewport"` pins it to the middle of the right edge and leaves it there.
   * On an explore page that is the whole point — the reader is deep in one
   * state's page and the shortcut is worth having the whole way down.
   */
  placement = "hero",
  /**
   * Which edge it docks against. Everything about the shape follows from it —
   * which corners are round, which border the panel drops so it meets the
   * edge flush, which way the collapse arrow points, and which way the dock
   * travels when it tucks out of sight.
   */
  side = "right",
}: {
  placement?: "hero" | "viewport";
  side?: "left" | "right";
} = {}) {
  const onLeft = side === "left";
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
    /* Hidden on phones either way. The chat launcher already holds the
       bottom-right corner there, and a second floating thing on a 360px screen
       is one too many.

       `z-30` when pinned: under the header and under the chat launcher, both
       of which it would otherwise cross on the way down. */
    <div
      className={`hidden sm:block ${onLeft ? "left-0" : "right-0"} ${
        placement === "viewport"
          ? "fixed top-1/2 z-30 -translate-y-1/2"
          : "absolute top-14 z-20"
      }`}
    >
      {/* The travelling layer. The full-width shift is measured against this
          element's own width, so folded and expanded each clear the edge
          exactly, and whatever is past it is swallowed — including the shadow,
          which would otherwise smear along the edge as a giveaway that the
          dock is still there. It leaves by the edge it is docked to. */}
      <div
        className={`transition-transform duration-200 ease-out ${
          tucked
            ? onLeft
              ? "-translate-x-full"
              : "translate-x-full"
            : "translate-x-0"
        }`}
      >
        {open ? (
          <div
            className={`flex items-stretch overflow-hidden border border-border bg-white shadow-lg ${
              onLeft
                ? "flex-row-reverse rounded-r-2xl border-l-0"
                : "rounded-l-2xl border-r-0"
            }`}
          >
            <Link
              href={stateExploreHref(meta.label)}
              className={`flex items-center py-2.5 ${
                onLeft ? "pl-1.5 pr-3" : "pl-3 pr-1.5"
              }`}
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
              className={`grid w-5 shrink-0 place-items-center border-border text-muted-foreground ${
                onLeft ? "border-r" : "border-l"
              }`}
            >
              {/* Points the way out, which is whichever edge it came from. */}
              {onLeft ? (
                <ChevronLeft className="size-3.5" strokeWidth={2} />
              ) : (
                <ChevronRight className="size-3.5" strokeWidth={2} />
              )}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => swapTo(true)}
            aria-label={`Explore ${meta.label}`}
            className={`flex items-center border border-border bg-white py-2.5 shadow-lg ${
              onLeft
                ? "rounded-r-full border-l-0 pl-2.5 pr-3"
                : "rounded-l-full border-r-0 pl-3 pr-2.5"
            }`}
          >
            {/* Folded, the tab has no room for the state's name, so it carries a
                mark instead — and only here. Expanded, the name is right there
                and a glyph beside it would be saying the same thing twice. */}
            <Globe
              className="size-[22px] shrink-0 text-foreground"
              strokeWidth={2}
            />
          </button>
        )}
      </div>
    </div>
  );
}
