"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { ArrowRight, Building2, CalendarDays, ChevronLeft, ChevronRight, MapPin } from "lucide-react";

export type TopBuilderItem = {
  title: string;
  /** Builder logo; falls back to a generic illustration. */
  image?: string;
  /** Year the builder was founded, e.g. 1946. */
  since?: string | number;
  /** Delivered projects, e.g. "210+". */
  projects?: string;
  /** Cities the builder operates in. */
  cities?: string[];
  /** Segments such as Residential, Commercial, Retail. */
  categories?: string[];
  href?: string;
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

  // Shorter than the artwork on md+, cropping only the empty sky so the skyline stays put.
  return (
    <div className="relative overflow-hidden rounded-[20px] md:aspect-[1536/820]">
      <Image
        src="/top-builders-bg.png"
        alt=""
        fill
        priority={false}
        sizes="(min-width: 1280px) 1250px, 100vw"
        className="object-cover object-bottom"
      />

      <div className="relative p-6 md:absolute md:inset-0 md:flex md:flex-col md:justify-center md:p-8">
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
            <div className="flex w-max snap-x snap-mandatory gap-5">
              {builders.map((builder) => (
                <div
                  key={builder.title}
                  className="w-[min(68vw,240px)] shrink-0 snap-start lg:w-[250px]"
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
  const { title, image, since, projects, cities, categories, href } = builder;
  const hasMeta = Boolean(since || projects);
  const hasCities = Boolean(cities?.length);
  const hasCategories = Boolean(categories?.length);

  const card = (
    <article className="group flex h-full min-h-[330px] flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_-24px_rgba(11,27,51,0.5)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#1160F0]/40">
      <div className="relative mx-auto h-20 w-full">
        <Image
          src={image || PLACEHOLDER_IMAGE}
          alt={title}
          fill
          sizes="320px"
          className="object-contain transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <h3 className="mt-5 text-center text-lg font-bold leading-snug text-[#0B1B33] transition-colors duration-300 group-hover:text-[#1160F0]">
        {title}
      </h3>

      {hasMeta && (
        <div className="mt-3 flex items-center justify-center gap-3 text-sm text-slate-600">
          {since && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4 text-slate-400" strokeWidth={1.8} />
              Since {since}
            </span>
          )}
          {since && projects && <span className="h-4 w-px bg-slate-200" />}
          {projects && (
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="size-4 text-slate-400" strokeWidth={1.8} />
              {projects} Projects
            </span>
          )}
        </div>
      )}

      {hasCities && (
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-sm text-slate-600">
          <MapPin className="size-4 shrink-0 text-slate-400" strokeWidth={1.8} />
          {cities?.join(", ")}
        </p>
      )}

      {hasCategories && (
        <>
          <div className="mt-4 border-t border-slate-100" />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {categories?.map((category) => (
              <span
                key={category}
                className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
              >
                {category}
              </span>
            ))}
          </div>
        </>
      )}

      <div className="mt-auto pt-4">
        <div className="border-t border-slate-100 pt-4">
          <span className="flex items-center justify-center gap-2 text-sm font-bold text-[#0B1B33] transition-colors duration-300 group-hover:text-[#1160F0]">
            Explore Builder
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </article>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {card}
    </Link>
  ) : (
    <div className="h-full cursor-pointer">{card}</div>
  );
}
