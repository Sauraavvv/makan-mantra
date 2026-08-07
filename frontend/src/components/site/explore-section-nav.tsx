"use client";

import { useEffect, useRef, useState } from "react";

export type ExploreSectionNavItem = {
  label: string;
  href: `#${string}`;
};

export function ExploreSectionNav({ items }: { items: ExploreSectionNavItem[] }) {
  const [activeHref, setActiveHref] = useState(items[0]?.href ?? "");
  const navRef = useRef<HTMLDivElement>(null);

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

      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
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
    const activeItem = nav?.querySelector<HTMLElement>(`[href="${activeHref}"]`);
    if (!nav || !activeItem) return;

    const targetLeft = activeItem.offsetLeft - (nav.clientWidth - activeItem.clientWidth) / 2;
    nav.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
  }, [activeHref]);

  return (
    <div className="sticky top-16 z-30 border-b border-black bg-black">
      <div ref={navRef} className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4">
        {items.map((item) => {
          const active = item.href === activeHref;

          return (
            <a
              key={item.href}
              href={item.href}
              aria-current={active ? "location" : undefined}
              onClick={() => setActiveHref(item.href)}
              className={`relative shrink-0 py-3 text-sm font-medium transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:transition-colors ${
                active
                  ? "text-saffron after:bg-saffron"
                  : "text-white/85 after:bg-transparent hover:text-saffron"
              }`}
            >
              {item.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}
