import { apiFetch } from "./client";

export function getProperties(slug: string, page = 1) {
  return apiFetch(`/properties?location_slug=${slug}&page=${page}`);
}
