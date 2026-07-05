"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BedDouble, ChevronDown, Home, MapPin, Menu, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLocation } from "@/context/location-context";
import { stateExploreHref } from "@/lib/state-routes";

const STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh",
  "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand",
  "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const NAV = [
  { label: "Buy", href: stateExploreHref("Maharashtra"), icon: Home },
  { label: "Rent", href: `${stateExploreHref("Maharashtra")}?listing=rent`, icon: BedDouble },
];

export function Header() {
  const { meta, setStateByName } = useLocation();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [showSearch, setShowSearch] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = STATES.filter((s) =>
    s.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const heroSearch = document.getElementById("hero-search");

    if (!heroSearch) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowSearch(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );

    observer.observe(heroSearch);
    return () => observer.disconnect();
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0A2036] text-white shadow-lg shadow-black/10">
      <div className="flex h-16 w-full items-center gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center text-xl font-bold tracking-tight sm:text-2xl">
          <span>
            Makan <span className="text-saffron">Mantraa</span>
          </span>
        </Link>

        {/* Location dropdown — home page only */}
        {isHome && (
        <div
          ref={dropdownRef}
          className="relative shrink-0"
          onMouseEnter={() => setDropdownOpen(true)}
          onMouseLeave={() => { setDropdownOpen(false); setSearch(""); }}
        >
          <button
            onClick={() => { setDropdownOpen((o) => !o); setSearch(""); }}
            className="flex h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            <MapPin className="h-3.5 w-3.5 text-saffron shrink-0" />
            <span className="max-w-[90px] truncate">{meta.label}</span>
            <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 top-full z-50 mt-3 w-[min(calc(100vw-2rem),16rem)] overflow-hidden rounded-xl border border-border bg-popover text-foreground shadow-2xl">
              <div className="bg-muted p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search state"
                    className="h-9 w-full rounded-lg bg-background pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-b border-border px-2.5 py-2">
                <span className="truncate text-xs font-semibold">Selected: {meta.label}</span>
                  <button
                    onClick={() => { setStateByName(null); setDropdownOpen(false); }}
                  className="shrink-0 text-xs font-medium text-primary hover:underline"
                  >
                    All India
                  </button>
              </div>

              <div className="max-h-72 overflow-y-auto p-1.5">
                {filtered.map((state) => (
                  <button
                    key={state}
                    onClick={() => { setStateByName(state); setDropdownOpen(false); setSearch(""); }}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent ${meta.label === state ? "bg-saffron/10 font-semibold text-saffron" : "text-foreground"}`}
                  >
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${meta.label === state ? "bg-saffron/15 text-saffron" : "bg-muted text-muted-foreground"}`}>
                      <MapPin className="h-3.5 w-3.5" />
                    </span>
                    <span>{state}</span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">No states found</div>
                )}
              </div>
            </div>
          )}
        </div>
        )}

        <form
          className={`relative hidden flex-1 transition-all duration-300 md:block ${
            showSearch
              ? "max-w-md opacity-100"
              : "pointer-events-none max-w-0 overflow-hidden opacity-0"
          }`}
          onSubmit={(event) => event.preventDefault()}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search city, locality or project..."
            className="h-9 border-white/15 bg-white text-foreground pl-9 shadow-sm focus-visible:ring-white/30"
          />
        </form>

        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Button
          className="hidden h-9 shrink-0 gap-1 rounded-full bg-saffron px-4 text-sm font-semibold text-saffron-foreground hover:bg-saffron/90 sm:inline-flex"
        >
          <Plus className="h-4 w-4" /> Post Property{" "}
          <span className="ml-1 rounded bg-white/20 px-1 text-[10px] font-bold">FREE</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          disabled
          aria-disabled="true"
          className="hidden h-9 shrink-0 rounded-full border border-white/15 px-4 text-sm font-semibold text-white/75 opacity-100 hover:bg-transparent md:inline-flex"
        >
          Login
        </Button>

        <Sheet>
          <SheetTrigger
            aria-label="Open menu"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-white/30 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle>
                Makan <span className="text-saffron">Mantraa</span>
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 flex flex-col gap-1">
              <Button
                type="button"
                variant="outline"
                disabled
                aria-disabled="true"
                className="mb-2 w-full opacity-100"
              >
                Login
              </Button>
              {NAV.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium hover:bg-accent"
                >
                  <item.icon className="h-4 w-4 text-primary" />
                  {item.label}
                </Link>
              ))}
              <Button className="mt-4 w-full gap-1 bg-saffron text-saffron-foreground hover:bg-saffron/90">
                <Plus className="h-4 w-4" /> Post Property FREE
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
