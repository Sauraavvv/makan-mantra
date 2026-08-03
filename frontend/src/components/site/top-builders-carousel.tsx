"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { Award, Building2, ChevronLeft, ChevronRight, ShieldCheck, Users } from "lucide-react";

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
  details?: Array<[string, string]>;
  experience?: string;
  happyFamilies?: string;
  href?: string;
};

const CARD_ACCENTS = [
  {
    text: "text-[#1160F0]",
    bar: "bg-[#1160F0]",
    bg: "bg-[#1160F0]/10",
  },
  {
    text: "text-[#7A1FD1]",
    bar: "bg-[#7A1FD1]",
    bg: "bg-[#7A1FD1]/10",
  },
  {
    text: "text-[#F97316]",
    bar: "bg-[#F97316]",
    bg: "bg-[#F97316]/10",
  },
  {
    text: "text-[#0F8B8D]",
    bar: "bg-[#0F8B8D]",
    bg: "bg-[#0F8B8D]/10",
  },
] as const;

export function TopBuildersCarousel({
  builders,
  displayName,
}: {
  builders: TopBuilderItem[];
  displayName: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeDot, setActiveDot] = useState(0);
  const dotCount = Math.min(Math.max(builders.length, 1), 5);

  const updateActiveDot = () => {
    const scroller = scrollerRef.current;
    if (!scroller || dotCount <= 1) return;

    const maxScroll = scroller.scrollWidth - scroller.clientWidth;
    const progress = maxScroll > 0 ? scroller.scrollLeft / maxScroll : 0;
    setActiveDot(Math.round(progress * (dotCount - 1)));
  };

  const scroll = (direction: "left" | "right") => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      left: direction === "left" ? -scroller.clientWidth * 0.85 : scroller.clientWidth * 0.85,
      behavior: "smooth",
    });
  };

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-3xl font-bold leading-tight text-foreground md:text-4xl">
          Top Builders in {displayName}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Discover leading real estate developers known for their quality, trust and timely delivery.
        </p>
      </div>

      <div className="relative isolate w-full max-w-full overflow-hidden rounded-[24px] border border-[#DCE5F3] bg-white">
        <div className="relative min-h-[570px] lg:min-h-[455px]">
          <div className="pointer-events-none relative z-20 min-h-[275px] min-w-0 overflow-hidden border-b border-[#DCE5F3] bg-white lg:absolute lg:inset-y-0 lg:left-0 lg:w-[38%] lg:border-b-0 lg:border-r">
            <Image
              src="/top-builders-left.png"
              alt=""
              fill
              priority={false}
              sizes="(min-width: 1280px) 440px, 100vw"
              className="object-contain object-center saturate-[0.95]"
            />

          </div>

          <div className="relative z-10 min-w-0 px-5 py-6 sm:px-6 lg:flex lg:min-h-[455px] lg:items-center lg:px-7">
            <div className="relative min-w-0 lg:w-full lg:translate-y-2">
              <div
                ref={scrollerRef}
                onScroll={updateActiveDot}
                className="-mx-1 overflow-x-auto scroll-smooth px-1 pb-3 pt-1 no-scrollbar lg:pl-[calc(38%+1.5rem)]"
              >
                <div className="flex w-max snap-x snap-mandatory gap-4">
                  {builders.map((builder, index) => (
                    <div
                      key={builder.title}
                      className="w-[min(76vw,210px)] shrink-0 snap-start xl:w-[210px]"
                    >
                      <BuilderCard
                        builder={builder}
                        accent={CARD_ACCENTS[index % CARD_ACCENTS.length]}
                        displayName={displayName}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {builders.length > 1 && (
                <div className="mt-2 flex items-center justify-center gap-4 lg:ml-[calc(38%+1.5rem)]">
                  <button
                    type="button"
                    aria-label="Scroll builders left"
                    onClick={() => scroll("left")}
                    className="grid size-9 place-items-center rounded-full border border-[#DCE5F3] bg-white text-[#071B45] shadow-sm transition-colors hover:bg-[#F4F8FF]"
                  >
                    <ChevronLeft className="size-4" strokeWidth={1.9} />
                  </button>

                  <div className="flex items-center gap-2.5" aria-hidden="true">
                    {Array.from({ length: dotCount }).map((_, index) => (
                      <span
                        key={index}
                        className={`size-2.5 rounded-full transition-colors ${
                          activeDot === index ? "bg-[#1160F0]" : "bg-[#D6DEE9]"
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    aria-label="Scroll builders right"
                    onClick={() => scroll("right")}
                    className="grid size-9 place-items-center rounded-full border border-[#DCE5F3] bg-white text-[#071B45] shadow-sm transition-colors hover:bg-[#F4F8FF]"
                  >
                    <ChevronRight className="size-4" strokeWidth={1.9} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BuilderCard({
  builder,
  accent,
  displayName,
}: {
  builder: TopBuilderItem;
  accent: (typeof CARD_ACCENTS)[number];
  displayName: string;
}) {
  const { title, image, href } = builder;
  const stats = getBuilderStats(builder, displayName);
  const initials = getBuilderInitials(title);

  const card = (
    <article className="group flex h-full min-h-[305px] flex-col rounded-md border border-[#DCE5F3] bg-white px-4 py-4 transition-transform duration-300 hover:-translate-y-1">
      <div className="relative mx-auto grid h-20 w-full place-items-center">
        {image ? (
          <Image
            src={image}
            alt={title}
            fill
            sizes="260px"
            className="object-contain transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className={`grid size-16 place-items-center rounded-md ${accent.bg} ${accent.text}`}>
            <div className="text-center">
              <Building2 className="mx-auto size-6" strokeWidth={1.8} />
              <span className="mt-1 block text-base font-extrabold leading-none">{initials}</span>
            </div>
          </div>
        )}
      </div>

      <h3 className="mt-3 min-h-12 text-center text-base font-extrabold leading-snug text-[#071B45]">
        {title}
      </h3>

      <div className={`mx-auto mt-1 h-1 w-12 rounded-full ${accent.bar}`} />

      <div className="mt-5 space-y-3">
        {stats.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5 whitespace-nowrap text-xs font-semibold leading-snug text-[#071B45]">
            <item.icon className={`size-4 shrink-0 ${accent.text}`} strokeWidth={1.9} />
            <span>{item.label}</span>
          </div>
        ))}
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

function getBuilderStats(builder: TopBuilderItem, displayName: string) {
  const experience = builder.experience || detailValue(builder, ["experience", "established", "since"]);
  const projects = builder.projects || detailValue(builder, ["projects", "delivered"]);
  const happyFamilies = builder.happyFamilies || detailValue(builder, ["happy families", "families", "customers"]);
  const sinceYears = yearsFromSince(builder.since);
  const cityLabel = builder.cities?.length ? `${builder.cities.length}+ Active Cities` : `${displayName} Market Presence`;
  const categoryLabel = builder.categories?.length ? `${builder.categories[0]} Specialist` : "Quality Projects Delivered";

  return [
    {
      label: experience || sinceYears || "Trusted Developer",
      icon: Award,
    },
    {
      label: projects ? projectLabel(projects) : categoryLabel,
      icon: ShieldCheck,
    },
    {
      label: happyFamilies || cityLabel,
      icon: Users,
    },
  ];
}

function detailValue(builder: TopBuilderItem, labels: string[]) {
  const match = builder.details?.find(([label]) => {
    const normalized = label.toLowerCase();
    return labels.some((item) => normalized.includes(item));
  });

  return match?.[1];
}

function yearsFromSince(since: TopBuilderItem["since"]) {
  if (!since) return null;
  const year = Number(since);
  const currentYear = new Date().getFullYear();

  if (Number.isFinite(year) && year > 1800 && year <= currentYear) {
    return `${currentYear - year}+ Years of Experience`;
  }

  return `Since ${since}`;
}

function projectLabel(projects: string) {
  return /project/i.test(projects) ? projects : `${projects} Projects Delivered`;
}

function getBuilderInitials(title: string) {
  const words = title
    .replace(/\b(private|pvt|limited|ltd|llp|group|constructions?)\b/gi, " ")
    .split(/\s+/)
    .filter(Boolean);

  return (words.length > 1 ? words[0][0] + words[1][0] : title.slice(0, 2)).toUpperCase();
}
