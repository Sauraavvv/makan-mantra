export const PROPERTY_TYPES = {
  flat: "Flat",
  plot: "Plot",
  office_space: "Office Space",
  builder_floor: "Builder Floor",
  showroom_shop: "Showroom / Shop",
  villa: "Villa",
  pg: "PG",
} as const;

export type PropertyType = keyof typeof PROPERTY_TYPES;
