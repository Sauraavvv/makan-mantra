import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Building2, ChevronRight, Eye, Map, MapPin, ShieldCheck, Tag, Users } from "lucide-react";

import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { PostPropertyWizard } from "@/components/site/post-property-wizard";
import { getPropertyStats } from "@/lib/property-stats";

export const metadata: Metadata = {
  title: "Post Your Property Free — Makan Mantraa",
  description:
    "List your flat, villa, plot or office on Makan Mantraa for free. Reach genuine buyers and tenants across India in minutes.",
};

/** Hero artwork swaps with the time of day in India (IST): 6:00–17:59 morning, otherwise night. */
const MORNING_START_HOUR = 6;
const NIGHT_START_HOUR = 18;

const HERO_IMAGES = {
  morning: {
    src: "/post-property-hero-morning.webp",
    alt: "Waterfront home at sunrise with the city skyline behind it",
    overlay: "bg-gradient-to-r from-[#03142B] via-[#03142B]/80 to-[#03142B]/10",
  },
  night: {
    src: "/post-property-hero-night.webp",
    alt: "Waterfront home at night with the city skyline behind it",
    // Black only behind the copy, faded out well before the house.
    overlay:
      "bg-[linear-gradient(to_right,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.8)_25%,rgba(0,0,0,0.4)_45%,rgba(0,0,0,0)_62%)]",
  },
} as const;

function istHour() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date());

  return Number(parts.find((part) => part.type === "hour")?.value ?? 0);
}

const HIGHLIGHTS = [
  { icon: Tag, title: "100% Free", copy: "No hidden charges" },
  { icon: Users, title: "Genuine Buyers", copy: "Direct connections" },
  { icon: Eye, title: "Maximum Visibility", copy: "Seen across India" },
];

export default async function PostPropertyPage({
  searchParams,
}: {
  searchParams: Promise<{ hero?: string }>;
}) {
  // Render at request time so the hero always matches the current hour in India.
  await connection();

  const hour = istHour();
  const isMorning = hour >= MORNING_START_HOUR && hour < NIGHT_START_HOUR;

  // `?hero=morning|night` forces a variant while developing.
  const forced = process.env.NODE_ENV !== "production" ? (await searchParams).hero : undefined;
  const variant = forced === "morning" || forced === "night" ? forced : isMorning ? "morning" : "night";
  const hero = HERO_IMAGES[variant];
  const stats = await getPropertyStats();

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <Header overlay minimal overlayTone={variant === "night" ? "tint" : "solid"} />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative w-full overflow-hidden bg-[#00081D]">
          <Image
            src={hero.src}
            alt={hero.alt}
            fill
            priority
            sizes="100vw"
            className="object-cover object-right"
          />
          <div className={`absolute inset-0 ${hero.overlay}`} />

          {/* The header sits on top of the hero, so the top padding makes room for it. */}
          <div className="relative mx-auto flex w-full max-w-[1250px] flex-col justify-center gap-6 px-4 pb-12 pt-28 md:px-8 lg:min-h-[664px] lg:pb-16 lg:pt-32">
            <div className="max-w-3xl text-white">
              <nav aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-sm text-white/60">
                  <li>
                    <Link href="/" className="transition-colors hover:text-white">
                      Home
                    </Link>
                  </li>
                  <li aria-hidden="true">
                    <ChevronRight className="size-3.5" />
                  </li>
                  <li className="font-medium text-white" aria-current="page">
                    Post Property
                  </li>
                </ol>
              </nav>

              <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-semibold">
                <ShieldCheck className="size-4 text-saffron" />
                India&apos;s Trusted Property Platform
              </span>

              <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
                Sell or Rent Your Property Faster
                <span className="mt-1 block text-saffron">100% Free.</span>
              </h1>

              <p className="mt-4 max-w-xl text-base leading-relaxed text-white/75 md:text-lg">
                List your property in just 2 minutes and connect with genuine buyers and tenants.
              </p>

              {/* px-5 matches the stats strip's padding so both rows' icons line up */}
              <ul className="mt-8 grid max-w-3xl gap-5 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-white/15 sm:px-5">
                {HIGHLIGHTS.map((highlight) => (
                  <li key={highlight.title} className="flex items-center gap-3 sm:px-4 sm:first:pl-0">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10">
                      <highlight.icon className="size-4 text-saffron" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">{highlight.title}</span>
                      <span className="block text-xs text-white/65">{highlight.copy}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {stats && (
              <dl className="grid max-w-3xl grid-cols-1 gap-5 rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-white backdrop-blur-sm sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-white/10">
                {[
                  { icon: Building2, value: stats.properties, label: "Properties Posted" },
                  { icon: MapPin, value: stats.cities, label: "Cities Covered" },
                  { icon: Map, value: stats.states, label: "States Covered" },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-3 sm:px-4 sm:first:pl-0">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10">
                      <stat.icon className="size-4 text-saffron" />
                    </span>
                    <span>
                      <dt className="sr-only">{stat.label}</dt>
                      <dd className="text-xl font-extrabold leading-none">
                        {stat.value.toLocaleString("en-IN")}
                      </dd>
                      <span className="mt-1 block text-xs text-white/65">{stat.label}</span>
                    </span>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </section>

        {/* Steps + form */}
        <section className="bg-secondary px-4 pb-12 pt-4 md:px-8 md:pb-16 md:pt-5">
          <div className="mx-auto max-w-[1250px]">
            <PostPropertyWizard />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
