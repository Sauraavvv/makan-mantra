import { Plus } from "lucide-react";
import { FaqContactCard } from "@/components/site/faq-contact-card";
import { cn } from "@/lib/utils";

export type FaqEntry = { question: string; answer: string };

/**
 * Split-layout FAQ: label, heading and a "contact us" card on the left; one
 * bordered card per question on the right.
 *
 * Built on native `<details>` so every answer is in the server HTML (search
 * engines and no-JS visitors see them) and no client JS is needed to toggle.
 * Every item starts closed. All items share one `name`, which makes the
 * browser keep a single item open at a time. The open/close height
 * animation lives in globals.css (`.faq-item`).
 */
export function FaqSection({
  items,
  id = "faq",
  className,
}: {
  items: FaqEntry[];
  id?: string;
  /** Overrides the outer section's padding for pages with their own rhythm. */
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <section id={id} className={cn("scroll-mt-32 bg-secondary px-4 py-4 md:py-5", className)}>
      {/* Same bordered card every other home/state section sits in. */}
      <div className="mx-auto grid max-w-[1250px] gap-6 rounded-[20px] border border-border bg-background px-5 py-5 md:px-6 md:py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-10">
        {/* On desktop the column is size-contained, so it never makes the row
            taller: the questions on the right set the height, and the contact
            card's form opens into the space under the heading instead of
            pushing the section down. min-h guarantees that space exists even
            when there are only a few questions. */}
        <div className="flex flex-col items-start lg:min-h-[19rem] lg:[contain:size]">
          <p className="inline-flex items-center gap-1.5 rounded-md border border-saffron/20 bg-saffron/10 px-2.5 py-1 text-xs font-medium text-foreground">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-saffron" />
            Frequently Asked Questions
          </p>

          <h2 className="mt-3 text-2xl font-bold leading-tight text-foreground md:text-3xl lg:mb-8">
            Answers to Your Questions
          </h2>

          {/* `lg:mt-auto` pins the card to the bottom of the (grid-stretched)
              column, so its bottom edge lines up with the last question's.
              Open, the card grows upward to fill the column. */}
          <FaqContactCard className="mt-5 lg:mt-auto" />
        </div>

        <div className="flex flex-col gap-2.5">
          {items.map((item) => (
            <details
              key={item.question}
              name={id}
              className="faq-item group rounded-xl border border-border bg-background px-4 transition-colors open:border-saffron/30 md:px-5"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 text-left [&::-webkit-details-marker]:hidden">
                <span className="text-sm font-medium text-foreground">
                  {item.question}
                </span>
                <span
                  aria-hidden="true"
                  className="grid size-7 shrink-0 place-items-center rounded-md border border-border text-foreground transition-colors group-hover:border-saffron/40 group-open:border-saffron/40 group-open:text-saffron"
                >
                  <Plus
                    className="size-4 transition-transform duration-300 group-open:rotate-45"
                    strokeWidth={1.6}
                  />
                </span>
              </summary>
              <p className="max-w-3xl pr-2 pb-4 text-sm leading-relaxed text-muted-foreground md:pr-11">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
