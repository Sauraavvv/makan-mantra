"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import {
  submitContactQuestionAction,
  type ContactQuestionState,
} from "@/app/actions/contact-question";
import { cn } from "@/lib/utils";

const FIELD =
  "w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-saffron/60";

/** How long the "thanks" line replaces the intro copy after a send. */
const THANKS_MS = 3000;

/**
 * The FAQ section's "Contact Us" card. Clicking the button turns the card into
 * an email + question form; submissions land in the admin panel
 * (/admin/questions). After a successful send the card goes back to its
 * closed "Contact Us" state, with a thank-you line standing in for the intro
 * copy for a few seconds.
 *
 * On desktop the open card grows upward to fill its (size-contained) column,
 * so opening it never changes the section's height — see FaqSection. The
 * textarea takes whatever room is left.
 */
export function FaqContactCard({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    if (!thanks) return;
    const timer = setTimeout(() => setThanks(false), THANKS_MS);
    return () => clearTimeout(timer);
  }, [thanks]);

  return (
    <div
      className={cn(
        "flex w-full flex-col rounded-2xl border border-border bg-foreground/[0.04] p-4 md:p-5",
        className,
        // Open: fill the column and tuck closer under the heading (eats into
        // its bottom margin); tighter padding leaves the textarea more room.
        open && "lg:-mt-5 lg:min-h-0 lg:flex-1 lg:p-4",
      )}
    >
      {open ? (
        <ContactForm
          onClose={() => setOpen(false)}
          onSent={() => {
            setOpen(false);
            setThanks(true);
          }}
        />
      ) : (
        <>
          {thanks ? (
            <p
              className="flex max-w-xs items-start gap-2 text-sm leading-relaxed text-foreground"
              role="status"
            >
              <CheckCircle2 className="mt-1 size-4 shrink-0 text-saffron" />
              Thanks! We&apos;ve received your question and will reply by email soon.
            </p>
          ) : (
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Have more questions for us? Our team can help you out. Get in touch with us!
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setThanks(false);
              setOpen(true);
            }}
            aria-expanded={false}
            className="mt-3 self-start rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-saffron shadow-sm transition-colors hover:border-saffron/40"
          >
            Contact Us
          </button>
        </>
      )}
    </div>
  );
}

/**
 * Mounted fresh each time the card opens, so a reopened form starts empty with
 * no leftover error from the last attempt.
 */
function ContactForm({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [state, formAction, pending] = useActionState(
    async (prev: ContactQuestionState, formData: FormData) => {
      const result = await submitContactQuestionAction(prev, formData);
      if (result?.done) onSent();
      return result;
    },
    undefined,
  );
  const pathname = usePathname();
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  return (
    <form action={formAction} className="flex flex-1 flex-col gap-2">
      <input type="hidden" name="page" value={pathname} />
      {/* Honeypot — kept off-screen and out of the tab order. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] size-px opacity-0"
      />

      <input
        ref={emailRef}
        name="email"
        type="email"
        required
        autoComplete="email"
        aria-label="Your email address"
        placeholder="Your email address"
        className={cn(FIELD, "h-10 shrink-0")}
      />
      <textarea
        name="question"
        required
        minLength={10}
        maxLength={2000}
        aria-label="Your question"
        placeholder="Type your question…"
        className={cn(FIELD, "min-h-24 flex-1 resize-none py-2.5 lg:min-h-12")}
      />

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg bg-saffron px-4 py-2 text-sm font-semibold text-saffron-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send Question"}
        </button>
        {/* Errors sit beside the button rather than above the fields, so
            they never add height to the card. */}
        <p
          className="line-clamp-2 min-w-0 flex-1 text-xs font-medium leading-snug text-destructive"
          role="alert"
        >
          {state?.error}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </form>
  );
}
