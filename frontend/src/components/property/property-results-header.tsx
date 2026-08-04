"use client";

export function SortBy() {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-[13px] text-muted-foreground">Sort by:</span>
      <select
        aria-label="Sort properties"
        defaultValue="recommended"
        className="h-9 rounded-lg border border-border bg-background px-2.5 text-[13px] outline-none focus:border-primary/60"
      >
        <option value="recommended">Recommended</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
        <option value="newest">Newest First</option>
      </select>
    </div>
  );
}
