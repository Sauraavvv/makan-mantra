import { apiFetch } from "./client";
import { LocationPage } from "@/types/location";

export function getLocationPage(slug: string) {
  return apiFetch<LocationPage>(`/location-pages/${slug}`);
}
