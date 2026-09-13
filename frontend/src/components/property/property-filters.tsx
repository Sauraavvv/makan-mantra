"use client";

import { useState } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { LocationSearchBox } from "@/components/property/location-search-box";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

/**
 * What the site actually stores, in the wording `location_pages` uses.
 *
 * The ids are the values that collection holds, so a choice here is something
 * the suggest endpoint and the pages themselves can be asked about. The list
 * the panel carried before was none of them — "Apartment / Flat",
 * "Independent House" and "Penthouse" are not property types the database has
 * ever heard of, so nothing could have been filtered by them.
 *
 * Same order as the header's own filter panel, so the two read alike.
 */
const PROPERTY_TYPES = [
  { id: "flat", label: "Flat" },
  { id: "villa", label: "Villa" },
  { id: "builder_floor", label: "Builder Floor" },
  { id: "plot", label: "Plot" },
  { id: "pg", label: "PG" },
  { id: "office_space", label: "Office Space" },
  { id: "shop", label: "Shop" },
  { id: "showroom", label: "Showroom" },
];

const COLLAPSED_SECTIONS = [
  "BHK Configuration",
  "Super Built-up Area",
  "Furnishing Status",
  "Possession Status",
  "More Filters",
];

const MIN_BUDGET = 500000;
const MAX_BUDGET = 200000000;

const inr = new Intl.NumberFormat("en-IN");

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 py-3.5 text-left"
      >
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && children && <div className="pb-4">{children}</div>}
    </div>
  );
}

export function PropertyFilters({
  propertyType,
  listingType,
  locationName,
}: {
  propertyType?: string;
  listingType?: string;
  locationName?: string;
} = {}) {
  // The page is one property type, so that is what the panel opens with — a
  // shops-for-sale page showing "Flat" ticked would be describing a different
  // page than the one being read.
  const [selected, setSelected] = useState<string[]>(
    propertyType ? [propertyType] : [],
  );
  const [budget, setBudget] = useState<[number, number]>([2000000, 20000000]);

  // Client-side navigation to another location page keeps this component
  // mounted, so the initial value above runs once and would leave the old
  // page's type ticked. Adjusting during render rather than in an effect
  // means the panel never paints the stale choice at all.
  const [typeOnLastRender, setTypeOnLastRender] = useState(propertyType);
  if (typeOnLastRender !== propertyType) {
    setTypeOnLastRender(propertyType);
    setSelected(propertyType ? [propertyType] : []);
  }

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((v) => v !== id) : [...current, id],
    );

  return (
    <aside className="rounded-xl border border-border bg-background px-4 pb-4 pt-2.5">
      {/* The same rule the sections below carry, so the heading reads as the
          panel's own row rather than as the first filter in the list. */}
      {/* Pulled out past the panel's padding and given it back as its own, so
          the rule reaches both side borders while the heading stays inset. */}
      <div className="-mx-4 flex items-center justify-between gap-3 border-b border-border px-4 pb-2">
        <h2 className="text-lg font-bold">Filters</h2>
        <button
          type="button"
          onClick={() => {
            setSelected(propertyType ? [propertyType] : []);
            setBudget([2000000, 20000000]);
          }}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <RotateCcw className="size-3.5" />
          Reset All
        </button>
      </div>

      <LocationSearchBox
        propertyType={propertyType}
        listingType={listingType}
        currentLocation={locationName}
      />

      <Section title="Property Type" defaultOpen>
        <ul className="space-y-2.5">
          {PROPERTY_TYPES.map((type) => (
            <li key={type.id}>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(type.id)}
                  onChange={() => toggle(type.id)}
                  className="size-4 shrink-0 rounded accent-[var(--primary)]"
                />
                <span className="min-w-0 flex-1 truncate">{type.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Budget" defaultOpen>
        <Slider
          min={MIN_BUDGET}
          max={MAX_BUDGET}
          step={100000}
          value={budget}
          onValueChange={(v) => Array.isArray(v) && setBudget([v[0], v[1]])}
        />

        <div className="mt-4 flex items-center gap-2">
          <span className="flex-1 rounded-lg border border-border px-2.5 py-2 text-xs">
            ₹ {inr.format(budget[0])}
          </span>
          <span className="text-xs text-muted-foreground">to</span>
          <span className="flex-1 rounded-lg border border-border px-2.5 py-2 text-xs">
            ₹ {inr.format(budget[1])}
          </span>
        </div>
      </Section>

      {COLLAPSED_SECTIONS.map((title) => (
        <Section key={title} title={title}>
          <p className="text-xs text-muted-foreground">Coming soon.</p>
        </Section>
      ))}
    </aside>
  );
}
