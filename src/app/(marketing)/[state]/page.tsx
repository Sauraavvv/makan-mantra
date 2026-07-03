"use client";
import { use, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Home, MapPin, Filter, ChevronLeft } from "lucide-react";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { PropertyCard } from "@/components/site/property-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { generateProperties, POPULAR_AREAS } from "@/lib/properties";

const PER_PAGE = 12;
const BHKS = [1, 2, 3, 4] as const;
const TYPES = ["All", "Flat", "Plot", "Villa", "Builder Floor", "Office Space", "Shop/Showroom"];

export default function StatePage({ params }: { params: Promise<{ state: string }> }) {
  const { state } = use(params);
  const stateName = decodeURIComponent(state).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const all = useMemo(() => generateProperties(stateName, 36), [stateName]);

  const [listing, setListing] = useState<"all" | "sale" | "rent">("all");
  const [type, setType] = useState("All");
  const [budget, setBudget] = useState<number[]>([1000]);
  const [bhk, setBhk] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () => all.filter((p) => {
      if (listing !== "all" && p.listing !== listing) return false;
      if (type !== "All" && p.type !== type) return false;
      if (bhk !== null && (bhk === 4 ? p.bhk < 4 : p.bhk !== bhk)) return false;
      if (p.listing === "sale" && p.priceValue > budget[0]) return false;
      return true;
    }),
    [all, listing, type, bhk, budget],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const shown = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  const avgPrice = all.length > 0 ? Math.round(all.reduce((a, b) => a + b.priceValue, 0) / all.length) : 0;
  const cityCount = new Set(all.map((p) => p.city)).size;
  const areas = POPULAR_AREAS[stateName] ?? POPULAR_AREAS["Maharashtra"];
  const budgetLabel =
    budget[0] >= 1000 ? "₹10 Cr+" : budget[0] >= 100 ? `₹${(budget[0] / 100).toFixed(1)} Cr` : `₹${budget[0]} L`;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <nav className="border-b border-border bg-card/40">
        <ol className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
          <li><Link href="/" className="flex items-center gap-1 hover:text-foreground"><Home className="h-3.5 w-3.5" /> India</Link></li>
          <ChevronRight className="h-3.5 w-3.5" />
          <li className="font-medium text-foreground">{stateName}</li>
        </ol>
      </nav>

      <section className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-saffron/5">
        <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Properties in <span className="text-primary">{stateName}</span>
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Discover verified residential and commercial properties across {stateName}.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3 md:max-w-xl">
            {[
              { label: "Properties", value: all.length.toLocaleString("en-IN") },
              { label: "Avg Price", value: `₹${avgPrice} L` },
              { label: "Cities", value: String(cityCount) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-border bg-card px-4 py-3">
                <div className="text-lg font-bold md:text-xl">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filter bar */}
      <div className="sticky top-16 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 md:gap-3">
          <Select value={type} onValueChange={(v) => setType(v ?? "All")}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>

          <div className="flex overflow-hidden rounded-md border border-border">
            {(["all", "sale", "rent"] as const).map((l) => (
              <button key={l} onClick={() => setListing(l)}
                className={`px-3 py-1.5 text-sm capitalize transition-colors ${listing === l ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}>
                {l === "all" ? "All" : l}
              </button>
            ))}
          </div>

          <div className="hidden min-w-[220px] items-center gap-3 rounded-md border border-border px-3 py-1.5 md:flex">
            <span className="text-xs font-medium text-muted-foreground">Budget</span>
            <Slider
              value={budget}
              onValueChange={(value) => setBudget(Array.isArray(value) ? [...value] : [value])}
              min={5}
              max={1000}
              step={5}
              className="w-32"
            />
            <span className="text-xs font-semibold">{budgetLabel}</span>
          </div>

          <div className="flex gap-1">
            {BHKS.map((n) => (
              <button key={n} onClick={() => setBhk(bhk === n ? null : n)}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${bhk === n ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"}`}>
                {n === 4 ? "4BHK+" : `${n}BHK`}
              </button>
            ))}
          </div>

          <Sheet>
            <SheetTrigger
              className="ml-auto inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Filter className="h-4 w-4" /> More Filters
            </SheetTrigger>
            <SheetContent>
              <SheetHeader><SheetTitle>More Filters</SheetTitle></SheetHeader>
              <div className="mt-6 space-y-6 text-sm">
                {[
                  { title: "Furnishing", opts: ["Any", "Unfurnished", "Semi", "Fully"] },
                  { title: "Amenities", opts: ["Parking", "Gym", "Pool", "Lift", "Power Backup"] },
                  { title: "Age of Property", opts: ["New", "< 5 yrs", "5-10 yrs", "10+ yrs"] },
                ].map(({ title, opts }) => (
                  <div key={title}>
                    <div className="mb-2 font-medium">{title}</div>
                    <div className="flex flex-wrap gap-2">
                      {opts.map((o) => <button key={o} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">{o}</button>)}
                    </div>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <main className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-6 lg:grid-cols-[1fr_320px]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{shown.length}</span> of {filtered.length} properties
            </p>
            <Select defaultValue="relevance">
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Sort: Relevance</SelectItem>
                <SelectItem value="low">Price: Low to High</SelectItem>
                <SelectItem value="high">Price: High to Low</SelectItem>
                <SelectItem value="new">Newest first</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {shown.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">No properties match your filters.</div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {shown.map((p) => <PropertyCard key={p.id} p={p} />)}
            </div>
          )}

          {/* Pagination */}
          <nav className="mt-8 flex items-center justify-center gap-1">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)}
                className={`h-9 w-9 rounded-md text-sm ${n === currentPage ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"}`}>
                {n}
              </button>
            ))}
            {pageCount > 5 && <span className="px-2 text-muted-foreground">...</span>}
            <Button variant="outline" size="sm" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} className="gap-1">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </nav>
        </section>

        <aside className="space-y-5 lg:sticky lg:top-40 lg:self-start">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-primary/15 via-accent to-saffron/15 grid place-items-center">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-full shadow-lg" style={{ backgroundColor: "var(--saffron)", color: "var(--saffron-foreground)" }}>
                  <MapPin className="h-6 w-6" />
                </div>
                <div className="text-sm font-medium">{stateName}</div>
                <div className="text-xs text-muted-foreground">Map coming soon</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">Popular Areas in {stateName}</h3>
            <ul className="divide-y divide-border text-sm">
              {areas.map((a) => (
                <li key={a} className="flex items-center justify-between py-2">
                  <span className="flex items-center gap-2 text-foreground/80"><MapPin className="h-3.5 w-3.5 text-primary" /> {a}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </li>
              ))}
            </ul>
          </div>

          <div className="grid aspect-[4/3] place-items-center rounded-xl border border-dashed border-border bg-gradient-to-br from-saffron/10 to-primary/10 p-6 text-center">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Advertisement</div>
              <div className="mt-2 text-sm text-muted-foreground">Your ad could reach thousands of home buyers here.</div>
            </div>
          </div>
        </aside>
      </main>

      <section className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <h2 className="text-2xl font-bold">About Properties in {stateName}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {stateName} is one of India&apos;s most sought-after real estate markets. Whether you&apos;re looking for a 2 BHK flat, a villa, or an office space, Makan Mantraa brings verified listings from trusted agents and builders directly to your screen.
          </p>
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold">Popular searches</h3>
            <div className="flex flex-wrap gap-2">
              {[`2 BHK Flats in ${stateName}`, `3 BHK Villas`, `Plots for Sale`, `Rent in ${stateName}`, `New Projects`, `PG in ${stateName}`].map((t) => (
                <Badge key={t} variant="secondary" className="cursor-pointer hover:bg-accent">{t}</Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
