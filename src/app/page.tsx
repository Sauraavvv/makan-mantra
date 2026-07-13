import Image from "next/image";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { HeroSearch } from "@/components/site/hero-search";
import { StateExplorer } from "@/components/site/state-explorer";
import { HeroText } from "@/components/site/hero-text";

export default function Home() {
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
        <div className="mx-auto max-w-7xl rounded-[28px] border border-border bg-background px-5 py-5 shadow-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-bold md:text-3xl">Explore your state</h2>
            <p className="mt-1 text-muted-foreground">
              Start with India&apos;s busiest real estate markets, then browse every state.
            </p>
          </div>

          <StateExplorer />
        </div>
      </section>

      <Footer />
    </div>
  );
}
