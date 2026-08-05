import Image from "next/image";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { HeroSearch } from "@/components/site/hero-search";
import { StateExplorer } from "@/components/site/state-explorer";
import { HeroText } from "@/components/site/hero-text";
import { PostPropertyBanner } from "@/components/site/post-property-banner";
import { QuickLinks, type QuickLinkGroup } from "@/components/site/quick-links";

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

export default async function Home() {
  const quickLinkGroups = await getStateQuickLinks();

  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
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
            <HeroText />
            <HeroSearch />
          </div>
        </div>
      </section>

      {/* Browse by state */}
      <section className="bg-secondary px-4 py-4 md:py-5">
        <div className="mx-auto max-w-[1250px] rounded-[20px] border border-border bg-background px-5 py-5">
          <div className="mb-6">
            <h2 className="text-2xl font-bold md:text-3xl">Explore your state</h2>
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
