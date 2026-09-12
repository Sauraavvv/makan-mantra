"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PenLine, Star, ThumbsDown, ThumbsUp, X } from "lucide-react";

import { publishReviewPanel } from "@/lib/review-panel";

/** How long the dock spends sliding out past the edge, in ms. */
const SLIDE_MS = 200;

const MAX_STARS = 5;

const MAX_REVIEW_LENGTH = 1500;

const STEPS = ["Location & About You", "Rate Experience", "Write & Submit"];

/** How the reviewer knows the place. */
const RELATIONSHIPS = [
  { key: "prospective_buyer", label: "Prospective Buyer" },
  { key: "property_owner", label: "Property Owner" },
  { key: "tenant", label: "Tenant" },
  { key: "current_resident", label: "Current Resident" },
  { key: "former_resident", label: "Former Resident" },
  { key: "real_estate_agent", label: "Real Estate Agent" },
  { key: "frequent_visitor", label: "Frequent Visitor" },
];

const TENURES = [
  { key: "under_6_months", label: "< 6 months" },
  { key: "6_24_months", label: "6-24 months" },
  { key: "2_5_years", label: "2-5 years" },
  { key: "5_plus_years", label: "5+ years" },
];

/**
 * What a place is rated on.
 *
 * Six scores rather than one, because "how is it here" is six questions a
 * visitor answers differently: somewhere can be well connected and unsafe at
 * once, and an average of the two says neither.
 *
 * `key` is what the API stores; the label is this panel's business, so a
 * wording change never has to touch stored rows.
 */
const CATEGORIES = [
  { key: "connectivity", label: "Connectivity & Commute" },
  { key: "lifestyle", label: "Lifestyle & Daily Needs" },
  { key: "safety", label: "Safety & Security" },
  { key: "environment", label: "Environment & Cleanliness" },
  { key: "value", label: "Value for Money" },
  { key: "civic", label: "Civic Infrastructure & Maintenance" },
];

type Status = "idle" | "saving" | "saved" | "error";

/**
 * A standing way to say what living somewhere is actually like, docked to the
 * edge of an explore page.
 *
 * The page it sits on is written from data — prices, districts, connectivity
 * scored off a map. This is the part only someone who has been there can add,
 * and it is offered where they are reading rather than at the foot of a page
 * most people never reach.
 *
 * Three steps, because the three things being asked for are different in kind:
 * who is speaking, what they score it, and what they want to say. Put on one
 * page it reads as a form to escape rather than a question to answer.
 *
 * Folded to begin with. The reader came for the page, not for a form.
 */
export function LocationReviewDock({
  slug,
  placeName,
  state,
  district,
  side = "left",
  /**
   * The element the dock waits for. It stays away until this has scrolled off
   * the top of the screen — the banner is the page's own introduction, and a
   * panel over it would be interrupting the thing it is asking about.
   */
  revealAfterId = "explore-hero",
}: {
  /** The page being reviewed. One review per person per slug. */
  slug: string;
  placeName: string;
  state: string;
  district?: string;
  side?: "left" | "right";
  revealAfterId?: string;
}) {
  const onLeft = side === "left";

  // False until the banner is behind us. Starts false because the page opens
  // at the top, which is where the banner is.
  const [past, setPast] = useState(false);
  const [open, setOpen] = useState(false);
  const [tucked, setTucked] = useState(false);
  const timer = useRef<number | null>(null);
  const sliding = useRef(false);

  const [step, setStep] = useState(0);
  const [relationship, setRelationship] = useState("");
  const [tenure, setTenure] = useState("");
  const [displayAs, setDisplayAs] = useState("name");
  const [recommends, setRecommends] = useState<boolean | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [positive, setPositive] = useState("");
  const [negative, setNegative] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  // How wide the sidebar may be: up to where the header's search field starts,
  // measured rather than guessed — the room before it is the wordmark and the
  // Buy/Rent nav, and both are content-sized.
  const [width, setWidth] = useState<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    const hero = document.getElementById(revealAfterId);
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // `top < 0` as well as "not intersecting": without it the dock would
        // also appear while the banner is still below the fold, on its way up.
        setPast(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, [revealAfterId]);

  // The section nav steps aside for the sidebar. Announced from here rather
  // than watched from there: this is the only place that knows, and the nav
  // has no way to see a sibling under a server component.
  useEffect(() => {
    publishReviewPanel(open && past);
  }, [open, past]);

  useEffect(() => {
    if (!open) return;

    const measure = () => {
      const field = document.getElementById("header-search-row");
      // Collapsed to nothing, it has no left edge worth having — the sidebar
      // keeps its own width until the bar is really there.
      if (!field) return;

      const box = field.getBoundingClientRect();
      if (box.width > 0) setWidth(box.left);
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open]);

  const swapTo = useCallback((next: boolean) => {
    if (sliding.current) return;

    // Someone who has asked for less motion gets the change and none of the
    // travel: sliding it out only to slide it back is the whole of what they
    // turned off.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setOpen(next);
      return;
    }

    sliding.current = true;
    setTucked(true);
    timer.current = window.setTimeout(() => {
      setOpen(next);
      // Two frames, not one: the first lets React paint the new contents while
      // they are still parked off-edge, so the second has a transform to
      // animate away from. Released in the same frame as the paint, the
      // browser would see no change to transition and the sidebar would appear
      // in place instead of sliding.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setTucked(false);
          sliding.current = false;
        }),
      );
    }, SLIDE_MS);
  }, []);

  const scored = Object.keys(ratings).length;
  const wrote = positive.trim().length > 0 || negative.trim().length > 0;
  const canSubmit = status !== "saving" && confirmed && (scored > 0 || wrote);

  async function submit() {
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch("/api/location-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          state,
          district,
          relationship,
          tenure,
          display_as: displayAs,
          recommends,
          ratings,
          positive,
          negative,
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setStatus("error");
        setMessage(data.error ?? "Could not save your review.");
        return;
      }

      setStatus("saved");
      setMessage("Thanks — your review is saved.");
    } catch {
      setStatus("error");
      setMessage("Could not save your review. Please try again.");
    }
  }

  return (
    <>
      {/* Everything behind the form, pushed back.

          A sibling of the dock rather than a child of it: the dock carries a
          transform to slide in and out, and a transformed element becomes the
          containing block for anything `fixed` inside it — `inset-0` there
          would have covered the dock's own box, not the screen.

          `z-34` puts it under the sidebar and over the page, but below the
          header at `z-40`, which stays sharp and usable: the reader can still
          leave, search, or change state while the form is open. */}
      {open && (
        <div
          onClick={() => swapTo(false)}
          aria-hidden
          /* The same veil the header's filter panel drops — one treatment
             for "something is open over the page", not two.

             Fades with the dock, not just with `open`. Scrolling back up to
             the banner takes the sidebar away — it is the same `past` that
             reveals it — but `open` stays true so it comes back on the way
             down. Left on `open` alone the blur stayed behind over a form
             that was no longer on screen. */
          className={`fixed inset-0 z-[34] hidden bg-[#061727]/55 backdrop-blur-[1px] transition-opacity duration-300 ease-out sm:block ${
            past ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />
      )}

      {/* Hidden on phones. The chat launcher already holds the bottom-right
       corner there, and a sidebar this size has nowhere to open on a 360px
       screen.

       `top-16` rather than `top-0`: the header stays where it is and the
       sidebar hangs beneath it, so the reader can still leave, search, or
       change state while the form is open.

       `z-35` sits it in the one gap that works: over the explore page's
       section nav, which is `sticky top-16 z-30` and, at the same z-index,
       won on document order alone and cut straight through this panel — and
       under the header (`z-40`) and the chat launcher (`z-50`). */}
      <div
        aria-hidden={!past}
        /* Centred on the strip below the header, not on the whole screen.

         The header is 4rem tall and sits over the top of the viewport, so
         `top-1/2` left twice as much air under the panel as over it —
         `50vh + 2rem` is the middle of what is actually visible, and with the
         cap below it the gap above and the gap below come out the same.

         Kept mounted and moved rather than switched on and off. Returning
         `null` until the banner had gone by meant the dock arrived in place
         with no travel at all — it was simply there on one frame and not the
         one before. Off-edge and transparent it can slide in from the side it
         lives on, and out again the same way.

         `pointer-events-none` while it is away: transparent is not gone, and
         an invisible tab is not something to click. */
        className={`fixed z-[35] hidden transition-all duration-300 ease-out sm:block ${
          past
            ? "translate-x-0 opacity-100"
            : `pointer-events-none opacity-0 ${
                onLeft ? "-translate-x-full" : "translate-x-full"
              }`
        } ${onLeft ? "left-0" : "right-0"} top-[calc(50vh+2rem)] -translate-y-1/2`}
      >
        {/* The travelling layer. The full-width shift is measured against this
          element's own width, so the tab and the sidebar each clear the edge
          exactly — including the shadow, which would otherwise smear along the
          edge as a giveaway that it is still there. It leaves by the edge it
          is docked to. */}
        <div
          className={`transition-transform duration-200 ease-out ${
            tucked
              ? onLeft
                ? "-translate-x-full"
                : "translate-x-full"
              : "translate-x-0"
          }`}
        >
          {open ? (
            <aside
              aria-label={`Write a review of ${placeName}`}
              /* The measured edge is a ceiling, not the whole rule: never
                 wider than where the search field starts, and never so narrow
                 that the form stops working. */
              style={{
                width: width ? Math.max(320, Math.min(width, 448)) : undefined,
              }}
              /* Sized to what is in it, capped so it cannot outgrow the
                 screen. Floor to ceiling it was three short sections and a
                 field of nothing under them; cut top and bottom it reads as a
                 panel rather than a wall, and the rounded corner on the free
                 side says the same. `100vh - 8rem` leaves the header's own
                 height clear above and as much again below. */
              className={`flex max-h-[calc(100vh-8rem)] w-[23rem] flex-col overflow-hidden border-y border-border bg-white shadow-2xl ${
                onLeft ? "rounded-r-2xl border-r" : "rounded-l-2xl border-l"
              }`}
            >
              <header className="shrink-0 border-b border-border px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                      Write a review
                    </p>
                    <p className="truncate text-lg font-bold leading-tight text-foreground">
                      {placeName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => swapTo(false)}
                    aria-label="Close"
                    className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary"
                  >
                    <X className="size-4" strokeWidth={2.5} />
                  </button>
                </div>

                <StepBar step={step} />
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                <p className="text-[11px] font-bold text-muted-foreground">
                  Step {step + 1} of {STEPS.length}
                </p>

                {step === 0 && (
                  <div className="mt-3 space-y-5">
                    {/* The place is not asked for. The reader is standing on its
                      page, so a box to name it again is a question already
                      answered. */}
                    <Field label="Tell us how you're connected to this place">
                      <ChoiceRow
                        options={RELATIONSHIPS}
                        value={relationship}
                        onPick={setRelationship}
                      />
                    </Field>

                    <Field label="How long have you lived here?">
                      <ChoiceRow
                        options={TENURES}
                        value={tenure}
                        onPick={setTenure}
                      />
                    </Field>

                    <Field
                      label="How should we display your review?"
                      hint="Choose how your name appears to others when your review is published."
                    >
                      {/* Side by side: two ways of being credited, read
                          against each other rather than one after the other. */}
                      <div className="grid grid-cols-2 gap-2">
                        <DisplayChoice
                          selected={displayAs === "name"}
                          title="First name + initial"
                          detail='e.g., "Shivam A."'
                          onPick={() => setDisplayAs("name")}
                        />
                        <DisplayChoice
                          selected={displayAs === "anonymous"}
                          title="Anonymous"
                          detail="Your identity stays hidden"
                          onPick={() => setDisplayAs("anonymous")}
                        />
                      </div>
                    </Field>
                  </div>
                )}

                {step === 1 && (
                  <div className="mt-3 space-y-5">
                    <Field
                      label={`Would you recommend ${placeName} to others?`}
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <Verdict
                          selected={recommends === true}
                          onPick={() =>
                            setRecommends(recommends === true ? null : true)
                          }
                          icon={<ThumbsUp className="size-4" strokeWidth={2} />}
                          label="Yes"
                        />
                        <Verdict
                          selected={recommends === false}
                          onPick={() =>
                            setRecommends(recommends === false ? null : false)
                          }
                          icon={
                            <ThumbsDown className="size-4" strokeWidth={2} />
                          }
                          label="No"
                        />
                      </div>
                    </Field>

                    <Field label="Rate your experience">
                      <div className="overflow-hidden rounded-xl border border-border">
                        {CATEGORIES.map((category, index) => (
                          <div
                            key={category.key}
                            className={`flex items-center justify-between gap-3 px-3 py-2.5 ${
                              index > 0 ? "border-t border-border" : ""
                            }`}
                          >
                            <span className="min-w-0 text-xs font-medium text-foreground/80">
                              {category.label}
                            </span>
                            <StarRow
                              value={ratings[category.key] ?? 0}
                              label={category.label}
                              onPick={(stars) =>
                                setRatings((current) => {
                                  // Picking the star already set clears the
                                  // category, so a score given by mistake can be
                                  // taken back without starting over.
                                  if (current[category.key] === stars) {
                                    const next = { ...current };
                                    delete next[category.key];
                                    return next;
                                  }

                                  return { ...current, [category.key]: stars };
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </Field>
                  </div>
                )}

                {step === 2 && (
                  <div className="mt-3 space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Share details that help others make decisions.
                    </p>

                    {/* Asked in two halves. One box gets one side of a place —
                      whichever the writer felt more strongly — and the side
                      left out is the one a reader most wants. */}
                    <ReviewBox
                      label="What is good about living here?"
                      value={positive}
                      onChange={setPositive}
                      placeholder="Write your positive review here…"
                    />
                    <ReviewBox
                      label="What is not?"
                      value={negative}
                      onChange={setNegative}
                      placeholder="Write your negative review here…"
                    />

                    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-secondary/40 p-3">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(event) => setConfirmed(event.target.checked)}
                        className="mt-0.5 size-4 shrink-0 accent-saffron"
                      />
                      <span className="text-xs text-foreground/80">
                        I confirm this is my genuine experience of {placeName}.
                      </span>
                    </label>

                    {message && (
                      <p
                        className={`text-xs font-medium ${
                          status === "error"
                            ? "text-destructive"
                            : "text-saffron"
                        }`}
                      >
                        {message}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <footer className="flex shrink-0 items-center gap-3 border-t border-border px-5 py-3.5">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep((current) => current - 1)}
                    className="h-10 flex-1 rounded-lg border border-border text-xs font-bold text-foreground transition-colors hover:bg-secondary"
                  >
                    Back
                  </button>
                )}

                {step < STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((current) => current + 1)}
                    className="h-10 flex-1 rounded-lg bg-[#0A2036] text-xs font-bold text-white transition-colors hover:bg-[#12345d]"
                  >
                    {step === 0 ? "Rate this locality" : "Write your review"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={!canSubmit}
                    className="h-10 flex-1 rounded-lg bg-saffron text-xs font-bold text-saffron-foreground transition-colors hover:bg-saffron/90 disabled:pointer-events-none disabled:opacity-40"
                  >
                    {status === "saving" ? "Submitting…" : "Submit review"}
                  </button>
                )}
              </footer>
            </aside>
          ) : (
            <button
              type="button"
              onClick={() => swapTo(true)}
              aria-label={`Write a review of ${placeName}`}
              /* Near enough a square, and narrower than tall: the two short
                 words set the width, and past that it is only taking room off
                 the page it sits on.

                 Not a strip of turned-up text. The words used to be
                 set down the edge to fit, which is a line a reader has to tilt
                 their head to take in; square, they sit the way words sit.
                 Only the free side is rounded, so it still reads as something
                 pulled out of the edge. */
              className={`flex h-20 w-[3.75rem] shrink-0 flex-col items-center justify-center gap-1.5 border border-border bg-white px-1 shadow-lg transition-colors hover:bg-secondary ${
                onLeft ? "rounded-r-2xl border-l-0" : "rounded-l-2xl border-r-0"
              }`}
            >
              <PenLine
                className="size-5 shrink-0 text-foreground"
                strokeWidth={2.2}
              />
              <span className="text-[10px] font-bold leading-tight text-foreground">
                Write
                <br />
                review
              </span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/** Where the reader is in the three, and how much is behind them. */
function StepBar({ step }: { step: number }) {
  return (
    <div className="mt-4 flex items-center">
      {STEPS.map((label, index) => (
        <div
          key={label}
          className={`flex items-center ${index > 0 ? "min-w-0 flex-1" : ""}`}
        >
          {index > 0 && (
            <span
              className={`mx-1.5 h-px flex-1 ${
                index <= step ? "bg-[#0A2036]" : "bg-border"
              }`}
            />
          )}
          <span
            title={label}
            className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
              index < step
                ? "bg-saffron text-saffron-foreground"
                : index === step
                  ? "bg-[#0A2036] text-white"
                  : "bg-secondary text-muted-foreground"
            }`}
          >
            {index + 1}
          </span>
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[13px] font-bold text-foreground">{label}</p>
      {hint && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      )}
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

/** A row of single-choice pills. Picking the one already on clears it. */
function ChoiceRow({
  options,
  value,
  onPick,
}: {
  options: { key: string; label: string }[];
  value: string;
  onPick: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const selected = option.key === value;

        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={selected}
            onClick={() => onPick(selected ? "" : option.key)}
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
              selected
                ? "border-[#0A2036] bg-[#0A2036] text-white"
                : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function DisplayChoice({
  selected,
  title,
  detail,
  onPick,
}: {
  selected: boolean;
  title: string;
  detail: string;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      className={`flex w-full flex-col gap-1.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
        selected
          ? "border-saffron bg-saffron/10"
          : "border-border hover:bg-secondary"
      }`}
    >
      {/* The mark goes above the words rather than beside them: in half the
          sidebar's width there is no room for a column of text and a dot on
          the same line. */}
      <span
        className={`size-3.5 shrink-0 rounded-full border-[5px] ${
          selected ? "border-saffron" : "border-border"
        }`}
      />
      <span className="min-w-0">
        <span className="block text-xs font-bold leading-tight text-foreground">
          {title}
        </span>
        <span className="block text-[11px] leading-tight text-muted-foreground">
          {detail}
        </span>
      </span>
    </button>
  );
}

function Verdict({
  selected,
  onPick,
  icon,
  label,
}: {
  selected: boolean;
  onPick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      className={`flex h-10 items-center justify-center gap-2 rounded-lg border text-xs font-bold transition-colors ${
        selected
          ? "border-[#0A2036] bg-[#0A2036] text-white"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ReviewBox({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <p className="text-[13px] font-bold text-foreground">{label}</p>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={MAX_REVIEW_LENGTH}
        rows={4}
        placeholder={placeholder}
        className="mt-2 w-full resize-none rounded-xl border border-border bg-secondary/40 p-3 text-xs text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-saffron"
      />
      <p className="mt-1 text-right text-[10px] text-muted-foreground">
        {value.length}/{MAX_REVIEW_LENGTH}
      </p>
    </div>
  );
}

/** Five stars, filled up to `value`. */
function StarRow({
  value,
  label,
  onPick,
}: {
  value: number;
  label: string;
  onPick: (stars: number) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {Array.from({ length: MAX_STARS }, (_, index) => {
        const stars = index + 1;
        const filled = stars <= value;

        return (
          <button
            key={stars}
            type="button"
            onClick={() => onPick(stars)}
            aria-label={`${stars} of ${MAX_STARS} for ${label}`}
            aria-pressed={filled}
            className="p-0.5"
          >
            <Star
              className={`size-[15px] ${
                filled
                  ? "fill-saffron text-saffron"
                  : "fill-transparent text-border"
              }`}
              strokeWidth={2}
            />
          </button>
        );
      })}
    </div>
  );
}
