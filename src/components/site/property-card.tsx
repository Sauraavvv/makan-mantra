import Link from "next/link";
import { Bath, BedDouble, Bookmark, Clock, MapPin, Maximize2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Property } from "@/lib/properties";
import { generateSlug } from "@/lib/utils/slug";

export function PropertyCard({ p }: { p: Property }) {
  const href = `/property/${p.id}/${generateSlug(p.title)}`;

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={p.image}
          alt={p.title}
          loading="lazy"
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
        <Badge
          className={`absolute left-3 top-3 border-0 font-semibold ${
            p.listing === "sale"
              ? "bg-saffron text-saffron-foreground"
              : "bg-primary text-primary-foreground"
          }`}
        >
          {p.listing === "sale" ? "FOR SALE" : "FOR RENT"}
        </Badge>
        {p.featured && (
          <Badge className="absolute left-3 top-11 border-0 bg-success text-success-foreground">
            FEATURED
          </Badge>
        )}
        <button
          aria-label="Save"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-background/80 hover:bg-background"
        >
          <Bookmark className="h-4 w-4" />
        </button>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <Link href={href} className="line-clamp-1 text-base font-semibold hover:text-primary">
          {p.title}
        </Link>

        <div className="text-2xl font-bold text-primary">{p.priceLabel}</div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <BedDouble className="h-4 w-4" /> {p.beds} Bed
          </span>
          <span className="flex items-center gap-1">
            <Bath className="h-4 w-4" /> {p.baths} Bath
          </span>
          <span className="flex items-center gap-1">
            <Maximize2 className="h-4 w-4" /> {p.area} sq.ft
          </span>
        </div>

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="line-clamp-1">
            {p.locality}, {p.city}, {p.state}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" /> {p.posted}
          </span>
          <Button size="sm" className="bg-primary hover:bg-primary/90">
            Contact Agent
          </Button>
        </div>
      </div>
    </article>
  );
}
