"use client";

import { useMemo, useState } from "react";
import { ChevronDown, History, Mic, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "@/context/location-context";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useSearchHistory } from "@/context/search-history-context";

const TABS = ["Buy", "Rent", "Commercial", "Plots"] as const;

const CATEGORY_BY_TAB: Record<(typeof TABS)[number], string> = {
  Buy: "All Residential",
  Rent: "All Residential",
  Commercial: "Commercial",
  Plots: "Plots/Land",
};

type HeroSearchProps = {
  align?: "center" | "left";
  showRecent?: boolean;
  locationName?: string;
};

export function HeroSearch({ align = "center", showRecent = true, locationName }: HeroSearchProps = {}) {
  const { meta } = useLocation();
  const { items: recentSearches, track } = useSearchHistory();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Buy");
  const [query, setQuery] = useState("");

  const { isSupported: micSupported, status: micStatus, toggle: toggleMic } =
    useSpeechRecognition((text) => setQuery(text));

  const category = CATEGORY_BY_TAB[activeTab];
  const searchLocation = locationName || meta.from[0] || "Mumbai";
  const searchLabel = locationName || meta.label;
  const placeholder = useMemo(() => {
    const action = activeTab === "Rent" ? "rent" : "sale";
    if (activeTab === "Commercial") return `Search "office space in ${searchLocation}"`;
    if (activeTab === "Plots") return `Search "plots for sale in ${searchLocation}"`;
    return `Search "3 BHK for ${action} in ${searchLocation}"`;
  }, [activeTab, searchLocation]);

  function saveSearch(searchQuery: string) {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    void track({
      label: trimmed,
      tab: activeTab,
      category,
      query: trimmed,
    });
  }

  return (
    <div
      id="hero-search"
      className={`mt-6 w-full max-w-2xl ${align === "center" ? "mx-auto" : ""}`}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          saveSearch(query);
        }}
        className="overflow-hidden rounded-xl border border-white/20 bg-white text-foreground"
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
              placeholder={micStatus === "listening" ? "Listening…" : placeholder}
              className="h-9 border-0 px-0 text-sm shadow-none focus-visible:ring-0"
            />
            {micSupported && (
              <button
                type="button"
                onClick={toggleMic}
                aria-label={micStatus === "listening" ? "Stop listening" : "Voice search"}
                className={`ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                  micStatus === "listening"
                    ? "animate-pulse bg-red-500 text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Mic className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex h-12 items-center px-3">
            <Button type="submit" className="h-8 min-w-20 rounded-md bg-saffron px-4 text-sm font-bold text-saffron-foreground hover:bg-saffron/90">
              Search
            </Button>
          </div>
        </div>
      </form>

      {showRecent && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="text-[11px] font-semibold text-white/70">Recent:</span>
          {(recentSearches.length > 0 ? recentSearches.slice(0, 2) : [
            { id: "sample-1", label: `Buy in ${searchLabel}` },
          ]).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setQuery(item.label)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/20 bg-white/90 px-3 text-xs font-semibold text-[#0A2036] hover:bg-white"
            >
              <History className="h-3 w-3" />
              {item.label}
            </button>
          ))}
          {recentSearches.length > 2 && (
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/20 bg-white/90 px-3 text-xs font-bold text-[#0A2036] hover:bg-white"
            >
              <History className="h-3 w-3" />
              View all searches
            </button>
          )}
        </div>
      )}
    </div>
  );
}
