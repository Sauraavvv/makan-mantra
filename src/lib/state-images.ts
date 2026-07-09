import { stateSlug } from "@/lib/state-routes";

const STATE_IMAGE_BY_SLUG: Record<string, string> = {
  "andaman-and-nicobar-islands": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=100",
  delhi: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=1600&auto=format&fit=crop&q=100",
  maharashtra: "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=1600&auto=format&fit=crop&q=100",
  karnataka: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=1600&auto=format&fit=crop&q=100",
  telangana: "/hero-home.jpg",
  haryana: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&auto=format&fit=crop&q=100",
  "west-bengal": "https://images.unsplash.com/photo-1558431382-27e303142255?w=1600&auto=format&fit=crop&q=100",
  goa: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1600&auto=format&fit=crop&q=100",
  gujarat: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=1600&auto=format&fit=crop&q=100",
  "tamil-nadu": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1600&auto=format&fit=crop&q=100",
  "uttar-pradesh": "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1600&auto=format&fit=crop&q=100",
  rajasthan: "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?w=1600&auto=format&fit=crop&q=100",
  kerala: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1600&auto=format&fit=crop&q=100",
  punjab: "https://images.unsplash.com/photo-1609947017136-9daf32a5eb16?w=1600&auto=format&fit=crop&q=100",
  chandigarh: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&auto=format&fit=crop&q=100",
  ladakh: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1600&auto=format&fit=crop&q=100",
  lakshadweep: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=100",
  puducherry: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1600&auto=format&fit=crop&q=100",
  "madhya-pradesh": "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?w=1600&auto=format&fit=crop&q=100",
  "andhra-pradesh": "https://images.unsplash.com/photo-1627894483216-2138af692e32?w=1600&auto=format&fit=crop&q=100",
  "arunachal-pradesh": "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1600&auto=format&fit=crop&q=100",
  assam: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1600&auto=format&fit=crop&q=100",
  bihar: "https://images.unsplash.com/photo-1598091383021-15ddea10925d?w=1600&auto=format&fit=crop&q=100",
  chhattisgarh: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600&auto=format&fit=crop&q=100",
  "himachal-pradesh": "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1600&auto=format&fit=crop&q=100",
  jharkhand: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=1600&auto=format&fit=crop&q=100",
  "jammu-and-kashmir": "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1600&auto=format&fit=crop&q=100",
  "jammu-kashmir": "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1600&auto=format&fit=crop&q=100",
  manipur: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600&auto=format&fit=crop&q=100",
  meghalaya: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1600&auto=format&fit=crop&q=100",
  mizoram: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600&auto=format&fit=crop&q=100",
  nagaland: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600&auto=format&fit=crop&q=100",
  odisha: "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=1600&auto=format&fit=crop&q=100",
  sikkim: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1600&auto=format&fit=crop&q=100",
  tripura: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600&auto=format&fit=crop&q=100",
  uttarakhand: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1600&auto=format&fit=crop&q=100",
};

export function stateCardImage(state: string) {
  return STATE_IMAGE_BY_SLUG[stateSlug(state)] || "/hero-home.jpg";
}
