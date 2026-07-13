"use client";

import { useState } from "react";

type ExpandableDescriptionProps = {
  paragraphs: string[];
};

export function ExpandableDescription({ paragraphs }: ExpandableDescriptionProps) {
  const [expanded, setExpanded] = useState(false);

  if (paragraphs.length === 0) return null;

  const visibleParagraphs = paragraphs.slice(0, 2);
  const remainingParagraphs = paragraphs.slice(2);

  return (
    <div className="mt-3 w-full text-muted-foreground">
      <div className="space-y-3">
        {visibleParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      {expanded && remainingParagraphs.length > 0 && (
        <div className="mt-3 space-y-3">
          {remainingParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      )}

      {remainingParagraphs.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-3 text-sm font-semibold text-saffron"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
