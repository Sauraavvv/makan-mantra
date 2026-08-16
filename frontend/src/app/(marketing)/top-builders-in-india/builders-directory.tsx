"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Award,
  Building2,
  ChevronRight,
  MapPin,
  X,
} from "lucide-react";

import { BuilderLogo } from "@/components/site/builder-logo";
import type { DirectoryBuilder } from "@/lib/builders-directory";
import { stateSlug } from "@/lib/state-routes";

const INITIAL_FILTERS = ["ALL", "0-9", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"] as const;
type InitialFilter = (typeof INITIAL_FILTERS)[number];

function builderInitial(name: string): InitialFilter {
  const firstCharacter = name.trim().charAt(0).toUpperCase();
  if (/\d/.test(firstCharacter)) return "0-9";
  return INITIAL_FILTERS.includes(firstCharacter as InitialFilter)
    ? (firstCharacter as InitialFilter)
    : "0-9";
}

/** The card a `?builder=…&state=…` link points at, or null for a bare visit. */
function builderFromQuery(builders: DirectoryBuilder[], query: URLSearchParams) {
  const slug = query.get("builder");
  if (!slug) return null;

  const state = query.get("state");
  const matches = builders.filter((builder) => builder.slug === slug);

  // A builder listed in several states has a card in each; `state` picks one,
  // and without it any of them beats opening nothing.
  return matches.find((builder) => stateSlug(builder.state) === state) ?? matches[0] ?? null;
}

export function BuildersDirectory({ builders }: { builders: DirectoryBuilder[] }) {
  const [activeInitial, setActiveInitial] = useState<InitialFilter>("ALL");
  const [selectedBuilder, setSelectedBuilder] = useState<DirectoryBuilder | null>(null);

  /**
   * Opens the profile a link arrived on — the home page's "Explore builder"
   * lands here with the builder named in the query.
   *
   * Read off `window.location` rather than through `useSearchParams`, which
   * would drop this whole component out of the prerender and leave 163 cards of
   * indexable content to client-side rendering. The effect runs on mount, and a
   * client-side navigation from the home page mounts it fresh, so a link always
   * lands on the right profile.
   *
   * It has to be an effect, not a lazy initial state: the page is prerendered
   * with the drawer closed, so opening it during the first client render would
   * be a hydration mismatch. Hence the rule below is off for this one line.
   */
  useEffect(() => {
    const target = builderFromQuery(builders, new URLSearchParams(window.location.search));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (target) setSelectedBuilder(target);
  }, [builders]);

  /**
   * Keeps the address bar on the open profile, so the page can be shared or
   * reloaded as it stands. `replaceState` rather than a router push: the drawer
   * is a view of this page, not a place of its own to go back to.
   */
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);

    if (selectedBuilder) {
      query.set("builder", selectedBuilder.slug);
      query.set("state", stateSlug(selectedBuilder.state));
    } else {
      query.delete("builder");
      query.delete("state");
    }

    const search = query.toString();
    window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
  }, [selectedBuilder]);

  const availableInitials = useMemo(
    () => new Set(builders.map((builder) => builderInitial(builder.displayName))),
    [builders],
  );

  const visibleBuilders = useMemo(
    () =>
      activeInitial === "ALL"
        ? builders
        : builders.filter((builder) => builderInitial(builder.displayName) === activeInitial),
    [activeInitial, builders],
  );

  return (
    <>
      <div className="sticky top-16 z-30 border-b border-black bg-black">
        <div
          role="navigation"
          aria-label="Filter builders by first letter"
          className="mx-auto flex h-11 max-w-7xl items-stretch gap-1 overflow-x-auto px-4"
        >
          {INITIAL_FILTERS.filter(
            (initial) => initial === "ALL" || availableInitials.has(initial),
          ).map((initial) => {
            const active = activeInitial === initial;

            return (
              <button
                key={initial}
                type="button"
                aria-pressed={active}
                onClick={() => setActiveInitial(initial)}
                className={`relative grid min-w-9 shrink-0 place-items-center px-2 text-xs font-semibold transition-colors first:min-w-12 ${
                  active
                    ? "text-saffron"
                    : "text-white/80 hover:text-saffron"
                }`}
              >
                {initial === "ALL" ? "All" : initial}
                <span
                  className={`absolute bottom-0 h-0.5 w-5 rounded-full ${active ? "bg-saffron" : "bg-transparent"}`}
                />
              </button>
            );
          })}
        </div>
      </div>

      <section className="px-4 py-4 md:py-5">
        <div className="mx-auto max-w-[1250px]">
          {visibleBuilders.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-border bg-background px-6 py-16 text-center">
              <Building2 className="mx-auto size-8 text-muted-foreground" strokeWidth={1.6} />
              <p className="mt-3 text-base font-semibold text-foreground">
                No builders available
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleBuilders.map((builder) => (
                <BuilderCard
                  key={builder.id}
                  builder={builder}
                  onViewDetails={() => setSelectedBuilder(builder)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <BuilderDetailsDrawer builder={selectedBuilder} onClose={() => setSelectedBuilder(null)} />
    </>
  );
}

function BuilderCard({
  builder,
  onViewDetails,
}: {
  builder: DirectoryBuilder;
  onViewDetails: () => void;
}) {
  return (
    <article className="flex h-full flex-col rounded-[18px] border border-border bg-background p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <BuilderLogo builder={builder} className="size-14" />

        <div className="min-w-0 flex-1">
          {/* Registered name on hover; the card itself drops the company form. */}
          <div className="flex items-start justify-between gap-3">
            <h2 title={builder.name} className="min-w-0 text-base font-extrabold leading-snug text-foreground">
              {builder.href ? (
                <Link href={builder.href} className="hover:text-primary">
                  {builder.displayName}
                </Link>
              ) : (
                builder.displayName
              )}
            </h2>
            <button
              type="button"
              onClick={onViewDetails}
              className="shrink-0 text-xs font-semibold text-[#f97316] hover:underline"
            >
              View details
            </button>
          </div>
          <Link
            href={builder.stateHref}
            className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-primary/10"
          >
            <MapPin className="size-3" /> {builder.state}
          </Link>
        </div>
      </div>

    </article>
  );
}

function BuilderDetailsDrawer({ builder, onClose }: { builder: DirectoryBuilder | null; onClose: () => void }) {
  useEffect(() => {
    if (!builder) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [builder, onClose]);

  if (!builder) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        aria-label="Close builder details"
        onClick={onClose}
        className="absolute inset-0 bg-[#071425]/38 backdrop-blur-[1px]"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="builder-details-heading"
        className="absolute right-0 top-0 flex h-[100dvh] w-[min(100vw,32rem)] flex-col overflow-hidden border-l border-stone-200 bg-[#fbfaf8] shadow-2xl"
      >
        <header className="relative shrink-0 overflow-hidden bg-[radial-gradient(circle_at_12%_15%,#fbfaf8_0%,#f5efe8_58%,#e7eef7_100%)] px-6 pb-[calc(6dvh+0.75rem)] pt-5 sm:px-8 sm:pt-6 [@media(max-height:720px)]:px-5 [@media(max-height:720px)]:pt-4">
          <div className="relative z-10 min-w-0 pr-14">
            <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#f97316]">
              <span>Builder profile</span>
              <span className="h-px w-9 bg-[#f97316]" />
            </p>
            <div className="mt-3 flex items-center gap-3 [@media(max-height:720px)]:mt-2">
              <BuilderLogo
                builder={builder}
                className="size-16 shadow-sm [@media(max-height:720px)]:size-14"
              />
              <h2
                id="builder-details-heading"
                className="min-w-0 break-words text-[1.75rem] font-semibold leading-tight text-[#0c182a] [@media(max-height:720px)]:text-2xl"
              >
                {builder.displayName}
              </h2>
            </div>
            <Link
              href={builder.stateHref}
              className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full border border-orange-200 bg-white/80 px-3 py-1.5 text-xs font-bold text-[#1d293a] transition-colors hover:bg-white [@media(max-height:720px)]:mt-2"
            >
              <MapPin className="size-4 shrink-0 text-[#f97316]" />
              <span className="truncate">{builder.state}</span>
            </Link>
            <p className="mt-2 break-words text-xs leading-4 text-stone-600">
              {builder.cities.join(", ")}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-20 grid size-11 place-items-center rounded-full bg-white text-stone-600 shadow-md transition-colors hover:text-[#f97316] sm:right-5 sm:top-5"
            aria-label="Close builder details"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="relative z-10 mx-4 -mt-[6dvh] grid h-[12%] shrink-0 grid-cols-3 rounded-2xl bg-white px-2 py-2 shadow-[0_8px_24px_rgba(25,35,45,0.12)] sm:mx-6">
          <DetailStat icon={Award} tone="text-[#f97316] bg-orange-50" value={builder.experience ? `${builder.experience}+` : builder.since} label="Years" note="Experience" />
          <DetailStat icon={Building2} tone="text-[#4389cf] bg-blue-50" value={String(builder.projects.length)} label="Projects" note="Completed" />
          <DetailStat icon={MapPin} tone="text-[#639b32] bg-lime-50" value={String(builder.cities.length)} label={builder.cities.length === 1 ? "City" : "Cities"} note="Presence" />
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 py-3 sm:px-6 sm:py-4 [@media(max-height:720px)]:gap-3 [@media(max-height:720px)]:px-4 [@media(max-height:720px)]:py-2">
          <section className="shrink-0 rounded-2xl border border-orange-100 bg-[#fff3e8] px-5 py-4 text-stone-800 [@media(max-height:720px)]:rounded-xl [@media(max-height:720px)]:px-4 [@media(max-height:720px)]:py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#e86718]">About {builder.displayName}</p>
            <span className="mt-2 block h-0.5 w-8 bg-[#f97316]" />
            <p className="mt-3 text-xs leading-[1.65] text-stone-700 [@media(max-height:720px)]:mt-2 [@media(max-height:720px)]:text-[10px] [@media(max-height:720px)]:leading-[1.45]">{builder.summary}</p>
          </section>

          <div className="shrink-0 px-1">
            <section className="flex flex-col">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500">Projects</p>
              <span className="mt-2 block h-0.5 w-8 bg-[#f97316]" />
              <ul className="mt-3 grid min-h-0 grid-cols-2 gap-2 [@media(max-height:720px)]:mt-2 [@media(max-height:720px)]:gap-1.5">
                {builder.projects.slice(0, 6).map((project) => (
                  <li key={project} className="min-w-0">
                    <span className="flex min-w-0 items-start gap-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[10px] font-medium leading-snug text-[#1d293a] shadow-sm [@media(max-height:720px)]:px-2.5 [@media(max-height:720px)]:py-1.5">
                      <span className="min-w-0 flex-1 break-words">{project}</span>
                      <ChevronRight className="mt-0.5 size-3 shrink-0 text-stone-400" />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-32 overflow-hidden [@media(max-height:720px)]:h-24"
        >
          <Image
            src="/builder-sidebar-skyline.png"
            alt=""
            fill
            sizes="512px"
            className="object-cover object-bottom"
          />
        </div>
      </aside>
    </div>
  );
}

function DetailStat({ icon: Icon, tone, value, label, note }: { icon: typeof Award; tone: string; value: string; label: string; note: string }) {
  return <div className="flex min-w-0 items-center justify-center gap-2 border-r border-stone-100 px-1.5 text-left last:border-r-0 [@media(max-width:420px)]:gap-1"><span className={`grid size-8 shrink-0 place-items-center rounded-full [@media(max-height:720px)]:size-7 ${tone}`}><Icon className="size-4 [@media(max-height:720px)]:size-3.5" /></span><span className="min-w-0"><strong className="block text-xl font-bold leading-none text-[#0c182a] [@media(max-height:720px)]:text-base">{value}</strong><span className="mt-0.5 block text-[8px] font-bold uppercase tracking-[0.03em] text-[#1c2a3b]">{label}</span><span className="mt-0.5 block truncate text-[8px] text-stone-500 [@media(max-height:650px)]:hidden">{note}</span></span></div>;
}
