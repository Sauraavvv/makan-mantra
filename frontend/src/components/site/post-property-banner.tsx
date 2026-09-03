"use client";

import Image from "next/image";
import { useState } from "react";
import { Camera, Check, FileCheck2, ShieldUser } from "lucide-react";

import { PostPropertyWizard } from "@/components/site/post-property-wizard";
import { cn } from "@/lib/utils";

/**
 * The rail's three stops, in the same order as the wizard's own steps. It reads
 * the step out of the form rather than tracking any state of its own, so the two
 * can never disagree about which stop is lit.
 */
const RAIL_STEPS = [
  {
    icon: FileCheck2,
    label: "Property Details",
    copy: "Type, listing and what makes it special",
  },
  {
    icon: ShieldUser,
    label: "Owner Details",
    copy: "How buyers and our team reach you",
  },
  {
    icon: Camera,
    label: "Photos & Videos",
    copy: "Add photos and a walkthrough video",
  },
];

/* Every rail measurement is a percentage of the artwork, which never crops, so
   the whole diagram tracks the illustration at any width. The phone ends at 36%
   and the card starts at 64%; the trunk and its stops sit in between. */
const ROW_TOP = [26, 50, 74];
const TRUNK_X = 38.5;
const STOP_X = 41;
const STOP_W = 17.5;

export function PostPropertyBanner() {
  const [step, setStep] = useState(0);

  return (
    <div className="relative">
      {/* The artwork is drawn around the form: the figure and the phone hold the
          left third and the rest is left empty for the rail and the card. The
          asset is trimmed a little top and bottom to keep the section from
          running tall, and is laid out uncropped at its own 2.17:1. */}
      <div className="overflow-hidden rounded-[20px]">
        <Image
          src="/post-property-banner-v6.webp"
          alt="List your property on MakanMantraa and reach the right buyers"
          width={3548}
          height={1632}
          sizes="(min-width: 1280px) 1226px, 100vw"
          quality={90}
          className="h-auto w-full"
        />
      </div>

      {/* Decorative: the card already announces "Step n of 3" to a screen
          reader, so the rail saying it a second time would only be noise. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
        {/* Phone into the trunk */}
        <span
          className="absolute top-1/2 h-px -translate-y-1/2 bg-saffron/30"
          style={{ left: "36%", width: `${TRUNK_X - 36}%` }}
        />
        <span className="absolute top-1/2 left-[36%] size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-saffron/40" />

        {/* Trunk, and the fill that walks it down one stop per completed step */}
        <span
          className="absolute w-px -translate-x-1/2 bg-saffron/30"
          style={{ left: `${TRUNK_X}%`, top: `${ROW_TOP[0]}%`, height: `${ROW_TOP[2] - ROW_TOP[0]}%` }}
        />
        <span
          className="absolute w-px -translate-x-1/2 bg-saffron transition-[height] duration-500 ease-out"
          style={{ left: `${TRUNK_X}%`, top: `${ROW_TOP[0]}%`, height: `${ROW_TOP[step] - ROW_TOP[0]}%` }}
        />

        {/* Trunk out to each stop, meeting the tile's left edge */}
        {ROW_TOP.map((top, index) => (
          <span
            key={top}
            className={cn(
              "absolute h-px -translate-y-1/2 transition-colors duration-300",
              index <= step ? "bg-saffron" : "bg-saffron/30",
            )}
            style={{ left: `${TRUNK_X}%`, top: `${top}%`, width: `${STOP_X - TRUNK_X}%` }}
          />
        ))}

        {/* A stop names its step rather than leaving a bare glyph to carry it —
            there is room for it in the band the artwork leaves open, and the
            form on the right only ever shows the step it is on. */}
        {RAIL_STEPS.map((item, index) => {
          const done = index < step;
          const active = index === step;
          const lit = done || active;

          return (
            <span
              key={item.label}
              className={cn(
                "absolute flex min-h-[72px] -translate-y-1/2 items-center gap-2.5 rounded-2xl border p-3 transition-colors duration-300 xl:min-h-[84px] xl:gap-3 xl:p-3.5",
                active
                  ? "border-saffron bg-background shadow-sm ring-4 ring-saffron/10"
                  : done
                    ? "border-saffron/40 bg-background"
                    : "border-saffron/20 bg-background/70",
              )}
              style={{ left: `${STOP_X}%`, top: `${ROW_TOP[index]}%`, width: `${STOP_W}%` }}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-xl transition-colors duration-300 xl:size-10",
                  lit ? "bg-saffron text-saffron-foreground" : "bg-saffron/10 text-muted-foreground",
                )}
              >
                {done ? (
                  <Check className="size-4 xl:size-5" strokeWidth={2.5} />
                ) : (
                  <item.icon className="size-4 xl:size-5" strokeWidth={1.8} />
                )}
              </span>

              <span className="min-w-0">
                <span
                  className={cn(
                    "block truncate text-[11px] font-bold leading-tight xl:text-xs",
                    lit ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
                <span className="mt-1 block text-[10px] leading-relaxed text-muted-foreground xl:text-[11px]">
                  {item.copy}
                </span>
              </span>
            </span>
          );
        })}
      </div>

      {/* `h-auto` at both breakpoints drops the card's own fixed heights so the
          inset pair sizes it instead — it then grows with the artwork rather
          than overhanging it. Below `lg` the artwork is too small to hold a
          form, so the card falls back under it and the rail is dropped. */}
      <PostPropertyWizard
        variant="compact"
        source="banner"
        onStepChange={setStep}
        className="relative z-10 -mt-6 mx-3 sm:mx-8 lg:absolute lg:inset-y-[3%] lg:right-[4%] lg:mx-0 lg:mt-0 lg:h-auto lg:w-[32%] xl:h-auto"
      />
    </div>
  );
}
