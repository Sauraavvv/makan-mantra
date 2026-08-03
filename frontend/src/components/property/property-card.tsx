"use client";

import Image from "next/image";
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
    <div className="flex min-w-0 items-start gap-2.5">
      <Icon className="mt-0.5 size-6 shrink-0 text-muted-foreground" strokeWidth={1.4} />
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <span className="truncate">{label}</span>
          {chip && (
            <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-foreground/70">
              {chip}
            </span>
          )}
        </p>
        <p className="truncate text-sm font-bold text-foreground">{value}</p>
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
  const [saved, setSaved] = useState(false);
  const place = `${property.locality}, ${cityName}`;

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-background transition-shadow hover:shadow-md">
      <div className="flex flex-col md:flex-row">
        <div className="relative aspect-[4/3] w-full shrink-0 md:aspect-auto md:w-[300px] lg:w-[360px]">
          <Image
            src={property.image}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 360px"
            className="object-cover"
          />

          <div className="absolute left-3 top-3 flex gap-2">
            <span className="flex items-center gap-1.5 rounded-md bg-black/65 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              <Images className="size-3.5" />
              {property.photos}
            </span>

            {property.hasVideo && (
              <span className="flex items-center gap-1.5 rounded-md bg-black/65 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                <Play className="size-3.5 fill-current" />
                Video
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSaved((v) => !v)}
            aria-label={saved ? "Remove from shortlist" : "Add to shortlist"}
            aria-pressed={saved}
            className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          >
            <Heart className={cn("size-4.5", saved && "fill-saffron text-saffron")} />
          </button>
        </div>

        <div className="min-w-0 flex-1 p-5">
          <h3 className="text-lg font-bold leading-snug text-foreground md:text-xl">
            {property.title} in {place}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" />
              {place}
            </p>

            <button
              type="button"
              className="flex items-center gap-2 text-sm font-medium text-foreground"
            >
              <span className="grid size-8 place-items-center rounded-md border border-border bg-secondary">
                <MapPin className="size-4 text-saffron" />
              </span>
              <span className="underline underline-offset-2">See on Map</span>
            </button>
          </div>

          <p className="mt-3 text-2xl font-bold text-foreground">{property.price}</p>

          <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
            <Spec icon={BedDouble} label="Config" value={property.config} />
            <Spec icon={Scaling} label="Area" value={property.area} chip={property.areaType} />
            <Spec icon={Boxes} label="Additional Spaces" value={property.additionalSpaces} />
            <Spec icon={KeyRound} label="Possession Status" value={property.possession} />
            <Spec icon={Car} label="Parking" value={property.parking} />
            <Spec icon={Sofa} label="Furnishing Status" value={property.furnishing} />
          </div>

          <div className="relative mt-4 border-t border-border pt-4">
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {property.description}
            </p>
            {/* Sits over the clamped text, matching how the copy runs into the link. */}
            <button
              type="button"
              className="absolute bottom-0 right-0 bg-background pl-6 text-sm font-medium text-foreground underline underline-offset-2"
            >
              Read More
            </button>
          </div>
        </div>
      </div>

      <footer className="flex flex-wrap items-center gap-3 border-t border-border bg-secondary/50 px-5 py-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-base font-bold text-primary-foreground">
          {property.agent.name.charAt(0)}
        </span>

        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">{property.agent.name}</p>
          {property.agent.pro && (
            <span className="mt-0.5 inline-flex items-center gap-1 rounded bg-saffron/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-saffron">
              <Star className="size-3 fill-current" />
              Pro Agent
            </span>
          )}
        </div>

        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
          >
            <Contact className="size-4" />
            View Number
          </button>

          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-saffron px-4 py-2.5 text-sm font-semibold text-saffron-foreground transition-opacity hover:opacity-90"
          >
            <Phone className="size-4" />
            Contact Agent
          </button>
        </div>
      </footer>
    </article>
  );
}
