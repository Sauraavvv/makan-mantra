import Link from "next/link";
import { stateExploreHref } from "@/lib/state-routes";

type FooterLink = {
  label: string;
  href: string;
  propertyType?: string;
};

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
      <div className="mx-auto max-w-7xl px-4 py-10">
        {locationLinks.length > 0 && (
          <div className="mb-10 border-b border-white/10 pb-8">
            <div className="mb-5">
              <h3 className="text-lg font-semibold">{locationTitle}</h3>
            </div>
            <div className="grid gap-8 lg:grid-cols-2">
              <FooterLinkGroup title="Residential" links={groupedLinks.residential} />
              <FooterLinkGroup title="Commercial" links={groupedLinks.commercial} />
            </div>
          </div>
        )}

        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="text-xl font-bold">
              Makan <span className="text-saffron">Mantraa</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/65">
              India&apos;s trusted platform to buy, sell and rent properties across every state.
            </p>
          </div>
          <FooterCol title="Company" links={[["About", "/"], ["Contact", "/"], ["Careers", "/"]]} />
          <FooterCol title="Legal" links={[["Privacy", "/"], ["Terms", "/"], ["Cookies", "/"]]} />
          <FooterCol
            title="Popular"
            links={[
              ["Flats in Mumbai", stateExploreHref("Maharashtra")],
              ["Flats in Pune", stateExploreHref("Maharashtra")],
              ["Villas in Bangalore", stateExploreHref("Karnataka")],
            ]}
          />
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/55">
          © 2025 Makan Mantraa. All rights reserved.
        </div>
      </div>
    </footer>
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

function FooterCol({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold text-white">{title}</h4>
      <ul className="space-y-2 text-sm text-white/70">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
