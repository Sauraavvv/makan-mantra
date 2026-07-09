import { stateSlug } from "@/lib/state-routes";

const STATE_IMAGE_BY_SLUG: Record<string, string> = {
  "andaman-and-nicobar-islands": "/state-cards/andaman-and-nicobar-islands.jpg",
  "andhra-pradesh": "/state-cards/andhra-pradesh.jpg",
  "arunachal-pradesh": "/state-cards/arunachal-pradesh.jpg",
  assam: "/state-cards/assam.jpg",
  bihar: "/state-cards/bihar.jpg",
  chandigarh: "/state-cards/chandigarh.jpg",
  chhattisgarh: "/state-cards/chhattisgarh.jpg",
  delhi: "/state-cards/delhi.jpg",
  goa: "/state-cards/goa.jpg",
  gujarat: "/state-cards/gujarat.jpg",
  haryana: "/state-cards/haryana.jpg",
  "himachal-pradesh": "/state-cards/himachal-pradesh.jpg",
  "jammu-and-kashmir": "/state-cards/jammu-and-kashmir.jpg",
  "jammu-kashmir": "/state-cards/jammu-and-kashmir.jpg",
  jharkhand: "/state-cards/jharkhand.jpg",
  karnataka: "/state-cards/karnataka.jpg",
  kerala: "/state-cards/kerala.jpg",
  ladakh: "/state-cards/ladakh.jpg",
  lakshadweep: "/state-cards/lakshadweep.jpg",
  "madhya-pradesh": "/state-cards/madhya-pradesh.jpg",
  maharashtra: "/state-cards/maharashtra.jpg",
  manipur: "/state-cards/manipur.jpg",
  meghalaya: "/state-cards/meghalaya.jpg",
  mizoram: "/state-cards/mizoram.jpg",
  nagaland: "/state-cards/nagaland.jpg",
  odisha: "/state-cards/odisha.jpg",
  puducherry: "/state-cards/puducherry.jpg",
  punjab: "/state-cards/punjab.jpg",
  rajasthan: "/state-cards/rajasthan.jpg",
  sikkim: "/state-cards/sikkim.jpg",
  "tamil-nadu": "/state-cards/tamil-nadu.jpg",
  telangana: "/state-cards/telangana.jpg",
  tripura: "/state-cards/tripura.jpg",
  "uttar-pradesh": "/state-cards/uttar-pradesh.jpg",
  uttarakhand: "/state-cards/uttarakhand.jpg",
  "west-bengal": "/state-cards/west-bengal.jpg",
};

export function stateCardImage(state: string) {
  return STATE_IMAGE_BY_SLUG[stateSlug(state)] || "/hero-home.jpg";
}
