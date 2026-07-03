export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir",
];

export const POPULAR_AREAS: Record<string, string[]> = {
  Maharashtra: ["Bandra West, Mumbai", "Andheri East, Mumbai", "Kharadi, Pune", "Baner, Pune", "Hinjewadi, Pune"],
  Karnataka: ["Koramangala, Bangalore", "Whitefield, Bangalore", "HSR Layout, Bangalore", "Indiranagar, Bangalore", "Electronic City, Bangalore"],
  Delhi: ["Dwarka, Delhi", "Rohini, Delhi", "Saket, Delhi", "Lajpat Nagar, Delhi", "Vasant Kunj, Delhi"],
  Gujarat: ["Prahlad Nagar, Ahmedabad", "Satellite, Ahmedabad", "Vesu, Surat", "Adajan, Surat", "Race Course, Vadodara"],
  "Tamil Nadu": ["Anna Nagar, Chennai", "Velachery, Chennai", "Adyar, Chennai", "Perungudi, Chennai", "OMR, Chennai"],
  Telangana: ["Gachibowli, Hyderabad", "HITEC City, Hyderabad", "Kondapur, Hyderabad", "Banjara Hills, Hyderabad", "Jubilee Hills, Hyderabad"],
};

export type Property = {
  id: string;
  title: string;
  image: string;
  listing: "sale" | "rent";
  type: "Flat" | "Villa" | "Plot" | "Builder Floor" | "Office Space" | "Shop/Showroom";
  bhk: number;
  beds: number;
  baths: number;
  area: number;
  priceValue: number;
  priceLabel: string;
  city: string;
  locality: string;
  state: string;
  posted: string;
  featured?: boolean;
};

const CITIES: Record<string, string[]> = {
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik"],
  Karnataka: ["Bangalore", "Mysore", "Hubli", "Mangalore"],
  Delhi: ["Delhi", "New Delhi", "Noida", "Gurgaon"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem"],
  Telangana: ["Hyderabad", "Warangal", "Karimnagar"],
};

const LOCALITIES = ["Bandra West", "Andheri East", "Powai", "Kharadi", "Baner", "Hinjewadi", "Civil Lines", "Dharampeth", "College Road", "Gangapur Road", "Vashi", "Kalyani Nagar"];
const TYPES: Property["type"][] = ["Flat", "Villa", "Plot", "Builder Floor", "Office Space", "Shop/Showroom"];
const IMAGES = [
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&auto=format&fit=crop",
];

function seed(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function generateProperties(state: string, count: number): Property[] {
  const cities = CITIES[state] ?? ["City A", "City B"];
  return Array.from({ length: count }, (_, i) => {
    const s = seed(`${state}-${i}`);
    const bhk = (s % 3) + 2;
    const listing = i % 3 === 0 ? "rent" : "sale";
    const price = listing === "rent" ? 0.15 + ((s % 60) / 100) : 35 + (s % 160);
    const city = cities[s % cities.length];
    const locality = LOCALITIES[(s + i) % LOCALITIES.length];
    return {
      id: `${state.toLowerCase().replace(/\s+/g, "-")}-${i}-${s % 999}`,
      title: `${bhk} BHK ${TYPES[s % TYPES.length]} in ${locality}`,
      image: IMAGES[(s + i) % IMAGES.length],
      listing,
      type: TYPES[s % TYPES.length],
      bhk,
      beds: bhk,
      baths: Math.max(1, bhk - 1),
      area: 600 + (s % 1400),
      priceValue: price,
      priceLabel: listing === "rent" ? `₹${Math.round(price * 100)}K/mo` : price >= 100 ? `₹${(price / 100).toFixed(2)} Cr` : `₹${price} L`,
      city,
      locality,
      state,
      posted: `${(i % 7) + 1} days ago`,
      featured: i % 5 === 0,
    };
  });
}
