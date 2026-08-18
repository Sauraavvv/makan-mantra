import { stateSlug } from "@/lib/state-routes";
import { cldUrl } from "@/lib/cloudinary-url";

const STATE_IMAGE_BY_SLUG: Record<string, string> = {
  "andaman-and-nicobar-islands": "/state-cards/andaman-and-nicobar-islands.webp",
  "andhra-pradesh": "/state-cards/andhra-pradesh.webp",
  "arunachal-pradesh": "/state-cards/arunachal-pradesh.webp",
  assam: "/state-cards/assam.webp",
  bihar: "/state-cards/bihar.webp",
  chandigarh: "/state-cards/chandigarh.webp",
  chhattisgarh: "/state-cards/chhattisgarh.webp",
  "dadra-and-nagar-haveli-and-daman-and-diu":
    "/state-cards/dadra-and-nagar-haveli-and-daman-and-diu.webp",
  delhi: "/state-cards/delhi.webp",
  goa: "/state-cards/goa.webp",
  gujarat: "/state-cards/gujarat.webp",
  haryana: "/state-cards/haryana.webp",
  "himachal-pradesh": "/state-cards/himachal-pradesh.webp",
  "jammu-and-kashmir": "/state-cards/jammu-and-kashmir.webp",
  "jammu-kashmir": "/state-cards/jammu-and-kashmir.webp",
  jharkhand: "/state-cards/jharkhand.webp",
  karnataka: "/state-cards/karnataka.webp",
  kerala: "/state-cards/kerala.webp",
  ladakh: "/state-cards/ladakh.webp",
  lakshadweep: "/state-cards/lakshadweep.webp",
  "madhya-pradesh": "/state-cards/madhya-pradesh.webp",
  maharashtra: "/state-cards/maharashtra.webp",
  manipur: "/state-cards/manipur.webp",
  meghalaya: "/state-cards/meghalaya.webp",
  mizoram: "/state-cards/mizoram.webp",
  nagaland: "/state-cards/nagaland.webp",
  odisha: "/state-cards/odisha.webp",
  puducherry: "/state-cards/puducherry.webp",
  punjab: "/state-cards/punjab.webp",
  rajasthan: "/state-cards/rajasthan.webp",
  sikkim: "/state-cards/sikkim.webp",
  "tamil-nadu": "/state-cards/tamil-nadu.webp",
  telangana: "/state-cards/telangana.webp",
  tripura: "/state-cards/tripura.webp",
  "uttar-pradesh": "/state-cards/uttar-pradesh.webp",
  uttarakhand: "/state-cards/uttarakhand.webp",
  "west-bengal": "/state-cards/west-bengal.webp",
};

export function stateCardImage(state: string) {
  return STATE_IMAGE_BY_SLUG[stateSlug(state)] || "/hero-home.jpg";
}

/** State-level Explore headers use the matching normalized Cloudinary banner. */
export function stateExploreBanner(state: string) {
  const slug = stateSlug(state);
  if (!STATE_IMAGE_BY_SLUG[slug]) return null;

  // Use the source asset exactly as uploaded — no delivery resize or format
  // conversion — so the Explore hero receives the banner's original pixels.
  return cldUrl(`site/explore-state-${slug}`, "");
}
