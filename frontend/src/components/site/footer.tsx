import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  ChevronRight,
  Headset,
  Heart,
  Lock,
  MapPinned,
  ShieldCheck,
} from "lucide-react";
import { NewsletterSignup } from "@/components/site/newsletter-signup";
import { stateExploreHref } from "@/lib/state-routes";

type FooterLink = {
  label: string;
  href: string;
  propertyType?: string;
};

/**
 * Pages that have not been built yet. Everything pointing here lands on the
 * home page — grep for PLACEHOLDER to find every one of them at once.
 */
const PLACEHOLDER = "/";

const TRUST_POINTS: Array<{ icon: LucideIcon; title: string; copy: string }> = [
  { icon: ShieldCheck, title: "Verified Listings", copy: "100% verified properties" },
  { icon: MapPinned, title: "Nationwide Coverage", copy: "All states, cities & localities" },
  { icon: Headset, title: "Expert Support", copy: "We're here to help you" },
  { icon: Lock, title: "Secure & Reliable", copy: "Your data is 100% safe" },
];

const EXPLORE_LINKS: Array<[string, string]> = [
  ["Buy Property", stateExploreHref("Maharashtra")],
  ["Rent Property", `${stateExploreHref("Maharashtra")}?listing=rent`],
  ["Post Property (Free)", "/post-property"],
  ["Top Builders in India", "/top-builders-in-india"],
  ["Articles & News", "/blog"],
  ["EMI Calculator", "/tools/emi-calculator"],
  ["Stamp Duty Calculator", "/tools/stamp-duty-calculator"],
];

const TOP_LOCATION_STATES = [
  "Maharashtra",
  "Karnataka",
  "Tamil Nadu",
  "Telangana",
  "Gujarat",
  "Uttar Pradesh",
  "Rajasthan",
  "Kerala",
];

const HELPFUL_LINKS: Array<[string, string]> = [
  ["Property Services", PLACEHOLDER],
  ["Home Loan", PLACEHOLDER],
  ["Property Guide", PLACEHOLDER],
  ["FAQs", PLACEHOLDER],
  ["Contact Us", PLACEHOLDER],
  ["Sitemap", "/sitemap.xml"],
];

const COMPANY_LINKS: Array<[string, string]> = [
  ["About Us", PLACEHOLDER],
  ["Careers", PLACEHOLDER],
  ["Terms & Conditions", PLACEHOLDER],
  ["Privacy Policy", PLACEHOLDER],
  ["Refund Policy", PLACEHOLDER],
  ["Disclaimer", PLACEHOLDER],
];

const BOTTOM_BADGES: Array<{ icon: LucideIcon; label: string }> = [
  { icon: BadgeCheck, label: "Trusted Platform" },
  { icon: Lock, label: "Secure Transactions" },
  { icon: ShieldCheck, label: "Privacy Protected" },
];

export function Footer({
  locationLinks = [],
  locationTitle = "Location Pages",
}: {
  locationLinks?: FooterLink[];
  locationTitle?: string;
}) {
  const groupedLinks = locationLinks.reduce(
    (groups, link) => {
      const category = getLocationLinkCategory(link);
      groups[category].push(link);
      return groups;
    },
    { residential: [] as FooterLink[], commercial: [] as FooterLink[] },
  );

  return (
    <footer className="mt-16 border-t border-white/10 bg-[#0A2036] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12">
        {locationLinks.length > 0 && (
          <div className="mb-12 border-b border-white/10 pb-10">
            <ColumnHeading>{locationTitle}</ColumnHeading>
            <div className="mt-5 grid gap-8 lg:grid-cols-2">
              <FooterLinkGroup title="Residential" links={groupedLinks.residential} />
              <FooterLinkGroup title="Commercial" links={groupedLinks.commercial} />
            </div>
          </div>
        )}

        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1.05fr_1fr_0.95fr]">
          <div>
            <div className="text-2xl font-bold tracking-tight">
              Makan <span className="text-saffron">Mantraa</span>
            </div>

            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/65">
              India&apos;s trusted real estate platform to buy, rent &amp; discover the best
              properties across every corner.
            </p>

            <div className="mt-6 space-y-4 border-t border-white/10 pt-6">
              {TRUST_POINTS.map((point) => (
                <div key={point.title} className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full border border-saffron/40 text-saffron">
                    <point.icon className="size-4" strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{point.title}</p>
                    <p className="text-xs text-white/55">{point.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <FooterColumn title="Explore" links={EXPLORE_LINKS} chevron />

          <FooterColumn
            title="Top Locations"
            links={TOP_LOCATION_STATES.map((state) => [state, stateExploreHref(state)])}
            chevron
          />

          <FooterColumn title="Helpful Links" links={HELPFUL_LINKS} />

          <FooterColumn title="Company" links={COMPANY_LINKS} />
        </div>

        <section className="mt-12 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          <div className="grid items-center gap-6 px-6 py-7 lg:grid-cols-2 lg:gap-10 lg:px-8">
            <div className="min-w-0">
              <h3 className="text-xl font-bold tracking-tight text-white lg:text-2xl">
                Stay Updated with the Latest Properties
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-white/60">
                Subscribe to get updates on new listings, price drops, and real estate
                insights.
              </p>
            </div>

            <NewsletterSignup />
          </div>
        </section>

        <div className="mt-12 border-t border-white/10 pt-8">
          <div className="flex flex-col gap-4 text-xs text-white/55 lg:flex-row lg:items-center lg:justify-between">
            <p>
              © 2025 <span className="font-semibold text-saffron">Makan Mantraa</span>. All rights
              reserved.
            </p>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {BOTTOM_BADGES.map((badge) => (
                <span key={badge.label} className="flex items-center gap-2">
                  <badge.icon className="size-4 text-white/45" strokeWidth={1.8} />
                  {badge.label}
                </span>
              ))}
            </div>

            <p className="flex items-center gap-1.5">
              Made with <Heart className="size-3.5 fill-saffron text-saffron" /> in India
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function ColumnHeading({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-white">{children}</h3>
      <span className="mt-2 block h-0.5 w-8 rounded-full bg-saffron" />
    </div>
  );
}

function FooterColumn({
  title,
  links,
  chevron = false,
}: {
  title: string;
  links: Array<[string, string]>;
  /** Location and explore lists read as navigation, so they carry an affordance. */
  chevron?: boolean;
}) {
  return (
    <div>
      <ColumnHeading>{title}</ColumnHeading>
      <ul className="mt-5 space-y-2.5 text-sm text-white/70">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link
              href={href}
              className="group flex items-center justify-between gap-3 transition-colors hover:text-white"
            >
              <span className="truncate">{label}</span>
              {chevron && (
                <ChevronRight className="size-3.5 shrink-0 text-white/30 transition-colors group-hover:text-saffron" />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function getLocationLinkCategory(link: FooterLink): "residential" | "commercial" {
  const value = normalizeLinkText(`${link.propertyType || ""} ${link.label} ${link.href}`);

  if (/\b(flat|villa|builder|floor|pg|paying|apartment|residential)\b/.test(value)) {
    return "residential";
  }

  if (/\b(office|shop|showroom|plot|land|commercial)\b/.test(value)) {
    return "commercial";
  }

  return "residential";
}

function normalizeLinkText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function FooterLinkGroup({ title, links }: { title: string; links: FooterLink[] }) {
  if (links.length === 0) return null;

  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold text-white">{title}</h4>
      <div className="grid gap-x-5 gap-y-2 text-sm text-white/70 sm:grid-cols-2">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="truncate hover:text-white">
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
