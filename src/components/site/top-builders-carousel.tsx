"use client";

import Image from "next/image";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type TopBuilderItem = {
  title: string;
  image?: string;
};

const PLACEHOLDER_IMAGE = "/builder-placeholder.svg";

export function TopBuildersCarousel({
  builders,
  displayName,
}: {
  builders: TopBuilderItem[];
  displayName: string;
}) {
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
    <div className="relative overflow-hidden rounded-[20px]">
      <Image
        src="/builder-banner.webp"
        alt=""
        fill
        priority={false}
        sizes="(min-width: 1280px) 1250px, 100vw"
        className="object-cover object-top"
      />

      <div className="relative p-6 md:p-8">
        <div className="mx-auto max-w-3xl pt-3 text-center md:pt-4">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-[#0B1B33] md:text-5xl">
            Top Builders <span className="text-[#1160F0]">in {displayName}</span>
          </h2>

          <div className="mx-auto mt-4 h-[3px] w-28 rounded-full bg-[#1160F0]" />

          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-600 md:text-base">
            Discover leading real estate developers known for their quality, trust and timely delivery.
          </p>
        </div>

        <div className="relative mt-8 md:mt-9">
          <div ref={scrollerRef} className="overflow-x-auto scroll-smooth px-1 pb-3 pt-2.5 no-scrollbar">
            <div className="flex w-max snap-x snap-mandatory gap-4">
              {builders.map((builder) => (
                <div
                  key={builder.title}
                  className="w-[min(52vw,180px)] shrink-0 snap-start lg:w-[196px]"
                >
                  <BuilderCard builder={builder} />
                </div>
              ))}
            </div>
          </div>

          {builders.length > 1 && (
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                aria-label="Scroll builders left"
                onClick={() => scroll("left")}
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-secondary"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                aria-label="Scroll builders right"
                onClick={() => scroll("right")}
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-secondary"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BuilderCard({ builder }: { builder: TopBuilderItem }) {
  return (
    <article className="group flex h-full cursor-pointer flex-col rounded-3xl border border-slate-200 bg-white p-3 transition-all duration-300 hover:-translate-y-1.5 hover:border-[#1160F0]/40">
      <div className="relative aspect-[7/6] w-full overflow-hidden rounded-2xl bg-slate-50">
        <Image
          src={builder.image || PLACEHOLDER_IMAGE}
          alt={builder.title}
          fill
          sizes="200px"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </div>

      <div className="flex flex-1 flex-col items-center justify-between gap-4 px-1 pb-2 pt-5 text-center">
        <h3 className="text-sm font-bold leading-snug text-[#0B1B33] transition-colors duration-300 group-hover:text-[#1160F0] md:text-base">
          {builder.title}
        </h3>
        <div className="h-[3px] w-12 rounded-full bg-[#1160F0] transition-all duration-300 group-hover:w-20" />
      </div>
    </article>
  );
}
