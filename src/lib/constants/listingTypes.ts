export const LISTING_TYPES = {
  buy: "Buy",
  rent: "Rent",
  pg: "PG",
} as const;

export type ListingType = keyof typeof LISTING_TYPES;
