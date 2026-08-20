"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BedDouble,
  Boxes,
  Car,
  Contact,
  Heart,
  Images,
  KeyRound,
  MapPin,
  Phone,
  Play,
  Scaling,
  Sofa,
  Star,
} from "lucide-react";
import { useSaved } from "@/context/saved-context";
import type { DummyProperty } from "@/lib/dummy-properties";
import { cn } from "@/lib/utils";

type LucideIcon = typeof BedDouble;

function Spec({
  icon: Icon,
  label,
  value,
  chip,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  chip?: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" strokeWidth={1.4} />
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <span className="truncate">{label}</span>
          {chip && (
            <span className="shrink-0 rounded bg-secondary px-1 py-0.5 text-[9px] font-medium text-foreground/70">
              {chip}
            </span>
          )}
        </p>
        <p className="truncate text-[13px] font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function PropertyCard({
  property,
  cityName,
}: {
  property: DummyProperty;
  cityName: string;
}) {
  const router = useRouter();
  const { isSaved, toggle, isGuest } = useSaved();
  const [notice, setNotice] = useState("");
  const saved = isSaved(property.id);
  const place = `${property.locality}, ${cityName}`;
  const snapshot = {
    title: property.title,
    price: property.price,
    locality: property.locality,
    city: cityName,
    image: property.image,
    config: property.config,
    area: property.area,
  };

  const onToggleSaved = async () => {
    const result = await toggle(property.id, {
      ...snapshot,
    });

    if (result === "signin") {
      // Only a session that expired mid-visit lands here now — a signed-out
      // visitor keeps their shortlist on the device. The header opens its
      // sign-in modal off `?auth=login`, so they keep their place in the
      // listing instead of losing it to a login page.
      const params = new URLSearchParams(window.location.search);
      params.set("auth", "login");
      router.push(`${window.location.pathname}?${params.toString()}`);
      return;
    }

    if (result === "error") {
      setNotice("Could not update your shortlist");
      setTimeout(() => setNotice(""), 2500);
      return;
    }

    // Said once, on the way in: the shortlist is real but only on this device
    // until they have an account to keep it in.
    if (result === "saved" && isGuest) {
      setNotice("Saved on this device — sign in to keep it");
      setTimeout(() => setNotice(""), 3000);
    }
  };

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-background transition-shadow hover:shadow-md">
      <div className="flex flex-col md:flex-row">
        <div className="relative aspect-[4/3] w-full shrink-0 md:aspect-auto md:w-[240px] lg:w-[280px]">
          <Image
            src={property.image}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 280px"
            className="object-cover"
          />

          <div className="absolute left-2 top-2 flex gap-1.5">
            <span className="flex items-center gap-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
              <Images className="size-3" />
              {property.photos}
            </span>

            {property.hasVideo && (
              <span className="flex items-center gap-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                <Play className="size-3 fill-current" />
                Video
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleSaved}
            aria-label={saved ? "Remove from shortlist" : "Add to shortlist"}
            aria-pressed={saved}
            className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          >
            <Heart className={cn("size-4", saved && "fill-saffron text-saffron")} />
          </button>

          {notice && (
            <p className="absolute inset-x-2 bottom-2 rounded-md bg-black/75 px-2 py-1 text-center text-[11px] font-medium text-white backdrop-blur-sm">
              {notice}
            </p>
          )}
        </div>

        <div className="min-w-0 flex-1 p-4">
          <h3 className="text-base font-bold leading-snug text-foreground md:text-lg">
            {property.title} in {place}
          </h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <p className="flex items-center gap-1 text-[13px] text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              {place}
            </p>

            <button
              type="button"
              className="flex items-center gap-1.5 text-[13px] font-medium text-foreground"
            >
              <span className="grid size-7 place-items-center rounded-md border border-border bg-secondary">
                <MapPin className="size-3.5 text-saffron" />
              </span>
              <span className="underline underline-offset-2">See on Map</span>
            </button>
          </div>

          <p className="mt-2.5 text-xl font-bold text-foreground">{property.price}</p>

          <div className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-3">
            <Spec icon={BedDouble} label="Config" value={property.config} />
            <Spec icon={Scaling} label="Area" value={property.area} chip={property.areaType} />
            <Spec icon={Boxes} label="Additional Spaces" value={property.additionalSpaces} />
            <Spec icon={KeyRound} label="Possession Status" value={property.possession} />
            <Spec icon={Car} label="Parking" value={property.parking} />
            <Spec icon={Sofa} label="Furnishing Status" value={property.furnishing} />
          </div>

          <div className="relative mt-3 border-t border-border pt-3">
            <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
              {property.description}
            </p>
            {/* Sits over the clamped text, matching how the copy runs into the link. */}
            <button
              type="button"
              className="absolute bottom-0 right-0 bg-background pl-5 text-[13px] font-medium text-foreground underline underline-offset-2"
            >
              Read More
            </button>
          </div>
        </div>
      </div>

      <footer className="flex flex-wrap items-center gap-2.5 border-t border-border bg-secondary/50 px-4 py-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          {property.agent.name.charAt(0)}
        </span>

        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold text-foreground">{property.agent.name}</p>
          {property.agent.pro && (
            <span className="mt-0.5 inline-flex items-center gap-1 rounded bg-saffron/15 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-saffron">
              <Star className="size-2.5 fill-current" />
              Pro Agent
            </span>
          )}
        </div>

        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-[13px] font-semibold transition-colors hover:bg-secondary"
          >
            <Contact className="size-3.5" />
            View Number
          </button>

          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg bg-saffron px-3 py-2 text-[13px] font-semibold text-saffron-foreground transition-opacity hover:opacity-90"
          >
            <Phone className="size-3.5" />
            Contact Agent
          </button>
        </div>
      </footer>
    </article>
  );
}
