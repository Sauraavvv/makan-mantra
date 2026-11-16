"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, X } from "lucide-react";
import { useRecentProperties } from "@/context/recent-properties-context";
import { useSearchHistory } from "@/context/search-history-context";
import type { RankedReel, ReelSearch } from "@/lib/reels";
import { ReelCard } from "@/components/reels/reel-card";
import { sized } from "@/components/reels/reel-photos";

const PAGE_SIZE = 8;
/** Fetch the next page when this many reels are left below the current one. */
const PREFETCH_AT = 3;
/** Reels further than this from the current one render as empty placeholders. */
const WINDOW = 2;
/** How long a reel must stay on screen to count as "viewed". */
const VIEW_AFTER_MS = 1500;

/**
 * The Reels window: a full-screen, vertically snapping feed of properties,
 * ordered by the visitor's search history (see `rankReels`).
 *
 * - The feed order is fixed when the window opens — searches made meanwhile
 *   don't reshuffle what is already on screen.
 * - The URL follows the reel on screen (`/reels?p=<id>`), so a refresh or a
 *   shared link reopens on it; Back or ✕ closes the window.
 * - Only the reels near the current one are rendered; the rest are
 *   same-height placeholders, so a long session keeps a light page.
 *
 * `overlay`: opened from a page on the site (the intercepted `@modal/(.)reels`
 * route). That page stays mounted underneath and shows through, blurred; ✕
 * and Esc go back to it. Without it (a shared link, a refresh) there is no
 * page underneath, so the current property's photo, blurred, fills in.
 */
export function ReelsViewer({
  startId,
  overlay = false,
}: {
  startId: string | null;
  overlay?: boolean;
}) {
  const router = useRouter();
  const { items: history, loaded: historyLoaded } = useSearchHistory();
  const { track } = useRecentProperties();

  const [reels, setReels] = useState<RankedReel[]>([]);
  const [cursor, setCursor] = useState<number | null>(0);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [active, setActive] = useState(0);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const searchesRef = useRef<ReelSearch[] | null>(null);
  const busyRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (busyRef.current || cursor === null || !searchesRef.current) return;
    busyRef.current = true;
    setStatus("loading");

    try {
      const response = await fetch("/api/reels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          searches: searchesRef.current,
          cursor,
          limit: PAGE_SIZE,
          start: cursor === 0 ? startId : undefined,
        }),
      });
      if (!response.ok) throw new Error(String(response.status));

      const data = (await response.json()) as { items: RankedReel[]; nextCursor: number | null };
      setReels((current) => [...current, ...data.items]);
      setCursor(data.nextCursor);
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      busyRef.current = false;
    }
  }, [cursor, startId]);

  // First page, once the search history has been read (it may come from the
  // account, which takes a request). Freezing it here keeps paging consistent.
  useEffect(() => {
    if (!historyLoaded || searchesRef.current) return;
    searchesRef.current = history.map(({ label, tab, category, query }) => ({
      label,
      tab,
      category,
      query,
    }));
    void loadMore();
  }, [historyLoaded, history, loadMore]);

  // Which reel is on screen.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || reels.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(Number((entry.target as HTMLElement).dataset.reelIndex));
          }
        }
      },
      { root: scroller, threshold: 0.6 },
    );

    scroller.querySelectorAll("[data-reel-index]").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [reels.length]);

  const current = reels[active];

  // URL follows the reel; more reels load before the end is reached.
  useEffect(() => {
    if (!current) return;
    window.history.replaceState(window.history.state, "", `/reels?p=${encodeURIComponent(current.id)}`);
    if (reels.length - 1 - active < PREFETCH_AT) void loadMore();
  }, [current, active, reels.length, loadMore]);

  // Count a view once the reel has stayed on screen for a moment.
  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => {
      void track(current.id, {
        title: current.title,
        price: current.priceLabel,
        locality: current.locality,
        city: current.city,
        image: current.photos[0],
        area: `${current.area} Sq.Ft.`,
      });
    }, VIEW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [current, track]);

  const goTo = useCallback((index: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTo({ top: index * scroller.clientHeight, behavior: "smooth" });
  }, []);

  const close = useCallback(() => {
    // As an overlay, Back is the page underneath. A direct visit (shared link,
    // new tab) has nowhere to go back to, so it lands on the home page.
    const cameFromSite = document.referrer.startsWith(window.location.origin);
    if (overlay || (cameFromSite && window.history.length > 1)) router.back();
    else router.push("/");
  }, [overlay, router]);

  // The page underneath must not scroll along while the overlay is open.
  useEffect(() => {
    if (!overlay) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [overlay]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea")) return;
      if (event.key === "Escape") return close();
      if (["ArrowDown", "PageDown", "j"].includes(event.key)) {
        event.preventDefault();
        goTo(active + 1);
      }
      if (["ArrowUp", "PageUp", "k"].includes(event.key)) {
        event.preventDefault();
        goTo(Math.max(0, active - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close, goTo]);

  const finished = cursor === null && reels.length > 0;

  return (
    <div
      className={
        overlay
          ? "fixed inset-0 z-50 bg-black/70 text-white backdrop-blur-xl animate-in fade-in duration-300"
          : "fixed inset-0 z-50 bg-neutral-950 text-white"
      }
    >
      {/* Standalone page only — desktop backdrop: the current property's
          photo, blurred to fill the window around the card (phones show the
          photo full-screen instead). Keyed by reel so each change fades in; a
          small width is plenty once blurred. */}
      {!overlay && current && (
        // <picture> rather than a hidden <img>: a display:none image is still
        // downloaded, and phones never show this.
        <picture key={current.id}>
          <source media="(min-width: 1024px)" srcSet={sized(current.photos[0], 480)} />
          <img
            src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden size-full scale-110 animate-in object-cover blur-3xl duration-500 fade-in lg:block"
          />
        </picture>
      )}
      {!overlay && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden bg-black/70 lg:block" />
      )}

      {/* Top bar: over the photo on phones, above the card on desktop. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-14 items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-4 lg:h-16 lg:bg-none lg:px-6">
        <Link
          href="/"
          className="pointer-events-auto flex items-center gap-2.5 text-xl font-bold tracking-tight lg:text-2xl"
        >
          <span>
            Makan <span className="text-saffron">Mantraa</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={close}
          aria-label="Close reels"
          className="pointer-events-auto grid size-10 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
        >
          <X className="size-5" />
        </button>
      </div>

      <div
        ref={scrollerRef}
        className="no-scrollbar relative size-full snap-y snap-mandatory overflow-y-auto overscroll-contain"
      >
        {reels.map((reel, index) => (
          <section
            key={reel.id}
            data-reel-index={index}
            className="flex h-dvh snap-start snap-always items-stretch justify-center lg:px-24 lg:pb-6 lg:pt-16"
          >
            {Math.abs(index - active) <= WINDOW ? (
              <div className="size-full lg:flex lg:max-w-6xl lg:items-center">
                <ReelCard
                  reel={reel}
                  active={index === active}
                  eager={index === active || index === active + 1}
                  nav={{
                    onPrev: () => goTo(Math.max(0, index - 1)),
                    onNext: () => goTo(index + 1),
                    canPrev: index > 0,
                    canNext: !(finished && index >= reels.length - 1),
                  }}
                />
              </div>
            ) : null}
          </section>
        ))}

        {/* Loading / error / end of feed — its own snap stop at the bottom. */}
        {(reels.length === 0 || status !== "idle" || finished) && (
          <section className="grid h-dvh snap-start place-items-center px-6 text-center">
            {status === "error" ? (
              <div>
                <p className="text-sm text-white/80">Couldn&apos;t load more properties.</p>
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/25"
                >
                  <RotateCcw className="size-4" />
                  Try again
                </button>
              </div>
            ) : finished ? (
              <div>
                <p className="text-lg font-semibold">You&apos;re all caught up</p>
                <p className="mt-1 text-sm text-white/70">
                  Search for a city or locality to get new reels for it.
                </p>
                <button
                  type="button"
                  onClick={() => goTo(0)}
                  className="mt-4 rounded-full bg-saffron px-5 py-2 text-sm font-semibold text-saffron-foreground"
                >
                  Back to the first reel
                </button>
              </div>
            ) : (
              <Loader2 className="size-8 animate-spin text-white/70" aria-label="Loading" />
            )}
          </section>
        )}
      </div>
    </div>
  );
}
