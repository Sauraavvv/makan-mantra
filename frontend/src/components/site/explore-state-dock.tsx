"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useLocation } from "@/context/location-context";
import { stateExploreHref } from "@/lib/state-routes";
import { stateCardImage } from "@/lib/state-images";

/**
 * A standing way into the visitor's own state, docked to the right of the page.
 *
 * The home page is national — its listings, its markets and its builders are
 * everywhere at once — so the one page written about where the visitor actually
 * is sits several scrolls down, or behind the header's picker. This is the
 * shortcut, and it follows the location rather than naming a state of its own:
 * it reads the same settled value the rest of the site does, so detecting
 * Haryana or picking Jharkhand in the header re-points it in the same breath.
 */
export function ExploreStateDock() {
  const { meta } = useLocation();
  const [open, setOpen] = useState(true);

  // "India" is what the context reports when no state has settled yet — the
  // visitor is new, or picked All India deliberately. There is no state page
  // behind either, so there is nothing here to offer.
  if (meta.label === "India") return null;

  const href = stateExploreHref(meta.label);

  return (
    /* Hidden on phones. The chat launcher already holds the bottom-right
       corner there, and a second floating thing on a 360px screen is one too
       many. */
    <div className="fixed right-0 top-1/2 z-40 hidden -translate-y-1/2 sm:block">
      {open ? (
        <div className="flex items-stretch overflow-hidden rounded-l-xl border border-r-0 border-border bg-white shadow-lg">
          <Link
            href={href}
            className="flex items-center gap-2 py-2 pl-2.5 pr-2 transition-colors hover:bg-saffron/[0.07]"
          >
            <Image
              src={stateCardImage(meta.label)}
              alt=""
              width={160}
              height={128}
              className="h-7 w-10 shrink-0 object-contain"
            />
            <span className="min-w-0">
              <span className="block text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                Explore
              </span>
              <span className="block max-w-[7rem] truncate text-xs font-bold leading-4 text-foreground">
                {meta.label}
              </span>
            </span>
          </Link>

          {/* Folds away rather than closing for good: someone who wants the page
              clear right now should not have to lose the shortcut to get it. */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Collapse"
            className="grid w-5 shrink-0 place-items-center border-l border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="size-3.5" strokeWidth={2} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Explore ${meta.label}`}
          className="flex items-center gap-0.5 rounded-l-lg border border-r-0 border-border bg-white py-1.5 pl-1.5 pr-1 shadow-lg transition-colors hover:bg-saffron/[0.07]"
        >
          <ChevronLeft className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
          <Image
            src={stateCardImage(meta.label)}
            alt=""
            width={160}
            height={128}
            className="h-5 w-7 shrink-0 object-contain"
          />
        </button>
      )}
    </div>
  );
}
