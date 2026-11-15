"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WIDTHS = [640, 960, 1280, 1920];

/** Listing photos are Unsplash URLs today; ask for the width the screen needs. */
export function sized(url: string, width: number) {
  const next = new URL(url);
  next.searchParams.set("w", String(width));
  next.searchParams.set("q", "80");
  return next.toString();
}

function scrollStrip(strip: HTMLDivElement | null, target: number, count: number) {
  if (!strip) return;
  const clamped = Math.max(0, Math.min(count - 1, target));
  strip.scrollTo({ left: clamped * strip.clientWidth, behavior: "smooth" });
}

/**
 * The left panel of a reel: a horizontal, snap-scrolling photo strip.
 *
 * Swipe or trackpad on touch/laptops; arrow buttons and ←/→ on desktop (the
 * keys only while this reel is the active one, so every mounted reel doesn't
 * flip at once).
 */
export function ReelPhotos({
  photos,
  alt,
  active,
  eager,
  className,
}: {
  photos: string[];
  alt: string;
  /** This reel is the one on screen — enables ←/→. */
  active: boolean;
  /** Load now instead of lazily (the active reel and the next one). */
  eager: boolean;
  className?: string;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const goTo = (target: number) => scrollStrip(stripRef.current, target, photos.length);

  useEffect(() => {
    if (!active) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea")) return;
      const strip = stripRef.current;
      if (!strip || (event.key !== "ArrowRight" && event.key !== "ArrowLeft")) return;
      const current = Math.round(strip.scrollLeft / strip.clientWidth);
      scrollStrip(strip, current + (event.key === "ArrowRight" ? 1 : -1), photos.length);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, photos.length]);

  return (
    <div className={cn("group/photos relative overflow-hidden bg-neutral-900", className)}>
      <div
        ref={stripRef}
        onScroll={(event) => {
          const strip = event.currentTarget;
          setIndex(Math.round(strip.scrollLeft / strip.clientWidth));
        }}
        className="no-scrollbar flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
      >
        {photos.map((photo, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${photo}-${i}`}
            src={sized(photo, 1280)}
            srcSet={WIDTHS.map((width) => `${sized(photo, width)} ${width}w`).join(", ")}
            sizes="(min-width: 1280px) 440px, (min-width: 1024px) 400px, 100vw"
            alt={i === 0 ? alt : `${alt} — photo ${i + 1}`}
            loading={eager && i === 0 ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
            className="size-full shrink-0 snap-center object-cover"
          />
        ))}
      </div>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/65 disabled:pointer-events-none disabled:opacity-0! group-hover/photos:opacity-100 lg:grid"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={index === photos.length - 1}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/65 disabled:pointer-events-none disabled:opacity-0! group-hover/photos:opacity-100 lg:grid"
          >
            <ChevronRight className="size-5" />
          </button>

          <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white tabular-nums backdrop-blur-sm max-lg:top-16">
            {index + 1}/{photos.length}
          </span>

          <div className="absolute inset-x-0 bottom-3 hidden justify-center gap-1.5 lg:flex">
            {photos.map((photo, i) => (
              <button
                key={`dot-${photo}-${i}`}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Photo ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "h-1.5 rounded-full bg-white/50 transition-all",
                  i === index ? "w-5 bg-white" : "w-1.5 hover:bg-white/80",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
