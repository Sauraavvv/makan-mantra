"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type NewsSearchProps = {
  className?: string;
  initialQuery?: string;
};

/** Searches only the Makan Mantraa news index, never property listings. */
export function NewsSearch({ className = "", initialQuery = "" }: NewsSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const search = query.trim();
    router.push(search ? `/blog?search=${encodeURIComponent(search)}` : "/blog");
  }

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`} role="search">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search real estate news"
        aria-label="Search real estate news"
        className="h-10 w-full rounded-md border border-stone-300 bg-white py-2 pl-9 pr-20 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-[#bb432a] focus:ring-3 focus:ring-[#bb432a]/10"
      />
      <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded bg-[#202b3b] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#bb432a]">
        Search
      </button>
    </form>
  );
}
