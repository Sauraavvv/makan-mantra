import { stateSlug } from "@/lib/state-routes";

type StateMapPoint = {
  lat: number;
  lng: number;
  zoomSpan?: number;
};

const STATE_MAP_POINTS: Record<string, StateMapPoint> = {
  "andhra-pradesh": { lat: 16.51, lng: 80.52 },
  "arunachal-pradesh": { lat: 27.06, lng: 93.37 },
  assam: { lat: 26.14, lng: 91.77 },
  bihar: { lat: 25.4, lng: 85.1 },
  chandigarh: { lat: 30.7333, lng: 76.7794, zoomSpan: 0.8 },
  chhattisgarh: { lat: 21.25, lng: 81.6 },
  delhi: { lat: 28.6139, lng: 77.209, zoomSpan: 0.8 },
  goa: { lat: 15.5, lng: 73.83, zoomSpan: 0.8 },
  gujarat: { lat: 23.22, lng: 72.655 },
  haryana: { lat: 30.73, lng: 76.78 },
  "himachal-pradesh": { lat: 31.1033, lng: 77.1722 },
  "jammu-kashmir": { lat: 33.7782, lng: 76.5762 },
  jharkhand: { lat: 23.35, lng: 85.33 },
  karnataka: { lat: 12.97, lng: 77.5 },
  kerala: { lat: 10, lng: 76.3 },
  "madhya-pradesh": { lat: 23.2599, lng: 77.4126 },
  maharashtra: { lat: 18.97, lng: 72.82 },
  manipur: { lat: 24.81, lng: 93.94 },
  meghalaya: { lat: 25.57, lng: 91.88 },
  mizoram: { lat: 23.36, lng: 92.8 },
  nagaland: { lat: 25.67, lng: 94.12 },
  odisha: { lat: 20.27, lng: 85.82 },
  punjab: { lat: 30.79, lng: 75.84 },
  rajasthan: { lat: 26.6, lng: 73.8 },
  sikkim: { lat: 27.533, lng: 88.5122, zoomSpan: 1.2 },
  "tamil-nadu": { lat: 11, lng: 79 },
  telangana: { lat: 17.9, lng: 79.3 },
  tripura: { lat: 23.84, lng: 91.28, zoomSpan: 1.2 },
  "uttar-pradesh": { lat: 26.85, lng: 80.91 },
  uttarakhand: { lat: 30.33, lng: 78.06 },
  "west-bengal": { lat: 22.57, lng: 88.37 },
};

export function getStateMapPoint(state: string) {
  return STATE_MAP_POINTS[stateSlug(state)] ?? null;
}
