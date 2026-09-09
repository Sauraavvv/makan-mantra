import { canonicalStateName, stateSlug } from "@/lib/state-routes";

/**
 * Which states and union territories share a land border with which.
 *
 * Keyed and valued by slug so the two spellings the site carries for one place
 * — the picker's "Jammu and Kashmir" against the cards' "Jammu & Kashmir" —
 * resolve to the same entry; `stateSlug` folds the ampersand.
 *
 * Only India's own borders are listed. A state that touches Nepal, China or
 * Bangladesh and nothing else on that side simply has a shorter list.
 *
 * Three things worth knowing about the entries below:
 *
 * - Uttar Pradesh and Himachal Pradesh have not been neighbours since
 *   Uttarakhand was carved out from between them in 2000, and neither have
 *   Haryana and Himachal along that stretch; older lists still pair them.
 * - Puducherry is four separate enclaves rather than one place, so it borders
 *   Tamil Nadu, Andhra Pradesh (Yanam) and Kerala (Mahe) without those three
 *   being anywhere near each other.
 * - Telangana and Odisha are left unpaired: sources disagree on whether the
 *   two meet at all, and a claim we cannot stand behind does not belong on a
 *   page that exists to be trusted.
 *
 * Dadra and Nagar Haveli and Daman and Diu is absent because the site has no
 * page for it — `state_overview` holds 35 entries, not 36.
 */
const NEIGHBOURS_BY_SLUG: Record<string, string[]> = {
  "andaman-and-nicobar-islands": [],
  "andhra-pradesh": ["telangana", "chhattisgarh", "odisha", "tamil-nadu", "karnataka", "puducherry"],
  "arunachal-pradesh": ["assam", "nagaland"],
  assam: [
    "arunachal-pradesh",
    "nagaland",
    "manipur",
    "mizoram",
    "tripura",
    "meghalaya",
    "west-bengal",
  ],
  bihar: ["uttar-pradesh", "jharkhand", "west-bengal"],
  chandigarh: ["punjab", "haryana"],
  chhattisgarh: [
    "madhya-pradesh",
    "maharashtra",
    "telangana",
    "andhra-pradesh",
    "odisha",
    "jharkhand",
    "uttar-pradesh",
  ],
  delhi: ["haryana", "uttar-pradesh"],
  goa: ["maharashtra", "karnataka"],
  gujarat: ["rajasthan", "madhya-pradesh", "maharashtra"],
  haryana: [
    "punjab",
    "himachal-pradesh",
    "uttarakhand",
    "uttar-pradesh",
    "rajasthan",
    "delhi",
    "chandigarh",
  ],
  "himachal-pradesh": ["jammu-and-kashmir", "ladakh", "punjab", "haryana", "uttarakhand"],
  "jammu-and-kashmir": ["ladakh", "himachal-pradesh", "punjab"],
  jharkhand: ["bihar", "west-bengal", "odisha", "chhattisgarh", "uttar-pradesh"],
  karnataka: ["maharashtra", "goa", "telangana", "andhra-pradesh", "tamil-nadu", "kerala"],
  kerala: ["karnataka", "tamil-nadu", "puducherry"],
  ladakh: ["jammu-and-kashmir", "himachal-pradesh"],
  lakshadweep: [],
  "madhya-pradesh": ["uttar-pradesh", "chhattisgarh", "maharashtra", "gujarat", "rajasthan"],
  maharashtra: ["gujarat", "madhya-pradesh", "chhattisgarh", "telangana", "karnataka", "goa"],
  manipur: ["nagaland", "assam", "mizoram"],
  meghalaya: ["assam"],
  mizoram: ["assam", "manipur", "tripura"],
  nagaland: ["arunachal-pradesh", "assam", "manipur"],
  odisha: ["west-bengal", "jharkhand", "chhattisgarh", "andhra-pradesh"],
  puducherry: ["tamil-nadu", "andhra-pradesh", "kerala"],
  punjab: ["jammu-and-kashmir", "himachal-pradesh", "haryana", "rajasthan", "chandigarh"],
  rajasthan: ["punjab", "haryana", "uttar-pradesh", "madhya-pradesh", "gujarat"],
  sikkim: ["west-bengal"],
  "tamil-nadu": ["andhra-pradesh", "karnataka", "kerala", "puducherry"],
  telangana: ["maharashtra", "chhattisgarh", "karnataka", "andhra-pradesh"],
  tripura: ["assam", "mizoram"],
  "uttar-pradesh": [
    "uttarakhand",
    "haryana",
    "delhi",
    "rajasthan",
    "madhya-pradesh",
    "chhattisgarh",
    "jharkhand",
    "bihar",
  ],
  uttarakhand: ["himachal-pradesh", "haryana", "uttar-pradesh"],
  "west-bengal": ["sikkim", "bihar", "jharkhand", "odisha", "assam"],
};

/**
 * The states bordering `state`, as canonical labels, or an empty list.
 *
 * Empty for the two island territories, which have no land border, and for
 * anything we do not hold — so a caller can render the section only when there
 * is something in it.
 */
export function neighbouringStates(state: string): string[] {
  return (NEIGHBOURS_BY_SLUG[stateSlug(state)] ?? [])
    .map((slug) => canonicalStateName(slug))
    .filter((name): name is string => Boolean(name));
}
