import type { Metadata } from "next";
import Link from "next/link";
import { Building2, ChevronRight, Home, Layers, MapPin } from "lucide-react";

import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { BuildersDirectory } from "./builders-directory";
import { DIRECTORY_BUILDERS, DIRECTORY_STATS } from "@/lib/builders-directory";

export const metadata: Metadata = {
  title: "Top Builders in India — Real Estate Developers List | Makan Mantraa",
  description: `Browse ${DIRECTORY_STATS.builders} leading real estate builders and developers across ${DIRECTORY_STATS.states} Indian states and UTs — with their delivered projects and operating cities.`,
  // Absolute on purpose: the root layout sets no `metadataBase`, so a relative
  // canonical would resolve against localhost.
  alternates: { canonical: "https://makanmantra.com/top-builders-in-india" },
};

const HERO_STATS = [
  { value: String(DIRECTORY_STATS.builders), label: "Builders Listed", icon: Building2 },
  { value: String(DIRECTORY_STATS.states), label: "States & UTs", icon: MapPin },
  { value: `${DIRECTORY_STATS.cities}+`, label: "Cities Covered", icon: Home },
  { value: `${DIRECTORY_STATS.projects}+`, label: "Projects Mapped", icon: Layers },
];

export default function TopBuildersInIndiaPage() {
  return (
    <div className="min-h-screen bg-secondary text-foreground selection:bg-primary/15">
      <Header />

      <header className="border-b border-black bg-[#0A2036] text-white">
        <nav>
          <ol className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto whitespace-nowrap px-4 py-3 text-sm text-white/70">
            <li>
              <Link href="/" className="flex items-center gap-1 hover:text-white">
                <Home className="h-3.5 w-3.5" /> India
              </Link>
            </li>
            <ChevronRight className="h-3.5 w-3.5" />
            <li className="font-medium text-white">Top Builders</li>
          </ol>
        </nav>

        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="mb-4 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/75">
            <span className="mr-2 h-2.5 w-2.5 rounded-full bg-saffron shadow-[0_0_12px_rgba(255,122,26,.95)]" />
            Builder directory
          </div>

          <h1 className="text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
            Top Builders in <span className="text-saffron">India</span>
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/75 md:text-base">
            A state-wise directory of established real estate developers — the year they started,
            the projects they have delivered and the cities they build in.
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:max-w-3xl">
            {HERO_STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3"
              >
                <stat.icon className="size-4 text-saffron" strokeWidth={1.9} />
                <dd className="mt-2 text-2xl font-extrabold leading-none">{stat.value}</dd>
                <dt className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/60">
                  {stat.label}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <BuildersDirectory builders={DIRECTORY_BUILDERS} />

      <Footer />
    </div>
  );
}
