import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-[#0A2036] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-4 md:py-20">
        <div>
          <div className="flex items-center">
            <span className="text-lg font-bold">
              Makan <span className="text-saffron">Mantraa</span>
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-white/70">
            India&apos;s trusted platform to buy, sell and rent properties across every state.
          </p>
        </div>
        <FooterCol title="Company" links={[["About", "/"], ["Contact", "/"], ["Careers", "/"]]} />
        <FooterCol title="Legal" links={[["Privacy", "/"], ["Terms", "/"], ["Cookies", "/"]]} />
        <FooterCol
          title="Popular"
          links={[
            ["Flats in Mumbai", "/maharashtra"],
            ["Flats in Pune", "/maharashtra"],
            ["Villas in Bangalore", "/karnataka"],
          ]}
        />
      </div>
      <div className="border-t border-white/10 py-6 text-center text-xs text-white/60">
        © 2025 Makan Mantraa. All rights reserved.
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold">{title}</h4>
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
