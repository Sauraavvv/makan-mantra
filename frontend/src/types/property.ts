export type ListingType = "buy" | "rent" | "pg";
export type PropertyType = "flat" | "plot" | "office_space" | "builder_floor" | "showroom_shop" | "villa" | "pg";
export type FurnishingStatus = "unfurnished" | "semi-furnished" | "fully-furnished";

export interface Property {
  id: string;
  title: string;
  slug: string;
  listing_type: ListingType;
  property_type: PropertyType;
  status: "active" | "sold" | "rented" | "inactive";
  price: {
    amount: number;
    display: string;
    negotiable: boolean;
    per_sqft?: number;
  };
  details: {
    bedrooms?: number;
    bathrooms?: number;
    area_sqft: number;
    floor?: number;
    total_floors?: number;
    furnishing?: FurnishingStatus;
  };
  location: {
    location_id: string;
    name: string;
    city: string;
    state: string;
    coordinates: { latitude: number; longitude: number };
  };
  images: { url: string; is_primary: boolean }[];
  posted_at: string;
  updated_at: string;
}
