"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type LineClampedDescriptionProps = {
  text: string;
  lines?: number;
  className?: string;
};

export function LineClampedDescription({
  text,
  lines = 8,
  className = "",
}: LineClampedDescriptionProps) {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  return (
    <div className={className}>
      <p
        className="text-sm leading-relaxed text-muted-foreground"
        style={
          expanded
            ? undefined
            : {
                display: "-webkit-box",
                WebkitLineClamp: lines,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }
        }
      >
        {text}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-saffron transition-colors hover:text-saffron/80"
      >
        {expanded ? (
          <>
            Show less <ChevronUp className="h-4 w-4" strokeWidth={1.8} />
          </>
        ) : (
          <>
            Show more <ChevronDown className="h-4 w-4" strokeWidth={1.8} />
          </>
        )}
      </button>
    </div>
  );
}
