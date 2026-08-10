import Image from "next/image";
import Link from "next/link";

export function DashboardRightRail() {
  return (
    <aside className="h-full min-w-0">
      <section className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <header className="border-b border-border px-4 py-3.5">
          <h2 className="text-sm font-bold text-foreground">Plan your budget</h2>
        </header>

        <div className="flex flex-1 flex-col justify-between gap-3 p-3">
          <Link
            href="/tools/emi-calculator"
            aria-label="Open EMI Calculator"
            className="group block overflow-hidden rounded-md"
          >
            <Image
              src="/emi-calculator-banner.png"
              alt="EMI Calculator - calculate your monthly EMI and plan your dream home"
              width={1024}
              height={1536}
              sizes="(min-width: 1280px) 264px, 100vw"
              className="h-auto w-full transition-transform duration-200 group-hover:scale-[1.01]"
            />
          </Link>

          <div className="border-t border-border" />

          <Link
            href="/tools/stamp-duty-calculator"
            aria-label="Open Stamp Duty Calculator"
            className="group block overflow-hidden rounded-md"
          >
            <Image
              src="/stamp-duty-calculator-banner-v2.png"
              alt="Stamp Duty Calculator - estimate stamp duty and registration charges"
              width={1086}
              height={1448}
              sizes="(min-width: 1280px) 264px, 100vw"
              className="h-auto w-full transition-transform duration-200 group-hover:scale-[1.01]"
            />
          </Link>
        </div>
      </section>
    </aside>
  );
}
