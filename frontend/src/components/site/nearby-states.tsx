import Image from "next/image";
import Link from "next/link";
import { stateExploreHref } from "@/lib/state-routes";
import { stateCardImage } from "@/lib/state-images";
import { neighbouringStates } from "@/lib/state-neighbours";

/**
 * The states next door.
 *
 * A property search rarely stops at a state line — someone reading Haryana is
 * often weighing Delhi and Punjab in the same breath — and until now the only
 * way across was back to the header's picker. These are the real land borders
 * rather than a hand-picked "you may also like", so the row means something
 * geographically as well as giving every state page a handful of inbound links
 * from its neighbours.
 */
export function NearbyStates({ stateName }: { stateName: string }) {
  const neighbours = neighbouringStates(stateName);

  // The two island territories border nothing, so they get no section at all.
  if (neighbours.length === 0) return null;

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-3xl font-bold leading-tight text-foreground md:text-4xl">
          Explore nearby states
        </h2>
        {/* The heading names the action; the line under it carries the fact,
            which is where the state's own name belongs. */}
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {neighbours.length === 1
            ? `${stateName} shares a land border with one state — explore it next.`
            : `${stateName} shares a land border with ${neighbours.length} states and territories.`}
        </p>
      </div>

      {/* The same card the state explorer on the home page uses: the drawing
          small and whole beside the name, rather than cropped to fill a tile. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {neighbours.map((name) => (
          <Link
            key={name}
            href={stateExploreHref(name)}
            className="group flex items-center overflow-hidden rounded-xl border border-border bg-white transition-colors hover:border-saffron/60"
          >
            <span className="grid h-20 w-24 shrink-0 place-items-center border-r border-border">
              <Image
                src={stateCardImage(name)}
                alt=""
                width={160}
                height={128}
                className="h-14 w-20 object-contain"
              />
            </span>
            <span className="min-w-0 flex-1 truncate px-3 text-sm font-medium text-foreground">
              {name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
