"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, History, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "@/context/location-context";

const RECENT_KEY = "mm-recent-searches";

const TABS = ["Buy", "Rent", "Commercial", "Plots"] as const;

const CATEGORY_BY_TAB: Record<(typeof TABS)[number], string> = {
  Buy: "All Residential",
  Rent: "All Residential",
  Commercial: "Commercial",
  Plots: "Plots/Land",
};

type RecentSearch = {
  id: string;
  label: string;
  tab: string;
  category: string;
  query: string;
  createdAt: number;
};

function readRecentSearches(): RecentSearch[] {
  try {
    const value = localStorage.getItem(RECENT_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function writeRecentSearches(searches: RecentSearch[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(searches.slice(0, 8)));
}

export function HeroSearch() {
  const { meta } = useLocation();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Buy");
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  const category = CATEGORY_BY_TAB[activeTab];
  const placeholder = useMemo(() => {
    const city = meta.from[0] || "Mumbai";
    const action = activeTab === "Rent" ? "rent" : "sale";
    if (activeTab === "Commercial") return `Search "office space in ${city}"`;
    if (activeTab === "Plots") return `Search "plots for sale in ${city}"`;
    return `Search "3 BHK for ${action} in ${city}"`;
  }, [activeTab, meta.from]);

  useEffect(() => {
    setRecentSearches(readRecentSearches());
  }, []);

  function saveSearch(searchQuery: string) {
    const trimmed = searchQuery.trim();
    const label = trimmed || `${activeTab} in ${meta.from[0]}, ${meta.label}`;
    const nextSearch: RecentSearch = {
      id: `${Date.now()}-${label}`,
      label,
      tab: activeTab,
      category,
      query: trimmed,
      createdAt: Date.now(),
    };

    setRecentSearches((current) => {
      const deduped = current.filter((item) => item.label.toLowerCase() !== label.toLowerCase());
      const next = [nextSearch, ...deduped].slice(0, 8);
      writeRecentSearches(next);
      return next;
    });
  }

  return (
    <div id="hero-search" className="mx-auto mt-6 w-full max-w-2xl">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          saveSearch(query);
        }}
        className="overflow-hidden rounded-xl border border-white/20 bg-white text-foreground shadow-xl"
      >
        <div className="flex min-h-10 items-center overflow-x-auto border-b border-border">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`relative flex h-10 shrink-0 items-center px-4 text-sm font-bold transition-colors ${
                activeTab === tab ? "text-[#0A2036]" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-t-full bg-saffron" />
              )}
            </button>
          ))}
        </div>

        <div className="grid gap-0 md:grid-cols-[150px_1fr_auto]">
          <button
            type="button"
            className="flex h-12 items-center justify-between border-b border-border px-3 text-left text-xs font-semibold text-muted-foreground hover:bg-muted/50 md:border-b-0 md:border-r"
          >
            {category}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          <div className="relative flex h-12 items-center px-3">
            <Search className="mr-2.5 h-4.5 w-4.5 shrink-0 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              className="h-9 border-0 px-0 text-sm shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="flex h-12 items-center px-3">
            <Button type="submit" className="h-8 min-w-20 rounded-md bg-saffron px-4 text-sm font-bold text-saffron-foreground hover:bg-saffron/90">
              Search
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <span className="text-[11px] font-semibold text-white/70">Recent:</span>
        {(recentSearches.length > 0 ? recentSearches.slice(0, 2) : [
          { id: "sample-1", label: `Buy in ${meta.from[0]}, ${meta.label}` },
        ]).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setQuery(item.label)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/20 bg-white/90 px-3 text-xs font-semibold text-[#0A2036] shadow-sm hover:bg-white"
          >
            <History className="h-3 w-3" />
            {item.label}
          </button>
        ))}
        {recentSearches.length > 2 && (
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/20 bg-white/90 px-3 text-xs font-bold text-[#0A2036] shadow-sm hover:bg-white"
          >
            <History className="h-3 w-3" />
            View all searches
          </button>
        )}
      </div>
    </div>
  );
}
