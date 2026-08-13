"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Award, Building2, MapPin, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DirectoryBuilder } from "@/lib/builders-directory";

type SortKey = "name" | "projects" | "oldest";

const SORT_LABELS: Record<SortKey, string> = {
  name: "Name (A–Z)",
  projects: "Most projects",
  oldest: "Longest established",
};

const ALL = "all";

/** Enough distinct accents that neighbouring cards never share one. */
const ACCENTS = [
  { text: "text-[#1160F0]", bar: "bg-[#1160F0]", bg: "bg-[#1160F0]/10" },
  { text: "text-[#7A1FD1]", bar: "bg-[#7A1FD1]", bg: "bg-[#7A1FD1]/10" },
  { text: "text-[#F97316]", bar: "bg-[#F97316]", bg: "bg-[#F97316]/10" },
  { text: "text-[#0F8B8D]", bar: "bg-[#0F8B8D]", bg: "bg-[#0F8B8D]/10" },
] as const;

/** Projects shown before the card needs a "show all" click. */
const PROJECT_PREVIEW = 4;

export function BuildersDirectory({
  builders,
  states,
}: {
  builders: DirectoryBuilder[];
  states: string[];
}) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<string>(ALL);
  const [sort, setSort] = useState<SortKey>("name");

  const stateItems = useMemo(
    () => ({
      [ALL]: "All States & UTs",
      ...Object.fromEntries(states.map((item) => [item, item])),
    }),
    [states],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const filtered = builders.filter((builder) => {
      if (state !== ALL && builder.state !== state) return false;
      if (!needle) return true;

      // Searching a project or a city is how buyers actually recall a builder.
      return (
        builder.name.toLowerCase().includes(needle) ||
        builder.state.toLowerCase().includes(needle) ||
        builder.cities.some((city) => city.toLowerCase().includes(needle)) ||
        builder.projects.some((project) => project.toLowerCase().includes(needle))
      );
    });

    // `builders` arrives sorted by name, so that order is the tiebreaker below.
    if (sort === "projects") {
      return [...filtered].sort((a, b) => b.projects.length - a.projects.length);
    }
    if (sort === "oldest") {
      return [...filtered].sort((a, b) => Number(a.since) - Number(b.since));
    }

    return filtered;
  }, [builders, query, state, sort]);

  const filtersApplied = query.trim() !== "" || state !== ALL;

  const clearFilters = () => {
    setQuery("");
    setState(ALL);
  };

  return (
    <div>
      <div className="rounded-[20px] border border-border bg-background p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search builder, project or city..."
              aria-label="Search builders"
              className="h-11 pl-9"
            />
          </div>

          <Select
            items={stateItems}
            value={state}
            onValueChange={(value) => setState(value as string)}
          >
            <SelectTrigger className="h-11 w-full lg:w-[200px]" aria-label="Filter by state">
              <span className="flex min-w-0 items-center gap-2">
                <MapPin className="size-4 shrink-0 text-primary" />
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(stateItems).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={SORT_LABELS}
            value={sort}
            onValueChange={(value) => setSort(value as SortKey)}
          >
            <SelectTrigger className="h-11 w-full lg:w-[190px]" aria-label="Sort builders">
              <span className="flex min-w-0 items-center gap-2">
                <Award className="size-4 shrink-0 text-primary" />
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>
            Showing <strong className="font-semibold text-foreground">{visible.length}</strong> of{" "}
            {builders.length} builders
          </span>
          {filtersApplied && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              <X className="size-3.5" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-4 rounded-[20px] border border-dashed border-border bg-background px-6 py-16 text-center">
          <Building2 className="mx-auto size-8 text-muted-foreground" strokeWidth={1.6} />
          <p className="mt-3 text-base font-semibold text-foreground">
            No builders match this search
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different city, project or builder name.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((builder, index) => (
            <BuilderCard
              key={builder.id}
              builder={builder}
              accent={ACCENTS[index % ACCENTS.length]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BuilderCard({
  builder,
  accent,
}: {
  builder: DirectoryBuilder;
  accent: (typeof ACCENTS)[number];
}) {
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const projects = showAllProjects ? builder.projects : builder.projects.slice(0, PROJECT_PREVIEW);
  const hiddenProjects = builder.projects.length - projects.length;

  return (
    <article className="flex h-full flex-col rounded-[18px] border border-border bg-background p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        {builder.logo ? (
          <div className="relative size-14 shrink-0">
            <Image
              src={builder.logo}
              alt={builder.name}
              fill
              sizes="56px"
              className="object-contain"
            />
          </div>
        ) : (
          <div
            className={`grid size-14 shrink-0 place-items-center rounded-xl ${accent.bg} ${accent.text}`}
          >
            <div className="text-center">
              <Building2 className="mx-auto size-5" strokeWidth={1.8} />
              <span className="mt-0.5 block text-sm font-extrabold leading-none">
                {getInitials(builder.displayName)}
              </span>
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1">
          {/* Registered name on hover; the card itself drops the company form. */}
          <h2 title={builder.name} className="text-base font-extrabold leading-snug text-foreground">
            {builder.href ? (
              <Link href={builder.href} className="hover:text-primary">
                {builder.displayName}
              </Link>
            ) : (
              builder.displayName
            )}
          </h2>
          <Link
            href={builder.stateHref}
            className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-primary/10"
          >
            <MapPin className="size-3" /> {builder.state}
          </Link>
        </div>
      </div>

      <div className={`mt-4 h-1 w-12 rounded-full ${accent.bar}`} />

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat
          value={builder.experience ? `${builder.experience}+` : builder.since}
          label={builder.experience ? "Years" : "Since"}
        />
        <Stat value={String(builder.projects.length)} label="Projects" />
        <Stat
          value={String(builder.cities.length)}
          label={builder.cities.length === 1 ? "City" : "Cities"}
        />
      </dl>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Established {builder.since}
      </p>

      <div className="mt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Projects
        </p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {projects.map((project) => (
            <li
              key={project}
              className="rounded-md border border-border px-2 py-1 text-xs leading-snug text-foreground"
            >
              {project}
            </li>
          ))}
        </ul>
        {(hiddenProjects > 0 || showAllProjects) && (
          <button
            type="button"
            onClick={() => setShowAllProjects((open) => !open)}
            className={`mt-2 text-xs font-semibold ${accent.text} hover:underline`}
          >
            {hiddenProjects > 0 ? `+${hiddenProjects} more projects` : "Show fewer projects"}
          </button>
        )}
      </div>

      <div className="mt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Cities
        </p>
        <p className="mt-1 text-sm leading-relaxed text-foreground">{builder.cities.join(", ")}</p>
      </div>

      <div className="mt-auto pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">About</p>
        {/* Clamped rather than sliced: the summaries all run well past three
            lines, and the line count holds whatever the card's width is. */}
        <p
          className={`mt-1.5 text-sm leading-relaxed text-foreground ${
            showSummary ? "" : "line-clamp-3"
          }`}
        >
          {builder.summary}
        </p>
        <button
          type="button"
          onClick={() => setShowSummary((open) => !open)}
          className={`mt-2 text-xs font-semibold ${accent.text} hover:underline`}
        >
          {showSummary ? "Show less" : "Show more"}
        </button>
      </div>
    </article>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-secondary px-2 py-2">
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="block text-lg font-extrabold leading-none text-foreground">{value}</span>
        <span className="mt-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </dd>
    </div>
  );
}

function getInitials(name: string) {
  const words = name
    .replace(/\b(private|pvt|limited|ltd|llp|group|constructions?|developers?)\b/gi, " ")
    .split(/\s+/)
    .filter(Boolean);

  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}
