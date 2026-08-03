"use client";

import { useState } from "react";
import { BedDouble, Building2, IndianRupee, MapPin, Search, SlidersHorizontal, X } from "lucide-react";

const FIELD =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary/60";
const LABEL = "mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground";

export function PropertySearchBar({ locationName }: { locationName: string }) {
  const [location, setLocation] = useState(locationName);

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto_auto] lg:items-end">
        <div>
          <label className={LABEL} htmlFor="search-location">
            Location
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
            <input
              id="search-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className={`${FIELD} pl-9 pr-9`}
            />
            {location && (
              <button
                type="button"
                onClick={() => setLocation("")}
                aria-label="Clear location"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        <div>
          <label className={LABEL} htmlFor="search-type">
            Property Type
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
            <select id="search-type" className={`${FIELD} appearance-none pl-9`} defaultValue="all">
              <option value="all">All Residential</option>
              <option value="apartment">Apartment / Flat</option>
              <option value="villa">Villa</option>
              <option value="plot">Plot</option>
            </select>
          </div>
        </div>

        <div>
          <label className={LABEL} htmlFor="search-budget">
            Budget
          </label>
          <div className="relative">
            <IndianRupee className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
            <select id="search-budget" className={`${FIELD} appearance-none pl-9`} defaultValue="20l-2cr">
              <option value="any">Any</option>
              <option value="20l-2cr">₹ 20L - ₹ 2 Cr</option>
              <option value="2cr+">₹ 2 Cr +</option>
            </select>
          </div>
        </div>

        <div>
          <label className={LABEL} htmlFor="search-bhk">
            BHK
          </label>
          <div className="relative">
            <BedDouble className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
            <select id="search-bhk" className={`${FIELD} appearance-none pl-9`} defaultValue="any">
              <option value="any">Any</option>
              <option value="1">1 BHK</option>
              <option value="2">2 BHK</option>
              <option value="3">3 BHK</option>
              <option value="4">4+ BHK</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          <Search className="size-4" />
          Search Properties
        </button>

        <button
          type="button"
          className="flex h-11 items-center justify-center gap-2 px-3 text-sm font-semibold text-primary hover:underline"
        >
          <SlidersHorizontal className="size-4" />
          Advanced Search
        </button>
      </div>
    </div>
  );
}
