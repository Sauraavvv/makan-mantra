"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BedDouble,
  Boxes,
  Car,
  Contact,
  Heart,
  KeyRound,
  MapPin,
  Phone,
  Scaling,
  Sofa,
  Star,
} from "lucide-react";
import { useSaved } from "@/context/saved-context";
import type { DummyProperty } from "@/lib/dummy-properties";
import { cn } from "@/lib/utils";

type LucideIcon = typeof BedDouble;

function Spec({
  icon: Icon,
  label,
  value,
  chip,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  chip?: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Icon
        className="mt-0.5 size-5 shrink-0 text-muted-foreground"
        strokeWidth={1.4}
      />
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <span className="truncate">{label}</span>
          {chip && (
            <span className="shrink-0 rounded bg-secondary px-1 py-0.5 text-[9px] font-medium text-foreground/70">
              {chip}
            </span>
          )}
        </p>
        <p className="truncate text-[13px] font-bold text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

/** Where the blurb sits beside the specs; below it, it stacks under them. */
const SIDE_BY_SIDE = "(min-width: 1024px)";

/** What a stacked card shows before it asks you to open the rest. */
const STACKED_LINES = 2;

/**
 * The blurb, run to the bottom of the space it has been given.
 *
 * Beside the specs that space is whatever they are tall — three rows of them —
 * and a fixed line count either stopped short of it, leaving the column half
 * empty, or ran past it and pushed the card taller. So the number of lines is
 * read off the height rather than written down, and "Read More" appears only
 * when there is something left over: a description that fits is shown whole,
 * with nothing to click.
 */
function CardDescription({ text }: { text: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  // How many lines fit. `null` until measured, while the class below holds a
  // short clamp so nothing paints at full length on the first frame.
  const [lines, setLines] = useState<number | null>(null);
  const [clipped, setClipped] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    const paragraph = paragraphRef.current;
    if (!box || !paragraph) return;

    const wide = window.matchMedia(SIDE_BY_SIDE);

    const measure = () => {
      const lineHeight = parseFloat(getComputedStyle(paragraph).lineHeight);
      if (!Number.isFinite(lineHeight) || lineHeight <= 0) return;

      // The box's height, not the paragraph's: beside the specs the box is
      // stretched to their height and the text is lifted out of the flow, so
      // the box says how much room there is and the paragraph says how much
      // of the text got in. Measuring the paragraph instead would be asking
      // the clamped text how long the unclamped text was.
      const room = wide.matches
        ? Math.max(1, Math.floor(box.clientHeight / lineHeight))
        : STACKED_LINES;

      setLines(room);
      setClipped(paragraph.scrollHeight > room * lineHeight + 1);
    };

    // Fires once on observe and again whenever the card is resized, so the
    // first reading comes from it too and the effect never sets state itself.
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    wide.addEventListener("change", measure);

    return () => {
      observer.disconnect();
      wide.removeEventListener("change", measure);
    };
  }, [text]);

  return (
    <div ref={boxRef} className="relative flex-1">
      {/* Lifted out of the flow where the columns sit side by side, so the
          blurb cannot be what decides how tall the row is — the specs decide
          that, and this fills whatever they leave. Stacked, it drops back
          into the flow and takes the height its own two lines need. */}
      <div className="relative lg:absolute lg:inset-x-0 lg:top-0">
        <p
          ref={paragraphRef}
          className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground"
          style={lines === null ? undefined : { WebkitLineClamp: lines }}
        >
          {text}
        </p>

        {/* Anchored to the foot of the text rather than the foot of the box:
            the clamp lands on a whole line, which rarely falls exactly on the
            bottom of the space, and the link belongs on the last line it
            interrupts. */}
        {clipped && (
          <button
            type="button"
            className="absolute bottom-0 right-0 bg-background pl-5 text-[13px] font-medium text-foreground underline underline-offset-2"
          >
            Read More
          </button>
        )}
      </div>
    </div>
  );
}

export function PropertyCard({
  property,
  cityName,
}: {
  property: DummyProperty;
  cityName: string;
}) {
  const router = useRouter();
  const { isSaved, toggle, isGuest } = useSaved();
  const [notice, setNotice] = useState("");
  const saved = isSaved(property.id);
  const place = `${property.locality}, ${cityName}`;
  const snapshot = {
    title: property.title,
    price: property.price,
    locality: property.locality,
    city: cityName,
    image: property.image,
    config: property.config,
    area: property.area,
  };

  const onToggleSaved = async () => {
    const result = await toggle(property.id, {
      ...snapshot,
    });

    if (result === "signin") {
      // Only a session that expired mid-visit lands here now — a signed-out
      // visitor keeps their shortlist on the device. The header opens its
      // sign-in modal off `?auth=login`, so they keep their place in the
      // listing instead of losing it to a login page.
      const params = new URLSearchParams(window.location.search);
      params.set("auth", "login");
      router.push(`${window.location.pathname}?${params.toString()}`);
      return;
    }

    if (result === "error") {
      setNotice("Could not update your shortlist");
      setTimeout(() => setNotice(""), 2500);
      return;
    }

    // Said once, on the way in: the shortlist is real but only on this device
    // until they have an account to keep it in.
    if (result === "saved" && isGuest) {
      setNotice("Saved on this device — sign in to keep it");
      setTimeout(() => setNotice(""), 3000);
    }
  };

  return (
    <article className="relative overflow-hidden rounded-xl border border-border bg-background transition-shadow hover:shadow-md">
      {/* The card's corner, not the photo's. The photo only occupies the left
          of the card, so a mark pinned inside it sat in the middle of the row
          — and over paper rather than over an image it needs the panel's own
          border and ground instead of a dark scrim to read against. */}
      <button
        type="button"
        onClick={onToggleSaved}
        aria-label={saved ? "Remove from shortlist" : "Add to shortlist"}
        aria-pressed={saved}
        className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-secondary"
      >
        <Heart className={cn("size-4", saved && "fill-saffron text-saffron")} />
      </button>

      <div className="flex flex-col md:flex-row">
        <div className="relative aspect-[4/3] w-full shrink-0 md:aspect-auto md:w-[240px] lg:w-[280px]">
          <Image
            src={property.image}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 280px"
            className="object-cover"
          />

          {notice && (
            <p className="absolute inset-x-2 bottom-2 rounded-md bg-black/75 px-2 py-1 text-center text-[11px] font-medium text-white backdrop-blur-sm">
              {notice}
            </p>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="p-4">
            <h3 className="text-base font-bold leading-snug text-foreground md:text-lg">
              {property.title} in {place}
            </h3>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <p className="flex items-center gap-1 text-[13px] text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" />
                {place}
              </p>
            </div>

            <p className="mt-2.5 text-xl font-bold text-foreground">
              {property.price}
            </p>

            {/* Specs and blurb share a row rather than stacking. Given the
                full width the six specs ran three across and the paragraph
                below them was two lines of a very long measure; side by side
                the specs read in two columns and the copy gets a column
                narrow enough to show several lines of it instead. */}
            <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3 lg:flex-row lg:gap-4">
              <CardDescription text={property.description} />

              {/* Two across, not three: the specs have about two thirds of
                  the row, which is the same width per column they had when
                  three of them shared the whole of it.

                  The rule between the two lives here, as a left border on the
                  second column — it stretches to the row's height, so it runs
                  the full depth of whichever side is taller. Stacked, it goes
                  back to being the horizontal rule it was. */}
              {/* A rule between the two spec columns as well. It is drawn on
                  the cells of the right-hand column rather than on a column
                  wrapper, because the specs flow across the grid rather than
                  down it and there is no wrapper to put it on. The row gap is
                  traded for padding inside each cell so the three borders meet
                  end to end and read as one line instead of three dashes. */}
              <div className="grid flex-[2] gap-0 border-t border-border pt-3 [&>*]:py-2 sm:grid-cols-2 sm:[&>*:nth-child(even)]:border-l sm:[&>*:nth-child(even)]:border-border sm:[&>*:nth-child(even)]:pl-4 sm:[&>*:nth-child(odd)]:pr-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                <Spec icon={BedDouble} label="Config" value={property.config} />
                <Spec
                  icon={Scaling}
                  label="Area"
                  value={property.area}
                  chip={property.areaType}
                />
                <Spec
                  icon={Boxes}
                  label="Additional Spaces"
                  value={property.additionalSpaces}
                />
                <Spec
                  icon={KeyRound}
                  label="Possession Status"
                  value={property.possession}
                />
                <Spec icon={Car} label="Parking" value={property.parking} />
                <Spec
                  icon={Sofa}
                  label="Furnishing Status"
                  value={property.furnishing}
                />
              </div>
            </div>
          </div>

          <footer className="mt-auto flex flex-wrap items-center gap-2.5 border-t border-border bg-secondary/50 px-4 py-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              {property.agent.name.charAt(0)}
            </span>

            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold text-foreground">
                {property.agent.name}
              </p>
              {property.agent.pro && (
                <span className="mt-0.5 inline-flex items-center gap-1 rounded bg-saffron/15 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-saffron">
                  <Star className="size-2.5 fill-current" />
                  Pro Agent
                </span>
              )}
            </div>

            <div className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-[13px] font-semibold transition-colors hover:bg-secondary"
              >
                <Contact className="size-3.5" />
                View Number
              </button>

              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg bg-saffron px-3 py-2 text-[13px] font-semibold text-saffron-foreground transition-opacity hover:opacity-90"
              >
                <Phone className="size-3.5" />
                Contact Agent
              </button>
            </div>
          </footer>
        </div>
      </div>
    </article>
  );
}
