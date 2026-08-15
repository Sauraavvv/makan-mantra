"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MINIMUM_QUERY_LENGTH = 3;

type NewsSuggestion = {
  slug: string;
  title: string;
  category: string;
};

type NewsSearchProps = {
  className?: string;
  initialQuery?: string;
};

/** Searches only the Makan Mantraa news index, never property listings. */
export function NewsSearch({ className = "", initialQuery = "" }: NewsSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<NewsSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const search = query.trim();
  const showSuggestions = isFocused && search.length >= MINIMUM_QUERY_LENGTH;

  useEffect(() => {
    if (search.length < MINIMUM_QUERY_LENGTH) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API}/news/?search=${encodeURIComponent(search)}&limit=3`, {
          signal: controller.signal,
        });
        const news = response.ok ? (await response.json()) as NewsSuggestion[] : [];
        setSuggestions(news.slice(0, 3));
      } catch (error) {
        if ((error as Error).name !== "AbortError") setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [search]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(search ? `/blog?search=${encodeURIComponent(search)}` : "/blog");
    setIsFocused(false);
  }

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`} role="search">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => window.setTimeout(() => setIsFocused(false), 150)}
        placeholder="Search real estate news"
        aria-label="Search real estate news"
        className="h-10 w-full rounded-md border border-stone-300 bg-white py-2 pl-9 pr-20 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-[#bb432a] focus:ring-3 focus:ring-[#bb432a]/10"
      />
      <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded bg-[#202b3b] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#bb432a]">
        Search
      </button>
      {showSuggestions && (
        <div className="absolute inset-x-0 top-[calc(100%+0.35rem)] z-50 overflow-hidden rounded-md border border-stone-300 bg-white shadow-xl shadow-stone-900/10" role="listbox" aria-label="News suggestions">
          {isLoading ? (
            <p className="px-3 py-3 text-sm text-stone-500">Searching news…</p>
          ) : suggestions.length > 0 ? (
            <>
              <p className="border-b border-stone-200 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">News suggestions</p>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.slug}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    router.push(`/blog/${suggestion.slug}`);
                    setIsFocused(false);
                  }}
                  className="block w-full border-b border-stone-100 px-3 py-3 text-left last:border-b-0 hover:bg-stone-50"
                >
                  <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#bb432a]">{suggestion.category.replace(/-/g, " ")}</span>
                  <span className="mt-1 block line-clamp-2 text-sm font-semibold leading-snug text-stone-800">{suggestion.title}</span>
                </button>
              ))}
              <button
                type="submit"
                className="block w-full border-t border-stone-200 bg-stone-50 px-3 py-2.5 text-left text-xs font-bold text-[#b53a22] hover:bg-stone-100"
              >
                View all results for “{search}”
              </button>
            </>
          ) : (
            <p className="px-3 py-3 text-sm text-stone-500">No matching news found.</p>
          )}
        </div>
      )}
    </form>
  );
}
