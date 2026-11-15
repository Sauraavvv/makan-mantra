import { cldUrl } from "@/lib/cloudinary-url";

/**
 * `src` + `srcSet` for a full-bleed hero photograph on Cloudinary.
 *
 * `q_auto:best` and `c_limit` keep every width as sharp as the original
 * allows (never upscaled); the browser picks the width for its screen.
 */
export function heroImage(publicId: string, widths: number[]) {
  const url = (width: number) => cldUrl(publicId, `f_auto,q_auto:best,w_${width},c_limit`);
  return {
    src: url(1920),
    srcSet: widths.map((width) => `${url(width)} ${width}w`).join(", "),
  };
}

/**
 * The site's hero photograph — home page and every Explore page share it,
 * delivered from the same Cloudinary transforms so both get identical pixels
 * (and one cached set of files).
 */
const HOME_HERO = heroImage("site/hero-home", [1280, 1920, 2560, 3548]);

export const HERO_IMAGE_ALT = "A city skyline at dusk, seen from the terrace of a high-rise home";
export const HERO_IMAGE_SRC = HOME_HERO.src;
export const HERO_IMAGE_SRCSET = HOME_HERO.srcSet;

/**
 * Top Builders hero: towers under construction with their cranes at twilight.
 * The original is 6684px wide, so it is offered up to 3840px for 4K and
 * high-DPI screens.
 */
export const TOP_BUILDERS_HERO = {
  ...heroImage("site/hero-top-builders", [1280, 1920, 2560, 3840]),
  alt: "High-rise towers under construction, lit up beneath tower cranes at twilight",
};
