"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { PropertyCard } from "@/components/property/property-card";
import { DUMMY_PAGE_SIZE, makeDummyProperties, type DummyProperty } from "@/lib/dummy-properties";

/** Stop somewhere sensible — these are placeholders, not a real result set. */
const MAX_ITEMS = 60;

export function PropertyList({ cityName }: { cityName: string }) {
  const [items, setItems] = useState<DummyProperty[]>(() =>
    makeDummyProperties(0, DUMMY_PAGE_SIZE),
  );
  const sentinelRef = useRef<HTMLDivElement>(null);

  const done = items.length >= MAX_ITEMS;

  useEffect(() => {
    if (done) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;

        // A short delay so the spinner registers instead of flashing.
        setTimeout(() => {
          setItems((current) =>
            current.length >= MAX_ITEMS
              ? current
              : [...current, ...makeDummyProperties(current.length, DUMMY_PAGE_SIZE)],
          );
        }, 350);
      },
      { rootMargin: "400px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [done, items.length]);

  return (
    <div>
      <div className="space-y-4">
        {items.map((property) => (
          <PropertyCard key={property.id} property={property} cityName={cityName} />
        ))}
      </div>

      <div ref={sentinelRef} className="py-8 text-center">
        {done ? (
          <p className="text-sm text-muted-foreground">You have reached the end of the list.</p>
        ) : (
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading more properties…
          </p>
        )}
      </div>
    </div>
  );
}
