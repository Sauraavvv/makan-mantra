"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, X } from "lucide-react";
import { useLocation } from "@/context/location-context";

/**
 * The offer to move to the state the visitor's IP now reads.
 *
 * Deliberately an offer and not a change: see `LocationProvider` for why the
 * site never switches markets on its own. Nothing renders until there is a
 * genuine difference to raise, so this costs an idle visitor no layout at all.
 *
 * It floats rather than sitting in the flow — arriving as a strip above the
 * page would shove the hero down a second after it painted, which is the one
 * thing a prompt this minor must not do.
 */
export function LocationSuggestion() {
  const { meta, suggestion, acceptSuggestion, dismissSuggestion } = useLocation();
  const pathname = usePathname();

  // The admin panel is a tool, not a storefront; it has no market to switch.
  if (pathname.startsWith("/admin")) return null;

  return (
    <AnimatePresence>
      {suggestion && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          role="dialog"
          aria-label="Change your location"
          className="fixed inset-x-4 bottom-4 z-40 rounded-2xl border border-border bg-popover p-4 text-foreground shadow-2xl sm:inset-x-auto sm:left-4 sm:w-80"
        >
          <button
            onClick={dismissSuggestion}
            aria-label="Keep my current location"
            className="absolute right-2 top-2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-2.5 pr-6">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl border border-border bg-secondary">
              <MapPin className="h-4 w-4 text-saffron" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug">
                Looks like you&apos;re in {suggestion}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                You&apos;re seeing properties for {meta.label}.
              </p>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={acceptSuggestion}
              className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Switch to {suggestion}
            </button>
            <button
              onClick={dismissSuggestion}
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Stay in {meta.label}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
