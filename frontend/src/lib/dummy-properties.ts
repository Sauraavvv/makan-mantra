export type DummyProperty = {
  id: string;
  image: string;
  photos: number;
  hasVideo: boolean;
  title: string;
  locality: string;
  price: string;
  config: string;
  area: string;
  areaType: string;
  additionalSpaces: string;
  possession: string;
  parking: string;
  furnishing: string;
  description: string;
  agent: { name: string; pro: boolean };
};

/**
 * Placeholder listings. Property data is not wired up yet, so the location
 * pages cycle through these three to show the real layout.
 */
const TEMPLATES: Omit<DummyProperty, "id">[] = [
  {
    image: "/hero-home.jpg",
    photos: 10,
    hasVideo: true,
    title: "4 BHK Builder Floor for Sale",
    locality: "Pitampura",
    price: "₹ 2.6 Cr",
    config: "4 BHK + 2 Bath",
    area: "1550 Sq.Ft.",
    areaType: "Built-up Area",
    additionalSpaces: "Store Room",
    possession: "Ready To Move",
    parking: "2 Covered + 2 Open",
    furnishing: "Furnished",
    description:
      "A bright and airy furnished builder floor is now available for purchase at 2.6 crore, boasting a spacious 1550 square feet of living area. This home offers a peaceful garden view, wide balconies and a covered parking bay right at the entrance.",
    agent: { name: "Shammi Kapur", pro: true },
  },
  {
    image: "/hero-home.jpg",
    photos: 18,
    hasVideo: false,
    title: "3 BHK Apartment for Sale",
    locality: "Sarjapur Road",
    price: "₹ 1.45 Cr",
    config: "3 BHK + 3 Bath",
    area: "2450 Sq.Ft.",
    areaType: "Super Built-up Area",
    additionalSpaces: "Servant Room",
    possession: "Under Construction",
    parking: "2 Covered",
    furnishing: "Unfurnished",
    description:
      "A well planned three bedroom apartment in a gated development with round the clock security, a clubhouse and landscaped gardens. The tower is scheduled for possession next year and sits close to the main arterial road.",
    agent: { name: "Anita Rao", pro: false },
  },
  {
    image: "/hero-home.jpg",
    photos: 15,
    hasVideo: true,
    title: "2 BHK Apartment for Sale",
    locality: "Electronic City",
    price: "₹ 52 L",
    config: "2 BHK + 2 Bath",
    area: "1000 Sq.Ft.",
    areaType: "Carpet Area",
    additionalSpaces: "Study Room",
    possession: "Ready To Move",
    parking: "1 Covered",
    furnishing: "Fully Furnished",
    description:
      "Compact and efficiently laid out two bedroom home on a high floor with an open kitchen and a wide living balcony. Walking distance from the tech park, with schools and a hospital within a two kilometre radius.",
    agent: { name: "Rahul Menon", pro: true },
  },
];

export function makeDummyProperties(from: number, count: number): DummyProperty[] {
  return Array.from({ length: count }, (_, i) => {
    const index = from + i;
    return { ...TEMPLATES[index % TEMPLATES.length], id: `dummy-${index}` };
  });
}

export const DUMMY_PAGE_SIZE = 6;
