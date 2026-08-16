"use client";

import Link from "next/link";
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  ArrowRight,
  Award,
  Building2,
  CalendarDays,
  MapPin,
} from "lucide-react";

import { BuilderLogo } from "@/components/site/builder-logo";
import { useLocation } from "@/context/location-context";
import type { DirectoryBuilder } from "@/lib/builders-directory";
import { stateSlug } from "@/lib/state-routes";

/**
 * Top builders for whichever state the header's location picker is on.
 *
 * The left panel is a full profile of one builder; the strip on the right holds
 * the rest as compact cards. Whichever card sits at the left edge of the strip
 * is the one the panel describes, so scrolling reads as feeding cards into it.
 *
 * `buildersByState` arrives from the server: the data file runs to a few
 * hundred KB, so the page hands over one state's slice rather than letting this
 * component import the whole thing into the browser.
 */

const ACCENTS = [
  { text: "text-[#1160F0]", bar: "bg-[#1160F0]", bg: "bg-[#1160F0]/10" },
  { text: "text-[#7A1FD1]", bar: "bg-[#7A1FD1]", bg: "bg-[#7A1FD1]/10" },
  { text: "text-[#F97316]", bar: "bg-[#F97316]", bg: "bg-[#F97316]/10" },
  { text: "text-[#0F8B8D]", bar: "bg-[#0F8B8D]", bg: "bg-[#0F8B8D]/10" },
] as const;

/** How long the profile takes to build itself up, and the beat between its rows. */
const REVEAL_MS = 700;
const REVEAL_STEP_MS = 110;

/** How long a card takes to travel out of the strip and behind the profile. */
const SLIDE_MS = 520;

/** Beat between automatic turns of the queue, measured turn to turn. */
const AUTO_ROTATE_MS = 3000;

/** Quiet spell after a reader touches the section before it turns again. */
const RESUME_MS = 6000;

/**
 * The profile is one column of a grid, so its height sets the height of the
 * whole section — and builders carry anywhere from 3 to 6 projects. Left free,
 * the section jumped on every turn of the queue, so the lists are held to a
 * fixed number of rows and whatever does not fit is counted instead.
 */
const PROJECT_ROWS = 2;

/**
 * Two rows of the pipe list, and the box that holds them.
 *
 * `leading-snug` on 14px text is 19.25px a row; two rows plus the 8px `gap-y`
 * come to 46.5px, so 48px clips nothing while still pinning the height.
 */
const PROJECT_ROWS_CLASS = "h-12 overflow-hidden";

/** Mirrors `gap-x-2.5` on PipeList — the packing below has to add it back. */
const PIPE_GAP = 10;

const CHARS_PER_LINE = 78;
/** Room kept back for the "+3 more" that replaces whatever was dropped. */
const MORE_LABEL_CHARS = 12;

function fitToLines(items: string[], lines: number) {
  const budget = CHARS_PER_LINE * lines;
  const width = (item: string) => item.length + 3; // the separator either side
  const total = items.reduce((sum, item) => sum + width(item), 0);

  if (total <= budget) return { shown: items, hidden: 0 };

  const shown: string[] = [];
  let used = 0;

  for (const item of items) {
    if (used + width(item) > budget - MORE_LABEL_CHARS) break;
    used += width(item);
    shown.push(item);
  }

  // Something always shows, even where one name alone overruns the budget.
  if (shown.length === 0) shown.push(items[0]);

  return { shown, hidden: items.length - shown.length };
}

export function TopBuildersShowcase({
  buildersByState,
}: {
  buildersByState: Record<string, DirectoryBuilder[]>;
}) {
  const { meta } = useLocation();
  const slug = stateSlug(meta.label);
  const builders = buildersByState[slug] ?? [];

  // Every state carries builders today, but an unknown slug still lands here.
  if (builders.length === 0) return null;

  // The state's own tally, not a claim about the market: whatever this section
  // is about to show is exactly what the line counts.
  const state = builders[0].state;
  const projects = builders.reduce((total, builder) => total + builder.projects.length, 0);
  const cities = new Set(builders.flatMap((builder) => builder.cities)).size;

  return (
    <section className="bg-secondary px-4 py-4 md:py-5">
      <div className="mx-auto w-full max-w-[1250px] rounded-[20px] border border-border bg-background px-5 py-5">
        <div className="mb-5">
          <h2 className="text-3xl font-bold leading-tight text-foreground md:text-4xl">
            {/* The data's own spelling, not the picker's: the picker title-cases
                what it stores, which turns "Jammu and Kashmir" into "... And ...". */}
            Top Builders in {state}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {builders.length} established {builders.length === 1 ? "developer" : "developers"} in{" "}
            {state} — {projects} {projects === 1 ? "project" : "projects"} delivered across {cities}{" "}
            {cities === 1 ? "city" : "cities"}.
          </p>
        </div>

        {/* Keyed by state: a new market remounts the strip, so the featured card
            and the scroll position both start over without an effect. */}
        <BuildersCarousel key={slug} builders={builders} />
      </div>
    </section>
  );
}

/**
 * A rotating queue. The builder at the head is magnified on the left and is not
 * repeated in the strip; advancing sends it to the back of the queue, so the
 * same list cycles round rather than running out.
 */
function BuildersCarousel({ builders }: { builders: DirectoryBuilder[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [head, setHead] = useState(0);
  const [paused, setPaused] = useState(false);
  /**
   * Bumped by every interaction so the resume timer below starts over. A
   * counter rather than a flag: hovering while already paused has to restart
   * the wait, and setting `paused` to true twice tells an effect nothing.
   */
  const [heldAt, setHeldAt] = useState(0);

  /** Anything the reader does to the section buys them a quiet spell. */
  const hold = () => {
    setPaused(true);
    setHeldAt((count) => count + 1);
  };

  const total = builders.length;
  const queue = [...builders.slice(head), ...builders.slice(0, head)];
  const featured = queue[0];
  const queued = queue.slice(1);

  const trackRef = useRef<HTMLDivElement>(null);
  /** Held for the length of a turn so one gesture never spins several builders. */
  const rotatingRef = useRef(false);

  /** Distance from one card to the next, measured rather than assumed. */
  const cardStride = () => {
    const cards = trackRef.current?.querySelectorAll<HTMLElement>("[data-builder-card]");
    if (!cards?.length) return 0;

    return cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : cards[0].offsetWidth + 16;
  };

  const settle = (track: HTMLElement, steps: number) => {
    flushSync(() => setHead((current) => (current + (steps % total) + total) % total));
    track.style.transition = "none";
    track.style.transform = "";
    rotatingRef.current = false;
  };

  /**
   * Carries the leading cards off to the left before the swap, so the builder is
   * seen travelling behind the profile rather than teleporting into it.
   *
   * Going back runs the same move in reverse: the queue changes first, then the
   * arriving card slides in from the left — otherwise the strip would open a gap
   * where a card that does not exist yet is meant to be.
   */
  const slide = (steps: number) => {
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    const stride = cardStride();
    if (!scroller || !track || !stride || rotatingRef.current || steps === 0) return;

    rotatingRef.current = true;
    const distance = steps * stride;

    if (steps < 0) {
      flushSync(() => setHead((current) => (current + (steps % total) + total) % total));
      track.style.transition = "none";
      track.style.transform = `translateX(${distance}px)`;
    } else {
      // Native scrolling has already eaten part of the journey; start from there
      // so the hand-off is invisible, then carry the card the rest of the way.
      const consumed = scroller.scrollLeft;
      scroller.scrollTo({ left: 0, behavior: "instant" });
      track.style.transition = "none";
      track.style.transform = `translateX(${-consumed}px)`;
    }

    requestAnimationFrame(() => {
      track.style.transition = `transform ${SLIDE_MS}ms cubic-bezier(0.33, 0, 0.15, 1)`;
      track.style.transform = steps < 0 ? "translateX(0px)" : `translateX(${-distance}px)`;
    });

    window.setTimeout(() => {
      if (steps > 0) {
        settle(track, steps);
        return;
      }

      // Going back already swapped; the card has simply finished arriving.
      track.style.transition = "none";
      rotatingRef.current = false;
    }, SLIDE_MS);
  };

  /**
   * Scrolling the strip feeds it: once the leading card has slipped a third of
   * its width past the left edge, the slide takes over and completes the trip.
   */
  const handleScroll = () => {
    const scroller = scrollerRef.current;
    if (!scroller || rotatingRef.current) return;

    // Touch has no hover to pause on, so the scroll itself is the interaction.
    hold();

    if (scroller.scrollLeft < cardStride() * 0.34) return;

    slide(1);
  };

  /**
   * The queue turns on its own. `slide` is read through a ref so the timer is
   * set once and keeps the beat, rather than being torn down and restarted on
   * every render — the interval is what makes the spacing even.
   */
  const slideRef = useRef(slide);

  useEffect(() => {
    slideRef.current = slide;
  });

  useEffect(() => {
    if (total <= 1 || paused) return;

    // Honour a reader who has asked the OS for less movement: the arrows, the
    // dots and the strip still work, nothing moves until they say so.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => slideRef.current(1), AUTO_ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [paused, total]);

  // Picks itself back up rather than waiting for the pointer to leave, so a
  // cursor resting anywhere over the section does not stop it for good.
  useEffect(() => {
    if (!paused) return;

    const timer = window.setTimeout(() => setPaused(false), RESUME_MS);

    return () => window.clearTimeout(timer);
  }, [paused, heldAt]);

  return (
    // Held still for a spell whenever it is read or used — a profile that
    // rewrote itself mid-sentence, or slid a card out from under the cursor
    // going to click it, would be unusable.
    <div
      onPointerEnter={hold}
      onPointerDown={hold}
      onFocusCapture={hold}
      className="w-full max-w-full overflow-hidden rounded-[24px] border border-[#DCE5F3] bg-white"
    >
      {/* Real columns rather than an overlaid panel: the profile is taller than
          any fixed height we could pick, and an absolute panel would spill over
          the strip — hiding the cards and swallowing their scroll. */}
      {/* A state with a single builder gets the whole width — there is no queue. */}
      {/* 40 to the profile, 60 to the strip; minmax(0,…) on both so a long
          project list cannot widen the profile column and squeeze the strip. */}
      <div
        className={
          total > 1 ? "lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-stretch" : ""
        }
      >
        <div className={total > 1 ? "border-b border-[#DCE5F3] lg:border-b-0 lg:border-r" : ""}>
          {/* Keyed so each turn of the queue animates in rather than swapping text. */}
          <FeaturedBuilder key={featured.id} builder={featured} />
        </div>

        {total > 1 && (
          <div className="flex min-w-0 flex-col justify-center px-5 py-6 sm:px-6 lg:px-7">
            <div
              ref={scrollerRef}
              onScroll={handleScroll}
              className="-mx-1 overflow-x-auto overscroll-x-contain scroll-smooth px-1 pb-3 pt-1 no-scrollbar"
            >
              <div ref={trackRef} className="flex w-max gap-4 will-change-transform">
                {queued.map((builder, index) => (
                  <div
                    key={builder.id}
                    data-builder-card
                    className="w-[min(70vw,205px)] shrink-0 xl:w-[205px]"
                  >
                    <CompactBuilderCard
                      builder={builder}
                      accent={ACCENTS[(head + 1 + index) % ACCENTS.length]}
                      // Clicking the third card walks the two ahead of it off to
                      // the left as well, so the queue always advances forward.
                      onSelect={() => slide(index + 1)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Position, not a control: a thumb the width of one builder's
                share of the queue, parked where that builder sits in it. It
                travels by exactly its own width per turn, so the strip reads as
                scrolling through a list rather than reshuffling. */}
            <div className="mt-2 flex justify-center" aria-hidden="true">
              <div className="h-1 w-20 overflow-hidden rounded-full bg-[#E3E9F2]">
                <div
                  className="h-full rounded-full bg-[#1160F0]"
                  style={{
                    width: `${100 / total}%`,
                    transform: `translateX(${head * 100}%)`,
                    transition: `transform ${SLIDE_MS}ms cubic-bezier(0.33, 0, 0.15, 1)`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FeaturedBuilder({ builder }: { builder: DirectoryBuilder }) {
  // No city count: the cities themselves are named on the line below it. The
  // founding year only earns its own slot when the years of experience are
  // already stated — otherwise both would read "Since 1975".
  const projects = `${builder.projects.length} ${builder.projects.length === 1 ? "project" : "projects"}`;
  const facts = builder.experience
    ? [`${builder.experience}+ years`, projects, `Since ${builder.since}`]
    : [`Since ${builder.since}`, projects];

  const cities = fitToLines(builder.cities, 1);

  return (
    <article className="flex h-full flex-col px-6 py-5 lg:px-7 lg:py-6">
      {/* Pulled out to the column's own edges by the article's padding, so the
          band runs the full width of the panel and up to its top; the rounded,
          clipping box around the whole carousel takes care of the corners.
          Its own padding puts the name back on the same line as everything
          below it. */}
      {/* The band itself does not animate. It carries no Reveal and its height
          is fixed by the reserve below, so as the queue turns it renders
          identically and reads as part of the panel rather than as something
          that arrives with each builder — only the name inside moves. */}
      <div className="-mx-6 -mt-5 bg-[#E9EDF3] px-6 py-4 lg:-mx-7 lg:-mt-6 lg:px-7">
        <Reveal step={0}>
          {/* Two lines of headroom — several names wrap at this column width,
              and without the reserve the section jolts as the queue turns past
              them. The one-line names centre in it rather than hanging from the
              top, which also keeps the band a constant height. */}
          <div className="flex min-h-[3.75rem] items-center gap-3 xl:min-h-[4.5rem]">
            <BuilderLogo builder={builder} className="size-14 shadow-sm" />
            <h3
              title={builder.name}
              className="min-w-0 text-2xl font-bold leading-tight tracking-tight text-[#0A2036] xl:text-[28px]"
            >
              {builder.displayName}
            </h3>
          </div>
        </Reveal>
      </div>

      <Reveal step={1} className="mt-4">
        <PipeList items={facts} className="text-sm leading-relaxed text-muted-foreground xl:text-base" />
      </Reveal>

      <Reveal
        step={2}
        className="mt-2 flex min-h-6 items-start gap-2 text-sm leading-snug text-[#0A2036] xl:text-base"
      >
        <MapPin className="mt-0.5 size-4 shrink-0 text-saffron" strokeWidth={2} />
        <Link href={builder.stateHref} className="hover:underline">
          {cities.shown.join(", ")}
          {cities.hidden > 0 && (
            <span className="text-muted-foreground"> +{cities.hidden} more</span>
          )}
        </Link>
      </Reveal>

      <Reveal step={3} className="mt-4 border-t border-border pt-4">
        <SectionLabel>Projects ({builder.projects.length})</SectionLabel>
        <RowFittedPipeList
          items={builder.projects}
          rows={PROJECT_ROWS}
          className={`mt-2 text-sm leading-snug text-[#0A2036] ${PROJECT_ROWS_CLASS}`}
        />
      </Reveal>

      <Reveal step={4} className="mt-4">
        <SectionLabel>About</SectionLabel>
        {/* Clamped with no expander: this column sets the height of the whole
            section, so a summary that could unfold would jolt the carousel. The
            full text is a click away on the directory page. */}
        <p className="mt-2 line-clamp-3 text-sm leading-snug text-[#0A2036]">{builder.summary}</p>
      </Reveal>

      <Reveal step={5} className="mt-auto pt-4">
        {/* Names the builder in the query, which the directory reads to open
            this same profile in its drawer — the reader carries on where they
            left off instead of hunting the card down in a list of 163. */}
        <Link
          href={`/top-builders-in-india?builder=${builder.slug}&state=${stateSlug(builder.state)}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0A2036] hover:underline"
        >
          Explore builder <ArrowRight className="size-4 text-saffron" strokeWidth={2} />
        </Link>
      </Reveal>
    </article>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </p>
  );
}

/**
 * As many items as genuinely fit in `rows` rows, then a count of the rest.
 *
 * Measured rather than estimated. A character budget cannot know the column's
 * real width, so it left a row half empty on a wide screen and overran on a
 * narrow one; here the browser reports each item's width and the packing is
 * exact at every breakpoint.
 *
 * The measuring pass needs every item and the tail in the DOM, so that is what
 * renders until the count is known — clipped by the fixed height, so the extras
 * are never seen. The server renders that same full list, which is why the box
 * looks right before hydration and only the "+N more" arrives late.
 */
function RowFittedPipeList({
  items,
  rows,
  className,
}: {
  items: string[];
  rows: number;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [shown, setShown] = useState<number | null>(null);
  const widthRef = useRef(0);

  // No reset when the builder changes: the profile above is keyed on the
  // builder, so a new one remounts this and measuring starts over anyway.
  useLayoutEffect(() => {
    const list = ref.current;
    if (!list || shown !== null) return;

    const width = list.clientWidth;
    widthRef.current = width;

    // Children run item, rule, item, rule, …, item, rule, tail.
    const nodes = Array.from(list.children) as HTMLElement[];
    const itemWidths = items.map((_, index) => nodes[index * 2]?.offsetWidth ?? 0);
    const ruleWidth = nodes[1]?.offsetWidth ?? 1;
    const tailWidth = nodes[nodes.length - 1]?.offsetWidth ?? 0;

    /** Lays `count` items out the way flex-wrap would, tail included. */
    const fits = (count: number) => {
      const widths: number[] = [];

      for (let index = 0; index < count; index += 1) {
        if (index > 0) widths.push(ruleWidth);
        widths.push(itemWidths[index]);
      }
      if (count < items.length) widths.push(ruleWidth, tailWidth);

      let used = 0;
      let row = 1;

      for (const itemWidth of widths) {
        const extended = used === 0 ? itemWidth : used + PIPE_GAP + itemWidth;

        if (extended <= width) {
          used = extended;
          continue;
        }

        row += 1;
        used = itemWidth;
        if (row > rows) return false;
      }

      return true;
    };

    // One name alone can be wider than the column; something always shows.
    let count = items.length;
    while (count > 1 && !fits(count)) count -= 1;

    setShown(count);
  }, [items, rows, shown]);

  // Only a change of width can change the packing — height moves on its own.
  useEffect(() => {
    const list = ref.current;
    if (!list) return;

    const observer = new ResizeObserver(() => {
      if (list.clientWidth === widthRef.current) return;

      widthRef.current = list.clientWidth;
      setShown(null);
    });

    observer.observe(list);

    return () => observer.disconnect();
  }, []);

  const measuring = shown === null;
  const visible = measuring ? items : items.slice(0, shown);
  const hidden = items.length - visible.length;

  return (
    <PipeList
      ref={ref}
      items={visible}
      // Kept in the DOM while measuring so its width can be read off it.
      trailing={measuring || hidden > 0 ? `+${hidden || items.length} more` : undefined}
      className={className}
    />
  );
}

/** Values run together as text, parted by a saffron rule — no chips, no borders. */
function PipeList({
  items,
  trailing,
  className,
  ref,
}: {
  items: string[];
  /** Muted tail such as "+3 more", set off by its own rule. */
  trailing?: string;
  className?: string;
  ref?: React.Ref<HTMLParagraphElement>;
}) {
  return (
    <p
      ref={ref}
      // No line-height here: the callers set it, and the row box below is sized
      // to whatever they pick.
      className={`flex flex-wrap items-center gap-x-2.5 gap-y-2 ${className ?? ""}`}
    >
      {items.map((item, index) => (
        <Fragment key={`${item}-${index}`}>
          <span>{item}</span>
          {(trailing || index < items.length - 1) && (
            <span aria-hidden="true" className="h-4 w-px shrink-0 bg-saffron" />
          )}
        </Fragment>
      ))}
      {trailing && <span className="text-muted-foreground">{trailing}</span>}
    </p>
  );
}

/**
 * One row of the profile, easing in a beat after the row above it. The profile
 * is remounted on every turn of the queue, so this replays each time and the
 * details read as assembling rather than blinking into place.
 */
function Reveal({
  step,
  className,
  children,
}: {
  step: number;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`animate-in fade-in slide-in-from-left-3 ${className ?? ""}`}
      style={{
        animationDuration: `${REVEAL_MS}ms`,
        animationDelay: `${step * REVEAL_STEP_MS}ms`,
        // Hold the "before" frame during the delay, or rows would flash in first.
        animationFillMode: "backwards",
      }}
    >
      {children}
    </div>
  );
}

function CompactBuilderCard({
  builder,
  accent,
  onSelect,
}: {
  builder: DirectoryBuilder;
  accent: (typeof ACCENTS)[number];
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={`Show ${builder.displayName} in full`}
      className="flex h-full min-h-[265px] w-full flex-col rounded-md border border-[#DCE5F3] bg-white px-4 py-4 text-left transition-transform duration-300 hover:-translate-y-1 hover:border-[#1160F0]"
    >
      {/* The accent colour lives on the rule below rather than the tile once a
          logo takes the tile's place, so the cards stay colour-coded either
          way. */}
      {builder.logo ? (
        <BuilderLogo builder={builder} className="mx-auto size-14" />
      ) : (
        <div
          className={`mx-auto grid size-14 place-items-center rounded-md ${accent.bg} ${accent.text}`}
        >
          <div className="text-center">
            <Building2 className="mx-auto size-5" strokeWidth={1.8} />
            <span className="mt-0.5 block text-sm font-extrabold leading-none">
              {getInitials(builder.displayName)}
            </span>
          </div>
        </div>
      )}

      <h3 className="mt-3 min-h-12 text-center text-sm font-extrabold leading-snug text-[#071B45]">
        {builder.displayName}
      </h3>

      <div className={`mx-auto mt-1 h-1 w-12 rounded-full ${accent.bar}`} />

      <div className="mt-4 space-y-3 text-xs font-semibold leading-snug text-[#071B45]">
        {builder.experience && (
          <Row icon={Award} accent={accent}>
            {builder.experience}+ Years of Experience
          </Row>
        )}
        <Row icon={CalendarDays} accent={accent}>
          Since {builder.since}
        </Row>
        <Row icon={Building2} accent={accent}>
          {builder.projects.length} {builder.projects.length === 1 ? "Project" : "Projects"}
        </Row>
        <Row icon={MapPin} accent={accent}>
          <span className="line-clamp-1">
            {builder.cities[0]}
            {builder.cities.length > 1 && ` +${builder.cities.length - 1}`}
          </span>
        </Row>
      </div>
    </button>
  );
}

function Row({
  icon: Icon,
  accent,
  children,
}: {
  icon: typeof Award;
  accent: (typeof ACCENTS)[number];
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className={`size-4 shrink-0 ${accent.text}`} strokeWidth={1.9} />
      <span className="min-w-0">{children}</span>
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
