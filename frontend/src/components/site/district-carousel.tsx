import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { stateExploreHref, stateSlug } from "@/lib/state-routes";

type DistrictItem = {
  name: string;
  slug?: string;
};

export function DistrictCarousel({ districts, stateName }: { districts: DistrictItem[]; stateName: string }) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
          Districts in {stateName}
        </h2>
      </div>

      <div className="rounded-xl border border-border bg-white p-3 sm:p-4">
        <div className="max-h-[248px] overflow-y-auto pr-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {districts.map((district, index) => (
              <DistrictCard key={`${district.slug || district.name}-${index}`} district={district} stateName={stateName} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DistrictCard({ district, stateName }: { district: DistrictItem; stateName: string }) {
  const href = district.slug ? stateExploreHref(district.slug) : stateExploreHref(`${district.name}-${stateSlug(stateName)}`);

  return (
    <Link
      href={href}
      className="group flex h-[72px] items-center justify-between gap-4 rounded-lg border border-border bg-background px-5 text-sm font-semibold text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors hover:border-saffron/50 hover:bg-saffron/5"
    >
      <span className="min-w-0 truncate">{district.name}</span>
      <ChevronRight className="size-5 shrink-0 text-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-saffron" strokeWidth={1.8} />
    </Link>
  );
}
