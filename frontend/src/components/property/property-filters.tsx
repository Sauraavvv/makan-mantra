"use client";

import { useState } from "react";
import { ChevronDown, Map, RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const PROPERTY_TYPES = [
  { id: "all", label: "All Residential", count: "12,345" },
  { id: "apartment", label: "Apartment / Flat", count: "5,423" },
  { id: "independent", label: "Independent House", count: "2,156" },
  { id: "villa", label: "Villa", count: "1,023" },
  { id: "builder_floor", label: "Builder Floor", count: "987" },
  { id: "penthouse", label: "Penthouse", count: "312" },
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

export function PropertyFilters() {
  const [selected, setSelected] = useState<string[]>(["all"]);
  const [budget, setBudget] = useState<[number, number]>([2000000, 20000000]);

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((v) => v !== id) : [...current, id],
    );

  return (
    <aside className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3 pb-2">
        <h2 className="text-lg font-bold">Filters</h2>
        <button
          type="button"
          onClick={() => {
            setSelected(["all"]);
            setBudget([2000000, 20000000]);
          }}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <RotateCcw className="size-3.5" />
          Reset All
        </button>
      </div>

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
                <span className="shrink-0 text-xs text-muted-foreground">{type.count}</span>
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

      <button
        type="button"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-primary/40 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
      >
        <Map className="size-4" />
        View on Map
      </button>
    </aside>
  );
}
