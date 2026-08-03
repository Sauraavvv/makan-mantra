"use client";

import Image from "next/image";
import { useState } from "react";
import { Bell } from "lucide-react";

export function SaveSearchCard() {
  const [on, setOn] = useState(false);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Bell className="size-4" strokeWidth={1.8} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">Save Search</p>
        <p className="text-xs text-muted-foreground">Get notified for new properties</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Save this search"
        onClick={() => setOn((v) => !v)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-primary" : "bg-border"}`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}

export function SortBy() {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-sm text-muted-foreground">Sort by:</span>
      <select
        aria-label="Sort properties"
        defaultValue="recommended"
        className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/60"
      >
        <option value="recommended">Recommended</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
        <option value="newest">Newest First</option>
      </select>
    </div>
  );
}

export function SkylineArt() {
  return (
    <Image
      src="/quick-links-skyline.webp"
      alt=""
      width={1819}
      height={558}
      aria-hidden
      className="pointer-events-none hidden h-24 w-auto select-none object-contain opacity-70 lg:block"
    />
  );
}
