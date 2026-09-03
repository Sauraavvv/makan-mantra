import Link from "next/link";

import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { HeroSearch } from "@/components/site/hero-search";
import { StateExplorer } from "@/components/site/state-explorer";
import { HeroText } from "@/components/site/hero-text";
import { HomeActivityPanel } from "@/components/site/home-activity-panel";
import { HomeRecommendations } from "@/components/site/home-recommendations";
import { PostPropertyBanner } from "@/components/site/post-property-banner";
import { QuickLinks, type QuickLinkGroup } from "@/components/site/quick-links";
import { MarketSnapshot } from "@/components/site/market-snapshot";
import { TopBuildersShowcase } from "@/components/site/top-builders-showcase";
import { DEFAULT_SNAPSHOT_SLUG, fetchMarketSnapshot } from "@/lib/market-snapshot";
import { BUILDERS_BY_STATE_SLUG } from "@/lib/builders-directory";
import { cldUrl } from "@/lib/cloudinary-url";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * The hero photograph, served straight from Cloudinary rather than through the
 * Next optimizer.
 *
 * It is the page's largest element and the one the visitor is waiting on, so it
 * is asked for at full quality — `q_auto:best` is the setting that keeps a dusk
 * sky free of banding, which `q_auto` does not. The widths below are the
 * original's own steps down to a laptop's; `c_limit` never enlarges, so a screen
 * wider than the source simply gets the source.
 *
 * Optimizing it twice would be the alternative — Cloudinary encodes it, then
 * Next re-encodes what Cloudinary sent — and re-encoding a photograph is where
 * its quality goes.
 */
/**
 * Platform-level questions, kept to what the site actually does — the property
 * types the search covers, what posting costs, and what an account adds. The
 * three-step detail matches the wizard on `/post-property`.
 */
const FAQS = [
  {
    question: "What is Makan Mantraa?",
    answer:
      "Makan Mantraa is an Indian property platform. You can buy or rent flats, villas, plots, builder floors, office spaces, showrooms and PGs across every state, city and locality in India — and list your own property on it for free.",
  },
  {
    question: "Is Makan Mantraa free to use?",
    answer:
      "Yes. Searching, shortlisting and viewing properties are free, and so is posting a property — there is no listing charge, no commission and no hidden fee.",
  },
  {
    question: "How do I find properties in my city?",
    answer:
      "Use the search at the top of this page: choose Buy or Rent, then search by state, city or locality. You can also browse state by state, or open the market snapshot and top builders for your state to see what is moving there.",
  },
  {
    question: "How do I list my property for sale or rent?",
    answer:
      "Open Post Property and fill in three short steps — property details, your contact details, and photos or a video. Our team then reviews what you sent, calls you to fill in anything missing, and publishes the live listing for you.",
  },
  {
    question: "Do I need an account to search?",
    answer:
      "No. You can search, shortlist and view properties as a guest — that activity stays on your device and moves into your account the moment you sign in. An account also lets you track your own listings and their enquiries from your dashboard.",
  },
];

const HERO_IMAGE = "site/hero-home";
const HERO_WIDTHS = [1280, 1920, 2560, 3548];

const heroSrcSet = HERO_WIDTHS.map(
  (width) => `${cldUrl(HERO_IMAGE, `f_auto,q_auto:best,w_${width},c_limit`)} ${width}w`,
).join(", ");

/** State-level pages only — the district and city blocks live on state pages. */
async function getStateQuickLinks(): Promise<QuickLinkGroup[]> {
  try {
    const res = await fetch(`${API}/location-pages/quick-links-states`, {
      // The set rotates once a day, so an hour of caching is plenty.
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];
    const data = (await res.json()) as { groups?: QuickLinkGroup[] };
    return data.groups ?? [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const [quickLinkGroups, defaultSnapshot] = await Promise.all([
    getStateQuickLinks(),
    fetchMarketSnapshot(DEFAULT_SNAPSHOT_SLUG),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      <Header />

      {/* The hero and the section under it share the first screen: the hero takes
          the height it needs, and the section below fills whatever is left of the
          viewport. A minimum, not a fixed height: on a short window the pair is
          allowed to run past the fold rather than squeezing the section's
          contents into what is left. 4rem is the header's own height, which sits
          above this box.

          The 52rem ceiling is for tall screens — a monitor stood on its end has
          close to 1900px of viewport, and without it the two of them would
          stretch to fill all of it, leaving the cards below acres of nothing.

          `svh` rather than `dvh` on purpose — with `dvh` the section would grow
          and shrink as a mobile browser's address bar hides, which reads as the
          page shifting under the reader. The header is deliberately outside this
          box: it is `sticky`, and an element only sticks within its own parent,
          so wrapping it here would unstick it after the first screen. */}
      <div className="flex min-h-[min(calc(100svh-4rem),52rem)] flex-col">
        {/* Hero */}
        {/* 540px from `md`, with the content centred in it rather than sized by
            its own padding. Below that the height is left to the content: a
            phone would spend most of 540px on empty sky. */}
        <section className="relative flex overflow-hidden md:h-[590px]">
          {/* Preloaded by hand: this is the LCP element, and a plain `img` gets
              none of the preload `next/image` would have added for it. React
              hoists the tag into the head. */}
          <link
            rel="preload"
            as="image"
            imageSrcSet={heroSrcSet}
            imageSizes="100vw"
            fetchPriority="high"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cldUrl(HERO_IMAGE, "f_auto,q_auto:best,w_1920,c_limit")}
            srcSet={heroSrcSet}
            sizes="100vw"
            alt="A city skyline at dusk, seen from the terrace of a high-rise home"
            fetchPriority="high"
            decoding="async"
            /* Held to its top edge: the frame is wider than the photograph's
               2:1, so the crop comes off the bottom — the terrace — and the
               skyline it was chosen for stays in view. */
            className="absolute inset-0 size-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-black/35" />

          <div className="relative mx-auto flex w-full max-w-7xl items-center px-4 py-16 md:py-0">
            <div className="w-full text-left">
              <HeroText align="left" />
              <HeroSearch align="left" alignTabsWithHeading animateIn />
            </div>
          </div>
        </section>

        {/* Placeholder — holds the rest of the first screen until we fill it,
            in the same card the sections below it use: gutter, rounded box,
            centred on the same max width.

            `flex-1` with no height of its own, so it takes the rest of the first
            screen where there is room and its own content's height where there
            is not. */}
        <section className="flex flex-1 flex-col bg-secondary px-4 py-4 md:py-5">
          {/* 75 / 25 by flex ratio rather than widths, so the gap between the two
              comes out of the row instead of pushing the pair past 100%. They
              stack below `md`, where a quarter of a phone is too narrow to hold
              anything. */}
          <div className="mx-auto flex w-full max-w-[1250px] flex-1 flex-col gap-4 md:flex-row md:items-stretch">
            <HomeRecommendations className="flex-[3]" />
            <div className="flex w-full flex-col gap-4 md:flex-1">
              <HomeActivityPanel />
              <div className="hidden min-h-0 flex-1 rounded-[20px] border border-border bg-background p-4 md:block">
                <h2 className="text-base font-bold text-[#0A2036]">Plan Your Budget with us</h2>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link
                    href="/tools/emi-calculator"
                    className="flex min-h-16 items-center justify-center rounded-xl border border-[#D9E4F2] bg-[#F5F8FD] p-2 text-center text-[#0A2036] transition-colors hover:border-primary/40 hover:bg-[#EDF4FF]"
                  >
                    <span className="text-[11px] font-semibold leading-4">EMI Calculator</span>
                  </Link>
                  <Link
                    href="/tools/stamp-duty-calculator"
                    className="flex min-h-16 items-center justify-center rounded-xl border border-[#D9E4F2] bg-[#F5F8FD] p-2 text-center text-[#0A2036] transition-colors hover:border-primary/40 hover:bg-[#EDF4FF]"
                  >
                    <span className="text-[11px] font-semibold leading-4">
                      Stamp Duty Calculator
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Market snapshot for the visitor's state */}
      <MarketSnapshot initial={defaultSnapshot} />

      {/* Top builders for the visitor's state — hides itself when we have none */}
      <TopBuildersShowcase buildersByState={BUILDERS_BY_STATE_SLUG} />

      {/* Browse by state */}
      <section className="bg-secondary px-4 py-4 md:py-5">
        <div className="mx-auto max-w-[1250px] rounded-[20px] border border-border bg-background px-5 py-5">
          <div className="mb-6">
            <h2 className="text-2xl font-bold md:text-3xl">Explore Other States</h2>
            <p className="mt-1 text-muted-foreground">
              Start with India&apos;s busiest real estate markets, then browse every state.
            </p>
          </div>

          <StateExplorer />
        </div>
      </section>

      {/* Post your property banner */}
      {/* The form sits inside the artwork now, so this takes the same rhythm as
          the sections either side rather than extra room for an overhang. */}
      <section className="bg-secondary px-4 py-4 md:py-5">
        <div className="mx-auto max-w-[1250px] rounded-[20px] border border-border bg-background p-2 md:p-3">
          <PostPropertyBanner />
        </div>
      </section>

      {quickLinkGroups.length > 0 && (
        <section id="quick-links" className="scroll-mt-32 bg-secondary px-4 py-4 md:py-5">
          <div className="mx-auto max-w-[1250px] rounded-[20px] border border-border bg-background px-5 py-6">
            <QuickLinks groups={quickLinkGroups} displayName="India" />
          </div>
        </section>
      )}

      {/* FAQ */}
      <section id="faq" className="scroll-mt-32 bg-secondary px-4 py-4 md:py-5">
        <div className="mx-auto max-w-[1250px] rounded-[20px] border border-border bg-background px-5 py-5">
          <h2 className="mb-5 text-3xl font-bold leading-tight md:text-4xl">
            Frequently Asked Questions
          </h2>
          <div className="divide-y divide-border rounded-xl border border-border bg-card/70 px-4 md:px-5">
            {FAQS.map((item) => (
              <details key={item.question} className="group py-3">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-left">
                  <span className="text-sm font-medium text-foreground">{item.question}</span>
                  <span className="mt-0.5 shrink-0 text-primary transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-2 max-w-5xl text-sm leading-relaxed text-muted-foreground">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
