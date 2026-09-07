"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Heart, MapPin } from "lucide-react";

import { useSaved } from "@/context/saved-context";
import { generateSlug } from "@/lib/utils/slug";

/**
 * The shortlist, read from the header.
 *
 * The dashboard already lists these, but the point of a shortlist is comparing
 * two places while looking at a third — which a page you have to navigate to,
 * losing the one you were on, is the wrong shape for. So it opens where it is
 * counted, and a listing is one click from there.
 *
 * Shown to signed-out visitors as well: the shortlist lives on the device until
 * there is an account to move it to, and hiding it would make their own saves
 * look lost.
 */
export function ShortlistMenu() {
  const { items, toggle, loaded } = useSaved();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Closing on Escape as well as on a click outside: the panel covers the page
  // it opened over, and reaching back for the button to shut it is a detour.
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    /* Not `relative`, deliberately. Without a containing block of its own the
       panel below measures from the header — the nearest positioned ancestor —
       so `right-4` lands on the same gutter the header's own `px-4` sets, and
       `top-full` on its lower edge. Hung off the 36px button instead it could
       only ever sit as far right as the button did, which is short of the
       gutter by the width of everything that follows it. */
    <div ref={menuRef} className="shrink-0">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={items.length ? `Shortlist, ${items.length} saved` : "Shortlist"}
        title="Shortlist"
        className="relative grid size-9 place-items-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <Heart className={`h-4 w-4 ${items.length ? "fill-saffron text-saffron" : ""}`} />
        {/* The count only appears once the first read has settled, so it does
            not start at zero and correct itself a moment later. */}
        {loaded && items.length > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-saffron px-1 text-[10px] font-bold leading-4 text-saffron-foreground">
            {items.length > 99 ? "99+" : items.length}
          </span>
        )}
      </button>

      {open && (
        /* `top-full` is the header's full height — its 64px row plus its own 1px
           rule — so the panel starts exactly where the navbar ends, and no top
           border or top radius keeps that one line. */
        <div className="absolute right-4 top-full z-50 w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-b-xl border border-t-0 border-border bg-popover text-foreground shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-muted px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Shortlisted
            </p>
            {items.length > 0 && (
              <Link
                href="/dashboard/saved"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-primary hover:underline"
              >
                See all
              </Link>
            )}
          </div>

          {!loaded ? (
            <div className="space-y-2 p-3">
              {[0, 1].map((row) => (
                <div key={row} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <Heart className="mx-auto size-7 text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-3 text-sm font-semibold">Nothing shortlisted yet</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Tap the heart on any listing and it will wait for you here.
              </p>
            </div>
          ) : (
            /* Four rows before it scrolls — a row is a 48px thumbnail in 6px
               of padding either side, so four come to 240px. Enough to see what
               is on the list without the panel covering the page it opened
               over; "See all" above is there for the rest. */
            <ul className="max-h-[15rem] overflow-y-auto p-1.5">
              {items.map((item) => (
                <li key={item.propertyId} className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-muted">
                  <Link
                    href={`/property/${item.propertyId}/${generateSlug(item.title)}`}
                    onClick={() => setOpen(false)}
                    className="flex min-w-0 flex-1 items-center gap-2.5"
                  >
                    <span className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image || "/hero-home.jpg"}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{item.title}</span>
                      <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <MapPin className="size-3 shrink-0" />
                        {[item.locality, item.city].filter(Boolean).join(", ")}
                      </span>
                      <span className="mt-0.5 block text-xs font-bold text-foreground">{item.price}</span>
                    </span>
                  </Link>
                  {/* Removing from the list the list is showing: the heart is
                      already the gesture for this everywhere else on the site. */}
                  <button
                    onClick={() => void toggle(item.propertyId, item)}
                    aria-label={`Remove ${item.title} from shortlist`}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-saffron transition-colors hover:bg-accent"
                  >
                    <Heart className="size-4 fill-current" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
