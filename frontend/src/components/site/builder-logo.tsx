import { Building2 } from "lucide-react";

import type { DirectoryBuilder } from "@/lib/builders-directory";

/**
 * A builder's logo on a tile, shared by the home page showcase and the Top
 * Builders directory so both read the same.
 *
 * Logos come in as whatever the builder publishes — square marks, wide
 * wordmarks, some on a white plate — so they sit `contain`ed on the tile rather
 * than filling it, and a builder without one falls back to an icon.
 *
 * A dozen-odd logos are white ink on a transparent background and vanish on a
 * white tile, so `logoTile` puts those on the site's navy instead.
 *
 * A plain `<img>` on purpose, as everywhere else we serve Cloudinary: the URL
 * already carries `q_auto,f_auto`, so routing it through the Next optimizer
 * would only resize an image that is 256px to begin with.
 */
export function BuilderLogo({
  builder,
  className,
}: {
  builder: DirectoryBuilder;
  className: string;
}) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-xl border ${
        builder.logoTile === "dark" ? "border-[#0A2036] bg-[#0A2036]" : "border-border bg-white"
      } ${className}`}
    >
      {builder.logo ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={builder.logo}
          alt={`${builder.displayName} logo`}
          loading="lazy"
          className="size-full object-contain p-1.5"
        />
      ) : (
        <Building2
          className="absolute inset-0 m-auto size-1/2 text-muted-foreground"
          strokeWidth={1.6}
        />
      )}
    </div>
  );
}
