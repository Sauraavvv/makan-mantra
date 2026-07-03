import Image from "next/image";
import Link from "next/link";
import { Building2, Search, ShieldCheck, TrendingUp } from "lucide-react";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { PropertyCard } from "@/components/site/property-card";
import { StateExplorer } from "@/components/site/state-explorer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateProperties } from "@/lib/properties";

export default function Home() {
  const featured = generateProperties("Maharashtra", 6);

  return (
    <div className="flex min-h-screen flex-col bg-background">
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
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5 text-success" /> 1.2M+ verified listings across India
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl">
              Find your next <span className="text-white">home</span> in{" "}
              <span className="text-saffron">India</span>
            </h1>
            <p className="mt-4 text-lg text-white/85">
              Search flats, villas and plots for sale or rent across every state - from Mumbai and
              Bangalore to Nashik and Nagpur.
            </p>
            <div id="hero-search" className="mx-auto mt-8 flex max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card p-2 shadow-lg sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search city, locality or project…" className="border-0 pl-9 focus-visible:ring-0" />
              </div>
              <Button className="h-10 gap-2 bg-saffron text-saffron-foreground hover:bg-saffron/90">
                <Search className="h-4 w-4" /> Search
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
              {["Buy", "Rent", "PG", "New Projects", "Commercial"].map((c) => (
                <Link key={c} href="/" className="rounded-full border border-white/25 bg-white/15 px-4 py-1.5 text-white backdrop-blur hover:bg-white/25">{c}</Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Browse by state */}
      <section className="mx-auto max-w-7xl px-4 py-14">
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
      </section>

      {/* Featured properties */}
      <section className="mx-auto max-w-7xl px-4 pb-14">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold md:text-3xl">Featured properties</h2>
          <Link href="/maharashtra" className="text-sm font-medium text-primary hover:underline">View all →</Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => <PropertyCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* Trust section */}
      <section className="border-y border-border bg-card/40">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-14 md:grid-cols-3">
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
      </section>

      <Footer />
    </div>
  );
}
