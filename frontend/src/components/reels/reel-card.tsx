"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Bath,
  BedDouble,
  Building,
  CalendarCheck,
  Check,
  Clock3,
  Compass,
  Heart,
  Info,
  MapPin,
  Maximize2,
  Search,
  Share2,
  Sofa,
  X,
  type LucideIcon,
} from "lucide-react";
import { useSaved } from "@/context/saved-context";
import { openAuthModal } from "@/lib/auth-modal";
import type { RankedReel } from "@/lib/reels";
import { cn } from "@/lib/utils";
import { ReelPhotos } from "@/components/reels/reel-photos";

const RESIDENTIAL = ["Flat", "Villa", "Builder Floor"];

function snapshot(reel: RankedReel) {
  return {
    title: reel.title,
    price: reel.priceLabel,
    locality: reel.locality,
    city: reel.city,
    image: reel.photos[0],
    config: RESIDENTIAL.includes(reel.type) ? `${reel.bhk} BHK + ${reel.baths} Bath` : undefined,
    area: `${reel.area} Sq.Ft.`,
  };
}

/** Save + share, shared by the desktop panel and the mobile action rail. */
function useReelActions(reel: RankedReel) {
  const { isSaved, toggle } = useSaved();
  const [copied, setCopied] = useState(false);
  const saved = isSaved(reel.id);

  const toggleSave = async () => {
    const result = await toggle(reel.id, snapshot(reel));
    if (result === "signin") openAuthModal("login");
  };

  const share = async () => {
    const url = `${window.location.origin}/reels?p=${encodeURIComponent(reel.id)}`;
    const data = { title: `${reel.title} — ${reel.priceLabel}`, url };

    try {
      if (navigator.share && navigator.canShare?.(data) !== false) {
        await navigator.share(data);
        return;
      }
    } catch (error) {
      // Dismissing the share sheet is not a failure worth a fallback.
      if (error instanceof DOMException && error.name === "AbortError") return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  return { saved, toggleSave, share, copied };
}

function Badges({ reel, className }: { reel: RankedReel; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <span className="rounded-md bg-[#0A2036] px-2 py-1 text-[10px] font-bold tracking-wide text-white">
        {reel.listing === "rent" ? "FOR RENT" : "FOR SALE"}
      </span>
      <span className="rounded-md bg-white px-2 py-1 text-[10px] font-bold text-[#0A2036] ring-1 ring-black/10">
        {reel.type}
      </span>
      {reel.featured && (
        <span className="rounded-md bg-saffron px-2 py-1 text-[10px] font-bold text-saffron-foreground">
          Featured
        </span>
      )}
    </div>
  );
}

function Because({ label, className }: { label: string; className?: string }) {
  return (
    <p className={cn("inline-flex max-w-full items-center gap-1.5 text-xs", className)}>
      <Search className="size-3.5 shrink-0" />
      <span className="truncate">
        Because you searched <span className="font-semibold">&ldquo;{label}&rdquo;</span>
      </span>
    </p>
  );
}

function Facts({ reel }: { reel: RankedReel }) {
  const residential = RESIDENTIAL.includes(reel.type);
  const facts: Array<{ icon: LucideIcon; label: string; value: string }> = [
    ...(residential ? [{ icon: BedDouble, label: "Bedrooms", value: `${reel.bhk} BHK` }] : []),
    ...(residential ? [{ icon: Bath, label: "Bathrooms", value: String(reel.baths) }] : []),
    { icon: Maximize2, label: "Area", value: `${reel.area.toLocaleString("en-IN")} sq.ft` },
    { icon: Sofa, label: "Furnishing", value: reel.furnishing },
    { icon: CalendarCheck, label: "Possession", value: reel.possession },
    { icon: Building, label: "Floor", value: reel.floor },
    { icon: Compass, label: "Facing", value: reel.facing },
    { icon: Clock3, label: "Posted", value: reel.posted },
  ].filter((fact) => fact.value !== "—");

  return (
    <dl className="grid grid-cols-2 gap-2">
      {facts.map((fact) => (
        <div key={fact.label} className="flex items-center gap-2.5 rounded-lg bg-secondary/70 px-3 py-2">
          <fact.icon className="size-4 shrink-0 text-saffron" strokeWidth={1.8} />
          <div className="min-w-0">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {fact.label}
            </dt>
            <dd className="truncate text-sm font-semibold text-foreground">{fact.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

function Agent({ reel }: { reel: RankedReel }) {
  const initials = reel.agent.name
    .split(" ")
    .map((part) => part[0])
    .join("");

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#0A2036] text-sm font-bold text-white">
        {initials}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{reel.agent.name}</p>
        <p className="text-xs text-muted-foreground">
          {reel.agent.pro ? "PRO Agent" : "Agent"} · Makan Mantraa
        </p>
      </div>
    </div>
  );
}

/** Everything below the price: facts, description, agent. */
function Details({ reel }: { reel: RankedReel }) {
  const [more, setMore] = useState(false);

  return (
    <div className="space-y-4">
      <Facts reel={reel} />

      <div>
        <h3 className="text-sm font-semibold">About this property</h3>
        <p
          className={cn(
            "mt-1 text-sm leading-relaxed text-muted-foreground",
            !more && "line-clamp-3",
          )}
        >
          {reel.description}
        </p>
        <button
          type="button"
          onClick={() => setMore((value) => !value)}
          className="mt-1 text-xs font-semibold text-saffron hover:underline"
        >
          {more ? "Show less" : "Read more"}
        </button>
      </div>

      <Agent reel={reel} />
    </div>
  );
}

function Heading({ reel, tone }: { reel: RankedReel; tone: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
        <p className={cn("text-3xl font-bold tracking-tight", dark ? "text-white" : "text-foreground")}>
          {reel.priceLabel}
        </p>
        <p className={cn("text-xs font-medium", dark ? "text-white/70" : "text-muted-foreground")}>
          {reel.ratePerSqft}
        </p>
      </div>
      <h2 className={cn("mt-1 text-lg font-semibold leading-snug", dark ? "text-white" : "text-foreground")}>
        {reel.title}
      </h2>
      <p
        className={cn(
          "mt-1 flex items-center gap-1.5 text-sm",
          dark ? "text-white/80" : "text-muted-foreground",
        )}
      >
        <MapPin className="size-4 shrink-0 text-saffron" />
        <span className="truncate">
          {reel.locality}, {reel.city}, {reel.state}
        </span>
      </p>
    </div>
  );
}

/**
 * One full-screen reel.
 *
 * Desktop: photos on the left, a details panel on the right, both the same
 * fixed width (400px, 440px on wide screens), at most 680px tall; the card
 * centres in the window.
 * Mobile: the photos fill the screen with the essentials laid over the bottom,
 * an Instagram-style action rail on the right, and the full details in a
 * bottom sheet.
 */
export function ReelCard({
  reel,
  active,
  eager,
}: {
  reel: RankedReel;
  active: boolean;
  eager: boolean;
}) {
  const { saved, toggleSave, share, copied } = useReelActions(reel);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <article
      aria-label={`${reel.title}, ${reel.priceLabel}`}
      className="relative size-full overflow-hidden bg-neutral-900 lg:mx-auto lg:grid lg:max-h-[680px] lg:w-fit lg:grid-cols-[400px_400px] lg:rounded-2xl xl:grid-cols-[440px_440px]"
    >
      <ReelPhotos
        photos={reel.photos}
        alt={reel.title}
        active={active}
        eager={eager}
        className="absolute inset-0 lg:static"
      />

      {/* ── Desktop details panel ── */}
      <aside className="hidden min-h-0 flex-col bg-background lg:flex">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-6">
          <Badges reel={reel} />
          {reel.because && <Because label={reel.because} className="text-muted-foreground" />}
          <Heading reel={reel} tone="light" />
          <Details reel={reel} />
        </div>

        <div className="flex items-center gap-2 border-t border-border p-4">
          <button
            type="button"
            onClick={toggleSave}
            aria-pressed={saved}
            className={cn(
              "flex h-10 items-center gap-2 rounded-lg border px-3.5 text-sm font-semibold transition-colors",
              saved
                ? "border-saffron/40 bg-saffron/10 text-saffron"
                : "border-border hover:bg-secondary",
            )}
          >
            <Heart className={cn("size-4", saved && "fill-current")} />
            {saved ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            onClick={share}
            className="flex h-10 items-center gap-2 rounded-lg border border-border px-3.5 text-sm font-semibold transition-colors hover:bg-secondary"
          >
            {copied ? <Check className="size-4 text-emerald-600" /> : <Share2 className="size-4" />}
            {copied ? "Link copied" : "Share"}
          </button>
          <Link
            href={reel.href}
            className="ml-auto flex h-10 items-center gap-1.5 rounded-lg bg-saffron px-4 text-sm font-semibold text-saffron-foreground transition-opacity hover:opacity-90"
          >
            Full details
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </aside>

      {/* ── Mobile overlay ── */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/50 to-transparent lg:hidden" />

      <div className="absolute inset-x-0 bottom-0 space-y-2.5 p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pr-20 lg:hidden">
        <Badges reel={reel} />
        {reel.because && <Because label={reel.because} className="text-white/80" />}
        <Heading reel={reel} tone="dark" />
      </div>

      <div className="absolute bottom-6 right-3 flex flex-col items-center gap-4 pb-[env(safe-area-inset-bottom)] lg:hidden">
        <RailButton label={saved ? "Saved" : "Save"} onClick={toggleSave} pressed={saved}>
          <Heart className={cn("size-6", saved && "fill-saffron text-saffron")} />
        </RailButton>
        <RailButton label={copied ? "Copied" : "Share"} onClick={share}>
          {copied ? <Check className="size-6" /> : <Share2 className="size-6" />}
        </RailButton>
        <RailButton label="Details" onClick={() => setSheetOpen(true)}>
          <Info className="size-6" />
        </RailButton>
      </div>

      {/* ── Mobile details sheet ── */}
      {sheetOpen && (
        <div className="absolute inset-0 z-10 flex flex-col justify-end lg:hidden">
          <button
            type="button"
            aria-label="Close details"
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div
            role="dialog"
            aria-label="Property details"
            className="relative max-h-[78%] overflow-y-auto overscroll-contain rounded-t-2xl bg-background p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <Heading reel={reel} tone="light" />
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Close details"
                className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>
            <Details reel={reel} />
            <Link
              href={reel.href}
              className="mt-4 flex h-11 items-center justify-center gap-1.5 rounded-lg bg-saffron text-sm font-semibold text-saffron-foreground"
            >
              View full details
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      )}
    </article>
  );
}

function RailButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className="flex flex-col items-center gap-1 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
    >
      {children}
      <span className="text-[11px] font-semibold">{label}</span>
    </button>
  );
}
