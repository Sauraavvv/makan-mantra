"use client";

import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Window event the Chatbot listens for; fire it to open the assistant from anywhere. */
export const OPEN_ASSISTANT_EVENT = "mm:open-assistant";

/**
 * "Contact us" that opens the property assistant. There is no contact page
 * yet, and the assistant is the one place on the site that answers back.
 *
 * Without children it renders as an inline "Contact us →" link; pass
 * children (and button classes) to use it as a button.
 */
export function AskAssistantLink({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_ASSISTANT_EVENT))}
      className={cn(
        "group inline-flex items-center gap-1.5 transition-colors hover:text-saffron",
        className,
      )}
    >
      {children ?? (
        <>
          Contact us
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </>
      )}
    </button>
  );
}
