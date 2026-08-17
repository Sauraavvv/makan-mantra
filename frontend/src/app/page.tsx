import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { HeroSearch } from "@/components/site/hero-search";
import { StateExplorer } from "@/components/site/state-explorer";
import { HeroText } from "@/components/site/hero-text";
import { HomeActivityPanel } from "@/components/site/home-activity-panel";
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
        {/* 570px from `md`, with the content centred in it rather than sized by
            its own padding. Below that the height is left to the content: a
            phone would spend most of 570px on empty sky. */}
        <section className="relative flex overflow-hidden border-b border-border md:h-[570px]">
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
          <div className="mx-auto flex w-full max-w-[1250px] flex-1 flex-col gap-4 md:flex-row">
            <div className="flex-[3] rounded-[20px] border border-border bg-background" />
            <HomeActivityPanel className="flex-1" />
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
      {/*
       * The extra room from `lg` is for the form that floats over the banner: it
       * is a fixed-height card and the banner's height follows its width, so the
       * card hangs out of both ends — about 72px at `lg`, 74px at `xl`. Without
       * it the card touches the sections either side.
       */}
      <section className="bg-secondary px-4 py-4 md:py-5 lg:py-16 xl:py-20">
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

      <Footer />
    </div>
  );
}
