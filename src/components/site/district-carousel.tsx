"use client";

import { useRef } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";

export function DistrictCarousel({ districts, stateName }: { districts: string[]; stateName: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      left: direction === "left" ? -scroller.clientWidth * 0.85 : scroller.clientWidth * 0.85,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      <div className="mb-5">
        <h2 className="text-3xl font-bold leading-tight md:text-4xl">Districts in {stateName}</h2>
        <div className="mt-2 flex items-center justify-between gap-4">
          <p className="min-w-0 flex-1 truncate text-sm leading-relaxed text-muted-foreground">
            Browse the administrative districts that shape local movement, housing demand, and area-level discovery across {stateName}.
          </p>
          {districts.length > 5 && (
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                aria-label="Scroll districts left"
                onClick={() => scroll("left")}
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-secondary"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                aria-label="Scroll districts right"
                onClick={() => scroll("right")}
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-secondary"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div ref={scrollerRef} className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3 no-scrollbar">
        {districts.map((district) => (
          <DistrictCard key={district} district={district} />
        ))}
      </div>
    </div>
  );
}

function DistrictCard({ district }: { district: string }) {
  return (
    <article className="w-[180px] shrink-0 rounded-[18px] border border-border bg-background p-2 text-foreground shadow-sm md:w-[calc((100%-3rem)/5)]">
      <div
        className="h-56 rounded-[14px] bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.22)), url('/hero-home.jpg')",
        }}
      />
      <div className="px-1 pb-3 pt-4">
        <span className="mb-2 inline-flex rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          District
        </span>
        <h3 className="line-clamp-2 min-h-[40px] text-base font-semibold leading-tight tracking-tight">{district}</h3>
        <div className="mt-1">
          <button className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary">
            Explore
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </article>
  );
}
