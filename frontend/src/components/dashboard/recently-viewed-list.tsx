"use client";

import Link from "next/link";
import { Eye, MapPin, Scaling } from "lucide-react";

import { useRecentProperties } from "@/context/recent-properties-context";
import { generateSlug } from "@/lib/utils/slug";

export function RecentlyViewedList() {
  const { items, loaded } = useRecentProperties();

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
        <Eye className="mx-auto size-8 text-muted-foreground" strokeWidth={1.5} />
        <p className="mt-3 font-semibold text-foreground">No viewed properties yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Properties you open will appear here, newest first.
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
      {items.map((item) => {
        const href = `/property/${item.propertyId}/${generateSlug(item.title)}`;

        return (
          <li key={item.propertyId}>
            <Link
              href={href}
              className="flex gap-3 overflow-hidden rounded-xl border border-border bg-background p-3 transition-colors hover:bg-muted/30"
            >
              <div className="size-[86px] shrink-0 overflow-hidden rounded-lg bg-muted">
                <img
                  src={item.image || "/hero-home.jpg"}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1 self-center">
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
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
