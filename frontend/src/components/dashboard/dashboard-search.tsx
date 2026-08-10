"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { useSearchHistory } from "@/context/search-history-context";

export function DashboardSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { track } = useSearchHistory();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const keyword = query.trim();
        if (!keyword) return;
        void track({
          label: keyword,
          query: keyword,
          tab: "Buy",
          category: "All Residential",
        });
        router.push(`/?q=${encodeURIComponent(keyword)}`);
      }}
      className="relative hidden w-full max-w-[500px] md:block"
    >
      <Search
        className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground"
        strokeWidth={1.8}
      />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Search properties"
        placeholder="Search location, property or project..."
        className="h-11 w-full rounded-lg border border-border bg-background pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-[#315ea8]"
      />
    </form>
  );
}
