import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";
import { Header } from "@/components/site/header";

type ErrorImage = {
  src: string;
  width: number;
  height: number;
};

export function ErrorPageView({
  numeral,
  illustration,
  highlight,
  title,
  description,
  note,
  footnote,
}: {
  /** The big "404"/"410" artwork — the digits carry an illustrated scene, so it stays an image. */
  numeral: ErrorImage;
  illustration: ErrorImage;
  /** Leading word of the headline, set in saffron. */
  highlight: string;
  title: string;
  description: string;
  /** Optional callout between the description and the actions. */
  note?: { icon: LucideIcon; text: string };
  footnote: { icon: LucideIcon; children: ReactNode };
}) {
  const NoteIcon = note?.icon;
  const FootnoteIcon = footnote.icon;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="mx-auto grid w-full max-w-[1250px] flex-1 items-center gap-8 px-4 py-10 lg:grid-cols-2 lg:gap-10 lg:py-16">
        <div className="order-2 lg:order-1">
          <Image
            src={numeral.src}
            alt={`${highlight} ${title}`}
            width={numeral.width}
            height={numeral.height}
            priority
            className="h-auto w-full max-w-[280px] sm:max-w-[360px]"
          />

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            <span className="text-saffron">{highlight}</span> {title}
          </h1>

          <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
            {description}
          </p>

          {note && NoteIcon && (
            <div className="mt-5 flex max-w-md items-start gap-3 rounded-xl bg-secondary px-4 py-3">
              <NoteIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="text-sm leading-relaxed text-muted-foreground">{note.text}</p>
            </div>
          )}

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Home className="size-4" />
              Go to Homepage
              <ArrowRight className="size-4 text-saffron" />
            </Link>

            <Link
              href="/#quick-links"
              className="flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-secondary"
            >
              Explore Listings
              <ArrowRight className="size-4 text-saffron" />
            </Link>
          </div>

          <p className="mt-7 flex items-center gap-2 text-sm text-muted-foreground">
            <FootnoteIcon className="size-4 shrink-0 text-primary" />
            {footnote.children}
          </p>
        </div>

        <div className="order-1 lg:order-2">
          <Image
            src={illustration.src}
            alt=""
            width={illustration.width}
            height={illustration.height}
            priority
            aria-hidden
            className="mx-auto h-auto w-full max-w-[420px] lg:max-w-none"
          />
        </div>
      </main>
    </div>
  );
}
