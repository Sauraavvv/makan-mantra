import { makeDummyProperties } from "@/lib/dummy-properties";
import { generateProperties, INDIAN_STATES } from "@/lib/properties";

export type PropertySummary = {
  propertyId: string;
  title: string;
  price: string;
  locality: string;
  city: string;
  image: string;
  config?: string;
  area?: string;
};

function stateSlug(state: string) {
  return state.toLowerCase().replace(/\s+/g, "-");
}

export function resolvePropertySummary(propertyId: string): PropertySummary | null {
  const dummyMatch = /^dummy-(\d+)$/.exec(propertyId);
  if (dummyMatch) {
    const index = Number(dummyMatch[1]);
    const property = makeDummyProperties(index, 1)[0];
    return {
      propertyId,
      title: property.title,
      price: property.price,
      locality: property.locality,
      city: "",
      image: property.image,
      config: property.config,
      area: property.area,
    };
  }

  for (const state of INDIAN_STATES) {
    const prefix = `${stateSlug(state)}-`;
    if (!propertyId.startsWith(prefix)) continue;

    const index = Number(propertyId.slice(prefix.length).split("-")[0]);
    if (!Number.isInteger(index) || index < 0) return null;

    const property = generateProperties(state, index + 1)[index];
    if (!property || property.id !== propertyId) return null;

    return {
      propertyId,
      title: property.title,
      price: property.priceLabel,
      locality: property.locality,
      city: property.city,
      image: property.image,
      config: `${property.bhk} BHK + ${property.baths} Bath`,
      area: `${property.area} Sq.Ft.`,
    };
  }

  return null;
}
