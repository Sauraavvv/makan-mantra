const STATE_LABEL_BY_SLUG: Record<string, string> = {
  "andaman-and-nicobar-islands": "Andaman and Nicobar Islands",
  "andhra-pradesh": "Andhra Pradesh",
  "arunachal-pradesh": "Arunachal Pradesh",
  assam: "Assam",
  bihar: "Bihar",
  chandigarh: "Chandigarh",
  chhattisgarh: "Chhattisgarh",
  delhi: "Delhi",
  goa: "Goa",
  gujarat: "Gujarat",
  haryana: "Haryana",
  "himachal-pradesh": "Himachal Pradesh",
  "jammu-and-kashmir": "Jammu & Kashmir",
  "jammu-kashmir": "Jammu & Kashmir",
  jharkhand: "Jharkhand",
  karnataka: "Karnataka",
  kerala: "Kerala",
  ladakh: "Ladakh",
  lakshadweep: "Lakshadweep",
  "madhya-pradesh": "Madhya Pradesh",
  maharashtra: "Maharashtra",
  manipur: "Manipur",
  meghalaya: "Meghalaya",
  mizoram: "Mizoram",
  nagaland: "Nagaland",
  odisha: "Odisha",
  puducherry: "Puducherry",
  punjab: "Punjab",
  rajasthan: "Rajasthan",
  sikkim: "Sikkim",
  "tamil-nadu": "Tamil Nadu",
  telangana: "Telangana",
  tripura: "Tripura",
  "uttar-pradesh": "Uttar Pradesh",
  uttarakhand: "Uttarakhand",
  "west-bengal": "West Bengal",
};

export function stateSlug(state: string) {
  return state
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Returns the canonical state label for any spelling of a known state, else null. */
export function canonicalStateName(value: string) {
  return STATE_LABEL_BY_SLUG[stateSlug(value)] ?? null;
}

export function stateExploreHref(state: string) {
  return `/explore-${stateSlug(state)}`;
}

export function stateNameFromRouteSegment(segment: string) {
  const decoded = decodeURIComponent(segment);
  const slug = decoded.replace(/^explore-/, "");

  return STATE_LABEL_BY_SLUG[slug] ?? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
