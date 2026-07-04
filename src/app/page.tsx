import Image from "next/image";
import Link from "next/link";
import { Building2, ShieldCheck, TrendingUp } from "lucide-react";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { HeroSearch } from "@/components/site/hero-search";
import { PropertyCard } from "@/components/site/property-card";
import { StateExplorer } from "@/components/site/state-explorer";
import { HeroText } from "@/components/site/hero-text";
import { generateProperties } from "@/lib/properties";
import { stateExploreHref } from "@/lib/state-routes";

export default function Home() {
  const featured = generateProperties("Maharashtra", 6);

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
        <div className="mx-auto max-w-7xl rounded-[28px] border border-border bg-background px-3 py-8 shadow-sm md:px-5 md:py-10">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-bold md:text-3xl">Explore properties by state</h2>
              <p className="mt-1 text-muted-foreground">
                Start with India&apos;s busiest real estate markets, then browse every state.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-xl border border-border bg-card px-4 py-3 text-center shadow-sm">
              {[
                ["1.2M+", "Listings"],
                ["500+", "Cities"],
                ["30", "States"],
              ].map(([value, label]) => (
                <div key={label}>
                  <div className="text-sm font-bold text-primary md:text-base">{value}</div>
                  <div className="text-[11px] text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <StateExplorer />
        </div>
      </section>

      {/* Featured properties */}
      <section className="bg-secondary px-4 py-4 md:py-5">
        <div className="mx-auto max-w-7xl rounded-[28px] border border-border bg-background px-3 py-8 shadow-sm md:px-5 md:py-10">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-bold md:text-3xl">Featured properties</h2>
            <Link href={stateExploreHref("Maharashtra")} className="text-sm font-medium text-primary hover:underline">View all →</Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => <PropertyCard key={p.id} p={p} />)}
          </div>
        </div>
      </section>

      {/* Trust section */}
      <section className="bg-secondary px-4 py-4 md:py-5">
        <div className="mx-auto max-w-7xl rounded-[28px] border border-border bg-background px-3 py-8 shadow-sm md:px-5 md:py-10">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "100% Verified", body: "Every listing is reviewed before it goes live." },
              { icon: TrendingUp, title: "Real market prices", body: "Live pricing insights across localities." },
              { icon: Building2, title: "Direct from owners", body: "Zero brokerage on thousands of homes." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-4 rounded-xl border border-border bg-card p-5">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-saffron/15 text-saffron">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-semibold">{title}</div>
                  <div className="text-sm text-muted-foreground">{body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
