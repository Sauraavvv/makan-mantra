import Image from "next/image";
import Link from "next/link";

export type TopBuilderItem = {
  title: string;
  /** Builder logo; the monogram stands in until there is one. */
  image?: string;
  /** Year the builder was founded, e.g. 1946. */
  since?: string | number;
  /** Delivered projects, e.g. "210+". */
  projects?: string;
  /** Cities the builder operates in. */
  cities?: string[];
  /** Segments such as Residential, Commercial, Retail. */
  categories?: string[];
  href?: string;
};

/** Monogram tints, cycled so a grid of them does not read as one block. */
const ACCENTS = [
  "bg-[#1160F0]/10 text-[#1160F0]",
  "bg-[#7A1FD1]/10 text-[#7A1FD1]",
  "bg-[#F97316]/12 text-[#C2410C]",
  "bg-[#0F8B8D]/10 text-[#0F8B8D]",
  "bg-[#C2255C]/10 text-[#C2255C]",
] as const;

/**
 * The builders active in a state, as a plain grid of cards.
 *
 * This replaced a carousel built around a large illustration pinned down its
 * left side, which took nearly two fifths of the section's width to say
 * nothing, and pushed ten builders into a sideways scroll that showed three at
 * a time. A grid shows all of them at once and costs no width at all.
 *
 * The cards carry a name and nothing else on purpose. State pages store only
 * builder names, and `builders.json` — where the logos, founding years and
 * project counts are meant to live — is currently filled in for none of the
 * 350 builders in it. The card this replaced printed three rows regardless, so
 * every builder in every state claimed the same "Trusted Developer / Quality
 * Projects Delivered / … Market Presence". Each of those rows here appears
 * only once there is something real behind it.
 */
export function TopBuilders({
  builders,
  displayName,
}: {
  builders: TopBuilderItem[];
  displayName: string;
}) {
  if (builders.length === 0) return null;

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-3xl font-bold leading-tight text-foreground md:text-4xl">
          Top Builders in {displayName}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Leading developers active across {displayName}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {builders.map((builder, index) => (
          <BuilderCard
            key={builder.title}
            builder={builder}
            accent={ACCENTS[index % ACCENTS.length]}
          />
        ))}
      </div>
    </div>
  );
}

function BuilderCard({ builder, accent }: { builder: TopBuilderItem; accent: string }) {
  const meta = builderMeta(builder);

  const card = (
    <article className="flex h-full items-center gap-3 rounded-xl border border-border bg-white p-3 transition-colors hover:border-saffron/60">
      <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-white">
        {builder.image ? (
          <Image
            src={builder.image}
            alt=""
            width={96}
            height={96}
            className="size-full object-contain p-1"
          />
        ) : (
          /* The name's own initials, which is the most a card can honestly
             show for a builder we hold nothing else about. */
          <span className={`grid size-full place-items-center text-sm font-extrabold ${accent}`}>
            {initialsOf(builder.title)}
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold leading-5 text-foreground">
          {builder.title}
        </span>
        {meta && (
          <span className="mt-0.5 block truncate text-[11px] leading-4 text-muted-foreground">
            {meta}
          </span>
        )}
      </span>
    </article>
  );

  // Only a builder with a page of its own is a link; the rest are read, not
  // clicked — a card that looks clickable and goes nowhere is worse than one
  // that does not.
  return builder.href ? (
    <Link href={builder.href} className="block h-full">
      {card}
    </Link>
  ) : (
    card
  );
}

/** The one line under the name — whichever fact we actually hold, or none. */
function builderMeta(builder: TopBuilderItem) {
  if (builder.projects) {
    return /project/i.test(builder.projects) ? builder.projects : `${builder.projects} projects`;
  }
  if (builder.since) return `Since ${builder.since}`;
  if (builder.cities?.length) return builder.cities.slice(0, 3).join(", ");
  if (builder.categories?.length) return builder.categories.slice(0, 2).join(", ");
  return null;
}

function initialsOf(title: string) {
  const words = title
    .replace(/\b(private|pvt|limited|ltd|llp|group|constructions?|developers?|india)\b/gi, " ")
    .split(/\s+/)
    .filter(Boolean);

  return (words.length > 1 ? words[0][0] + words[1][0] : title.slice(0, 2)).toUpperCase();
}
