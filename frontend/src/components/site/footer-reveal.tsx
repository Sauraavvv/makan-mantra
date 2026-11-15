"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useInView, useReducedMotion } from "framer-motion";

/** Footer panel colour; the skyline photo fades into it at the top. */
const FOOTER_BG = "#0A2036";
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Night-skyline photo sitting behind the lower part of the footer panel,
 * faded into the navy at the top so the links above stay readable.
 */
export function FooterSkyline() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[220px] select-none sm:h-[260px] lg:h-[300px]"
    >
      <Image
        src="/post-property-hero-night.webp"
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-[60%_78%] opacity-90"
      />
      <span
        className="absolute inset-x-0 top-0 h-3/4"
        style={{ background: `linear-gradient(${FOOTER_BG} 0%, ${FOOTER_BG}00 100%)` }}
      />
    </div>
  );
}

/**
 * Black strip revealed from underneath once the footer panel has scrolled
 * up past it.
 *
 * The strip is a normal-flow box with `clip-path`; its content is
 * `position: fixed` to the viewport bottom. clip-path clips fixed
 * descendants (painting and hit-testing), so the content stays put while the
 * footer panel (higher z-index, rounded bottom corners) slides off it like a
 * curtain. The negative top margin tucks the strip under the panel so the
 * black shows through the rounded corners.
 *
 * Heights are fixed per breakpoint because the in-flow box must reserve
 * exactly the fixed layer's height (plus the tucked-under overlap).
 */
export function FooterRevealStrip({ children }: { children: React.ReactNode }) {
  const stripRef = useRef<HTMLDivElement>(null);
  // Observe the in-flow strip, not the fixed layer: the fixed layer is always
  // geometrically "in view" and would animate on page load.
  const inView = useInView(stripRef, { amount: 0.6 });
  const reduceMotion = useReducedMotion();
  const shown = reduceMotion || inView;

  return (
    <div
      ref={stripRef}
      className="relative z-0 -mt-10 h-[calc(124px+2.5rem)] bg-black lg:-mt-12 lg:h-[calc(64px+3rem)]"
      style={{ clipPath: "inset(0)" }}
    >
      <div className="fixed inset-x-0 bottom-0 flex h-[124px] items-center bg-black lg:h-[64px]">
        <motion.div
          className="mx-auto w-full max-w-7xl px-4"
          initial={false}
          animate={shown ? { y: 0, opacity: 1 } : { y: 12, opacity: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
