import { cldUrl } from "@/lib/cloudinary-url";

/**
 * The site's hero photograph — home page and every Explore page share it,
 * delivered from the same Cloudinary transforms so both get identical pixels
 * (and one cached set of files).
 */
const HERO_IMAGE = "site/hero-home";
const HERO_WIDTHS = [1280, 1920, 2560, 3548];

export const HERO_IMAGE_ALT = "A city skyline at dusk, seen from the terrace of a high-rise home";

export const HERO_IMAGE_SRC = cldUrl(HERO_IMAGE, "f_auto,q_auto:best,w_1920,c_limit");

export const HERO_IMAGE_SRCSET = HERO_WIDTHS.map(
  (width) => `${cldUrl(HERO_IMAGE, `f_auto,q_auto:best,w_${width},c_limit`)} ${width}w`,
).join(", ");
