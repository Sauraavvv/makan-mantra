import Image from "next/image";
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

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

function uniqueTextItems(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const items: string[] = [];

  for (const item of value) {
    const text = typeof item === "string" ? item.trim() : "";
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;

    items.push(text);
    seen.add(key);
    if (items.length === limit) break;
  }

  return items;
}

async function getMadhyaPradeshHeroCities() {
  try {
    const res = await fetch(`${API}/state-overview/madhya-pradesh`, {
      next: { revalidate: 86400 },
    });

    if (!res.ok) return [];
    const data = (await res.json()) as { overview?: { major_cities?: unknown } };
    return uniqueTextItems(data.overview?.major_cities, 3);
  } catch {
    return [];
  }
}

export default async function Home() {
  // Delhi renders on the server so the section is never blank; the client swaps
  // it for the visitor's state once geolocation or the header picker resolves one.
  const [quickLinkGroups, defaultSnapshot, madhyaPradeshHeroCities] = await Promise.all([
    getStateQuickLinks(),
    fetchMarketSnapshot(DEFAULT_SNAPSHOT_SLUG),
    getMadhyaPradeshHeroCities(),
  ]);
  const initialCityOverrides =
    madhyaPradeshHeroCities.length > 0
      ? { "Madhya Pradesh": madhyaPradeshHeroCities }
      : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      <Header />

      {/* The hero and the section under it share the first screen: the hero takes
          the height it needs, and the section below fills whatever is left of the
          viewport. A fixed height, not a minimum: the point is that the section
          below is on screen without scrolling, and a minimum would let the hero
          push it under the fold. 4rem is the header's own height, which sits
          above this box.

          `svh` rather than `dvh` on purpose — with `dvh` the section would grow
          and shrink as a mobile browser's address bar hides, which reads as the
          page shifting under the reader. The header is deliberately outside this
          box: it is `sticky`, and an element only sticks within its own parent,
          so wrapping it here would unstick it after the first screen. */}
      <div className="flex h-[calc(100svh-4rem)] flex-col">
        {/* Hero */}
        <section className="relative min-h-0 shrink overflow-hidden border-b border-border">
          <Image
            src="/hero-home.jpg"
            alt="Modern residential buildings in India"
            fill
            priority
            quality={100}
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/15 to-black/45" />

          <div className="relative mx-auto max-w-7xl px-4 py-16 md:py-24">
            <div className="mx-auto w-full text-center">
              <HeroText initialCityOverrides={initialCityOverrides} />
              <HeroSearch animateIn />
            </div>
          </div>
        </section>

        {/* Placeholder — holds the rest of the first screen until we fill it,
            in the same card the sections below it use: gutter, rounded box,
            centred on the same max width.

            `flex-1` with no height of its own, and `min-h-0` down every level
            below it: a flex item defaults to refusing to shrink under its own
            content, so without it whatever ends up in these cards would push
            the first screen past the viewport instead of fitting inside it. */}
        <section className="flex min-h-0 flex-1 flex-col bg-secondary px-4 py-4 md:py-5">
          {/* 75 / 25 by flex ratio rather than widths, so the gap between the two
              comes out of the row instead of pushing the pair past 100%. They
              stack below `md`, where a quarter of a phone is too narrow to hold
              anything. */}
          <div className="mx-auto flex w-full min-h-0 max-w-[1250px] flex-1 flex-col gap-4 md:flex-row">
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
      <section className="bg-secondary px-4 py-4 md:py-5 lg:py-16">
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
