"use client";

import { useRef } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Landmark,
  LibraryBig,
  Plane,
  Route,
  ShoppingBag,
  Stethoscope,
} from "lucide-react";

export type SocialInfrastructureCard = {
  key: string;
  label: string;
  value: unknown;
};

function hasDisplayValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasDisplayValue);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).some(hasDisplayValue);
  return true;
}

function labelFromKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function cleanSocialName(value: unknown) {
  return String(value)
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function moveLongItemsLast(items: unknown[]) {
  const isLongText = (item: unknown) => typeof item !== "object" && cleanSocialName(item).length > 48;
  return [
    ...items.filter((item) => !isLongText(item)),
    ...items.filter(isLongText),
  ];
}

type CarouselVariant = "social" | "connectivity";

function cardIconForKey(key: string, variant: CarouselVariant): LucideIcon {
  const normalized = key.toLowerCase();

  if (variant === "connectivity") {
    if (normalized.includes("airport") || normalized.includes("port")) {
      return Plane;
    }
    if (normalized.includes("highway") || normalized.includes("road") || normalized.includes("metro") || normalized.includes("corridor")) {
      return Route;
    }
    return Building2;
  }

  if (normalized.includes("college") || normalized.includes("university")) {
    return LibraryBig;
  }
  if (normalized.includes("education") || normalized.includes("school")) {
    return GraduationCap;
  }
  if (normalized.includes("hospital") || normalized.includes("health") || normalized.includes("medical")) {
    return Stethoscope;
  }
  if (normalized.includes("market") || normalized.includes("essential") || normalized.includes("shopping")) {
    return ShoppingBag;
  }
  if (normalized.includes("tourist") || normalized.includes("attraction")) {
    return Landmark;
  }
  return Building2;
}

function cardCopy(label: string, variant: CarouselVariant) {
  const normalized = label.toLowerCase();

  if (variant === "connectivity") {
    if (normalized.includes("highway") || normalized.includes("road") || normalized.includes("corridor")) {
      return {
        subtitle: "Road access",
        description: "Key highways, corridors, and road links supporting regional movement.",
      };
    }
    if (normalized.includes("airport") || normalized.includes("port")) {
      return {
        subtitle: "Air and port access",
        description: "Important airports, ports, and long-distance transport access points.",
      };
    }
    if (normalized.includes("rail") || normalized.includes("metro")) {
      return {
        subtitle: "Rail and metro access",
        description: "Major railway stations, metro routes, and rail-linked access points.",
      };
    }
    if (normalized.includes("bus")) {
      return {
        subtitle: "Bus network",
        description: "Important bus terminals, depots, and intercity road transit points.",
      };
    }

    return {
      subtitle: "Connectivity signal",
      description: "Important access and mobility details for this connectivity category.",
    };
  }

  if (normalized.includes("college") || normalized.includes("university")) {
    return {
      subtitle: "Higher education access",
      description: "Key colleges, universities, and higher learning institutions in this location.",
    };
  }
  if (normalized.includes("education") || normalized.includes("school")) {
    return {
      subtitle: "Education access",
      description: "Key schools and foundational learning institutions in this location.",
    };
  }
  if (normalized.includes("hospital") || normalized.includes("health") || normalized.includes("medical")) {
    return {
      subtitle: "Healthcare access",
      description: "Important hospitals and medical centres serving this location.",
    };
  }
  if (normalized.includes("market") || normalized.includes("essential") || normalized.includes("shopping")) {
    return {
      subtitle: "Markets and essentials",
      description: "Daily-use markets, shopping areas, and essential service points nearby.",
    };
  }
  if (normalized.includes("tourist") || normalized.includes("attraction")) {
    return {
      subtitle: "Places to visit",
      description: "Popular landmarks, tourist spots, and visitor attractions in this region.",
    };
  }
  if (normalized.includes("transport") || normalized.includes("connectivity")) {
    return {
      subtitle: "Access network",
      description: "Important movement, commute, and connectivity points in this location.",
    };
  }

  return {
    subtitle: label,
    description: `Important ${label.toLowerCase()} details for this location.`,
  };
}

export function SocialInfrastructureCarousel({
  cards,
  displayName,
  title = `Social Infrastructure in ${displayName}`,
  description = `Explore key schools, colleges, hospitals, markets, and local attractions that support everyday living in ${displayName}.`,
  variant = "social",
}: {
  cards: SocialInfrastructureCard[];
  displayName: string;
  title?: string;
  description?: string;
  variant?: CarouselVariant;
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
    <div>
      <div className="mb-4">
        <h2 className="mb-3 text-3xl font-bold leading-tight md:text-4xl">
          {title}
        </h2>
        <div className="mt-2 flex items-center justify-between gap-4">
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
          {cards.length > 1 && (
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                aria-label="Scroll social infrastructure left"
                onClick={() => scroll("left")}
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-secondary"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                aria-label="Scroll social infrastructure right"
                onClick={() => scroll("right")}
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-secondary"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div ref={scrollerRef} className="-mx-5 overflow-x-auto scroll-smooth px-5 pb-2 no-scrollbar">
        <div className="flex w-max snap-x snap-mandatory gap-3">
          {cards.map((card) => (
            <div key={card.key} className="h-[430px] w-[min(78vw,340px)] shrink-0 snap-start lg:w-[360px]">
              <SocialInfoCard
                icon={cardIconForKey(card.key, variant)}
                label={card.label}
                value={card.value}
                variant={variant}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SocialInfoCard({
  icon: Icon,
  label,
  value,
  variant,
}: {
  icon: LucideIcon;
  label: string;
  value: unknown;
  variant: CarouselVariant;
}) {
  const copy = cardCopy(label, variant);
  const theme = variant === "connectivity"
    ? {
        border: "border-slate-200",
        header: "bg-slate-100",
        tile: "bg-slate-200",
        infoBorder: "border-slate-300",
        infoBg: "bg-slate-200/70",
        headingText: "text-foreground",
        mutedText: "text-muted-foreground",
        tileText: "text-foreground",
        descriptionText: "text-foreground/75",
      }
    : {
        border: "border-sky-200",
        header: "bg-sky-100",
        tile: "bg-sky-200",
        infoBorder: "border-sky-300",
        infoBg: "bg-sky-200/60",
        headingText: "text-foreground",
        mutedText: "text-muted-foreground",
        tileText: "text-foreground",
        descriptionText: "text-foreground/75",
      };

  return (
    <div className={`flex h-full flex-col overflow-hidden rounded-xl border ${theme.border} bg-white`}>
      <div className={`${theme.header} p-3.5`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className={`text-lg font-bold leading-tight ${theme.headingText}`}>
              {label}
            </h3>
            <p className={`mt-0.5 text-xs font-medium ${theme.mutedText}`}>
              {copy.subtitle}
            </p>
          </div>
          <div className={`grid size-12 shrink-0 place-items-center rounded-xl ${theme.tile} ${theme.tileText}`}>
            <Icon className="h-5 w-5" strokeWidth={1.65} />
          </div>
        </div>

        <div className={`mt-3 rounded-xl border-2 ${theme.infoBorder} ${theme.infoBg} px-3 py-2.5`}>
          <p className={`text-xs font-medium leading-relaxed ${theme.descriptionText}`}>
            {copy.description}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 no-scrollbar">
        <SocialValue value={value} />
      </div>
    </div>
  );
}

function SocialValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    const items = moveLongItemsLast(value.filter(hasDisplayValue));

    return (
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li
            key={`${String(item)}-${index}`}
            className={`pb-2 text-sm text-foreground ${index < items.length - 1 ? "border-b border-border" : ""}`}
          >
            {typeof item === "object" && item !== null ? <SocialValue value={item} /> : cleanSocialName(item)}
          </li>
        ))}
      </ul>
    );
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, item]) => hasDisplayValue(item));

    return (
      <div className="space-y-3">
        {entries.map(([key, item]) => (
          <div key={key}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {labelFromKey(key)}
            </div>
            <div className="mt-1 text-sm leading-relaxed text-foreground">
              <SocialValue value={item} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <p className="text-sm leading-relaxed text-foreground">
      {cleanSocialName(value)}
    </p>
  );
}
