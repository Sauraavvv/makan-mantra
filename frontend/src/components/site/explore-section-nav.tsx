"use client";

import { useEffect, useRef, useState } from "react";

import { subscribeReviewPanel } from "@/lib/review-panel";

export type ExploreSectionNavItem = {
  label: string;
  href: `#${string}`;
};

export function ExploreSectionNav({
  items,
}: {
  items: ExploreSectionNavItem[];
}) {
  const [activeHref, setActiveHref] = useState(items[0]?.href ?? "");
  // The review sidebar opens over this side of the page, and a sticky black
  // bar cutting across it reads as two things fighting for the same strip.
  const [reviewOpen, setReviewOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeReviewPanel(setReviewOpen), []);

  useEffect(() => {
    let animationFrame = 0;

    const updateActiveSection = () => {
      const marker = 132;
      let nextHref = items[0]?.href ?? "";

      for (const item of items) {
        const section = document.getElementById(item.href.slice(1));
        if (!section) continue;
        if (section.getBoundingClientRect().top <= marker) nextHref = item.href;
      }

      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2
      ) {
        nextHref = items.at(-1)?.href ?? nextHref;
      }

      setActiveHref((current) => (current === nextHref ? current : nextHref));
    };

    const handleViewportChange = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", handleViewportChange, { passive: true });
    window.addEventListener("resize", handleViewportChange);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", handleViewportChange);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [items]);

  useEffect(() => {
    const nav = navRef.current;
    const activeItem = nav?.querySelector<HTMLElement>(
      `[href="${activeHref}"]`,
    );
    if (!nav || !activeItem) return;

    const targetLeft =
      activeItem.offsetLeft - (nav.clientWidth - activeItem.clientWidth) / 2;
    nav.scrollTo({ left: Math.max(0, targetLeft), behavior: "auto" });
  }, [activeHref]);

  return (
    /* Folded away rather than unmounted: it is `sticky`, and taking it out of
       the flow would shift the page under the reader and then shift it back.
       Collapsed to no height it holds its place and the scroll position with
       it. */
    <div
      aria-hidden={reviewOpen}
      className={`sticky top-16 z-30 overflow-hidden border-black bg-black transition-all duration-300 ease-out ${
        reviewOpen
          ? "max-h-0 border-b-0 opacity-0"
          : "max-h-16 border-b opacity-100"
      }`}
    >
      <div
        ref={navRef}
        className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4"
      >
        {items.map((item) => {
          const active = item.href === activeHref;

          return (
            <a
              key={item.href}
              href={item.href}
              aria-current={active ? "location" : undefined}
              className={`flex h-11 shrink-0 flex-col items-center justify-center gap-1 text-sm font-medium ${
                active ? "text-saffron" : "text-white/85 hover:text-saffron"
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`h-0.5 w-5 rounded-full ${active ? "bg-saffron" : "bg-transparent"}`}
              />
            </a>
          );
        })}
      </div>
    </div>
  );
}
