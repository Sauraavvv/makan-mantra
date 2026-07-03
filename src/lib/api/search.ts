import { apiFetch } from "./client";

export function searchProperties(query: string) {
  return apiFetch(`/search?q=${encodeURIComponent(query)}`);
}
