"use client";

import { useEffect, useRef, useState } from "react";

type ExpandableDescriptionProps = {
  paragraphs: string[];
};

/** How much of the description stands on the page before it is folded away. */
const COLLAPSED_LINES = 4;

/** What the cut looks like, and what has to fit on the line beside it. */
const ELLIPSIS = "...";
const MORE_LABEL = "read more";

export function ExpandableDescription({ paragraphs }: ExpandableDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  // How many characters survive the cut. `null` before anything has been
  // measured, and while the whole description already fits — in both cases
  // the copy is shown as it is, with no way in and nothing hidden.
  const [cut, setCut] = useState<number | null>(null);
  const measureRef = useRef<HTMLParagraphElement>(null);
  // Watched instead of the twin below. Measuring means writing text into the
  // twin, which changes its height — and an observer watching the element it
  // is resizing is an observer that never stops firing. This one is pinned to
  // zero height and holds nothing, so the only thing it can report is the
  // width the copy has to fit into.
  const widthRef = useRef<HTMLSpanElement>(null);

  // Collapsed, the description is one block. Line counting happens inside a
  // single element, so paragraph breaks would each start the count again and
  // let a four-paragraph page run to sixteen lines.
  const text = paragraphs.join(" ");

  useEffect(() => {
    if (expanded) return;

    const element = measureRef.current;
    const sentinel = widthRef.current;
    if (!element || !sentinel) return;

    // Fires once when it starts watching and again on every width change, so
    // the first reading comes from the observer too and the effect never
    // sets state itself. Width is what matters here: the same paragraph runs
    // to three lines across a desktop and to eleven on a phone.
    const observer = new ResizeObserver(() => {
      setCut(measureCut(element, text));
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [expanded, text]);

  if (paragraphs.length === 0) return null;

  if (expanded) {
    return (
      <div className="mt-3 w-full text-muted-foreground">
        <div className="space-y-3">
          {paragraphs.map((paragraph, index) => (
            <p key={`${index}-${paragraph}`}>
              {paragraph}
              {index === paragraphs.length - 1 && (
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="ml-1.5 align-baseline font-semibold text-saffron"
                >
                  read less
                </button>
              )}
            </p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative mt-3 w-full text-muted-foreground">
      {/* `line-clamp` holds the block to four lines for the frame before the
          first measurement lands. Once `cut` is in, the copy is already short
          enough to fit and the clamp does nothing. */}
      <p className="line-clamp-4">
        {cut === null ? text : text.slice(0, cut)}
        {cut !== null && (
          <>
            {ELLIPSIS}
            {/* Set against the words it interrupts, not floated out to the
                right margin: the sentence stops here, so the way to the rest
                of it reads on from where it stopped. A button is phrasing
                content, so it sits on the line like any other word. */}
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="align-baseline font-semibold text-saffron"
            >
              {MORE_LABEL}
            </button>
          </>
        )}
      </p>

      <span
        ref={widthRef}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 block h-0"
      />

      {/* Off-screen twin, the same width and type as the copy above, used to
          try candidate lengths without any of them being painted. */}
      <p
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute inset-x-0 top-0"
      />
    </div>
  );
}

/**
 * The largest number of characters that still leaves the cut, the ellipsis
 * and "read more" inside four lines — or `null` when the whole thing already
 * fits and none of that is needed.
 */
function measureCut(element: HTMLElement, text: string) {
  const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
  if (!Number.isFinite(lineHeight) || lineHeight <= 0) return null;

  // A pixel of slack: line boxes rarely land on whole numbers.
  const maxHeight = lineHeight * COLLAPSED_LINES + 1;

  element.textContent = text;
  if (element.scrollHeight <= maxHeight) return null;

  const fits = (length: number) => {
    element.textContent = text.slice(0, length) + ELLIPSIS + MORE_LABEL;
    return element.scrollHeight <= maxHeight;
  };

  let low = 0;
  let high = text.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (fits(middle)) low = middle;
    else high = middle - 1;
  }

  // Back off to the last word break, so the copy stops on a whole word rather
  // than halfway through one.
  const lastSpace = text.lastIndexOf(" ", low);
  return lastSpace > 0 ? lastSpace : low;
}
