export type LocationCategory = "state" | "district" | "city" | "town" | "locality" | "sub_locality" | "village";

export interface Location {
  id: string;
  name: string;
  slug: string;
  slug_id: string;
  location_category: LocationCategory;
  country: string;
  state: string | null;
  district: string | null;
  city: string | null;
  town: string | null;
  locality: string | null;
  sub_locality: string | null;
  village: string | null;
  coordinates: { latitude: number; longitude: number } | null;
}

export interface LocationPage {
  id: string;
  slug: string;
  slug_id: string;
  location_category: LocationCategory;
  location_name: string;
  property_type: string;
  listing_type: string;
  location: Location;
  seo: {
    meta_title: string;
    meta_description: string;
    on_page_title: string;
    on_page_description: string;
    tags: string[];
    keywords: string[];
  };
}
