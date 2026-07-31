"use client";

import { useState } from "react";

type ExpandableDescriptionProps = {
  paragraphs: string[];
};

const COLLAPSED_PARAGRAPH_COUNT = 2;
const COLLAPSED_CHARACTER_LIMIT = 900;

export function ExpandableDescription({ paragraphs }: ExpandableDescriptionProps) {
  const [expanded, setExpanded] = useState(false);

  if (paragraphs.length === 0) return null;

  const previewParagraphs = buildPreviewParagraphs(paragraphs);
  const hasHiddenContent =
    paragraphs.length > previewParagraphs.length ||
    previewParagraphs.some((paragraph, index) => paragraph !== paragraphs[index]);
  const visibleParagraphs = expanded ? paragraphs : previewParagraphs;

  return (
    <div className="mt-3 w-full text-muted-foreground">
      <div className="space-y-3">
        {visibleParagraphs.map((paragraph, index) => (
          <p key={`${index}-${paragraph}`}>{paragraph}</p>
        ))}
      </div>

      {hasHiddenContent && (
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

function buildPreviewParagraphs(paragraphs: string[]) {
  const previewParagraphs: string[] = [];
  let usedCharacters = 0;

  for (const paragraph of paragraphs.slice(0, COLLAPSED_PARAGRAPH_COUNT)) {
    const remainingCharacters = COLLAPSED_CHARACTER_LIMIT - usedCharacters;

    if (remainingCharacters <= 0) break;

    if (paragraph.length > remainingCharacters) {
      previewParagraphs.push(truncateAtWord(paragraph, remainingCharacters));
      break;
    }

    previewParagraphs.push(paragraph);
    usedCharacters += paragraph.length;
  }

  return previewParagraphs.length > 0 ? previewParagraphs : [truncateAtWord(paragraphs[0], COLLAPSED_CHARACTER_LIMIT)];
}

function truncateAtWord(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;

  const trimmed = value.slice(0, maxLength).trimEnd();
  const lastSpace = trimmed.lastIndexOf(" ");
  const clipped = lastSpace > maxLength * 0.75 ? trimmed.slice(0, lastSpace) : trimmed;

  return `${clipped.trimEnd()}...`;
}
