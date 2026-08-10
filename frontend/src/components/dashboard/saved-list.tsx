"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, Scaling } from "lucide-react";

import { useSaved } from "@/context/saved-context";

export function SavedList() {
  const { items, toggle, loaded } = useSaved();

  if (!loaded) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-[104px] animate-pulse rounded-xl border border-border bg-muted/40" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center">
        <Heart className="mx-auto size-8 text-muted-foreground" strokeWidth={1.5} />
        <p className="mt-3 font-semibold text-foreground">Nothing shortlisted yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap the heart on any listing and it will wait for you here.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex h-9 items-center rounded-full bg-saffron px-4 text-sm font-semibold text-saffron-foreground transition-opacity hover:opacity-90"
        >
          Browse properties
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.propertyId}
          className="flex gap-3 overflow-hidden rounded-xl border border-border bg-background p-3"
        >
          <div className="relative size-[86px] shrink-0 overflow-hidden rounded-lg">
            <Image src={item.image || "/hero-home.jpg"} alt="" fill sizes="86px" className="object-cover" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">{item.title}</p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              {[item.locality, item.city].filter(Boolean).join(", ")}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-sm font-bold text-foreground">{item.price}</span>
              {item.config && <span className="text-xs text-muted-foreground">{item.config}</span>}
              {item.area && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Scaling className="size-3" />
                  {item.area}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggle(item.propertyId, item)}
            aria-label={`Remove ${item.title} from shortlist`}
            className="grid size-8 shrink-0 place-items-center self-start rounded-full border border-border text-saffron transition-colors hover:bg-accent"
          >
            <Heart className="size-4 fill-saffron" />
          </button>
        </li>
      ))}
    </ul>
  );
}
