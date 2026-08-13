const heroImage = "/news/new-chandigarh-investment.jpg";
const relatedOneImage = "/news/mohali-luxury-towers.jpg";
const relatedTwoImage = "/news/north-india-offices.jpg";
const relatedThreeImage = "/news/plotted-development.jpg";

export type NewsSection = {
  heading: string;
  description: string;
};

export type NewsArticle = {
  slug: string;
  title: string;
  description: string;
  hook: string;
  content: NewsSection[];
  conclusion: string;
  category: string;
  image: string;
  imageAlt: string;
  publishedAt: string;
  updatedAt: string;
  location: string;
  tags: string[];
  keywords: string[];
  isBreaking?: boolean;
  isFeatured?: boolean;
  highlights: Array<{ label: string; value: string }>;
};

export const featuredArticle: NewsArticle = {
  slug: "gb-realty-10000-crore-new-chandigarh",
  title: "GB Realty Plans ₹10,000 Crore Real Estate Investment in New Chandigarh",
  description:
    "The developer will deploy ₹5,000 crore in the first three years, anchoring a decade-long pipeline of luxury residences, plotted townships and commercial assets in the Tricity's fastest-growing corridor.",
  hook:
    "New Chandigarh is fast becoming North India's most closely watched growth corridor — and a single ₹10,000 crore commitment could reset pricing, supply and buyer expectations across the entire Tricity market.",
  content: [
    {
      heading: "₹10,000 Crore Development Pipeline for New Chandigarh",
      description:
        "GB Realty has outlined a ten-year capital plan exceeding ₹10,000 crore, making it one of the largest single-developer commitments in the region to date. The pipeline spans roughly 200 acres of contiguous and adjacent land parcels, with master planning weighted towards low-density residential formats, walkable retail high streets and Grade-A office space. Management indicated that the phasing is deliberately conservative, tying each release to absorption rather than to a fixed construction calendar.",
    },
    {
      heading: "₹5,000 Crore Deployment During the First Three Years",
      description:
        "Half of the total outlay — approximately ₹5,000 crore — is earmarked for the first three years. This front-loaded spend covers land aggregation already concluded, trunk infrastructure, and the vertical construction of the first two residential phases. Funding is structured through a mix of internal accruals, construction finance and a minority institutional partner, reducing reliance on customer advances during the early build-out.",
    },
    {
      heading: "₹3,500 Crore Committed to Luxury and Ultra-Luxury Housing",
      description:
        "Within the near-term deployment, ₹3,500 crore is directed at luxury and ultra-luxury housing. The first tranche comprises 688 premium residences across mid-rise and tower formats, with configurations ranging from three-bedroom apartments to full-floor penthouses. Specifications include double-height lobbies, biophilic landscaping and a clubhouse programme benchmarked against Gurugram's Golf Course Road inventory.",
    },
    {
      heading: "Pricing, Absorption and Early Market Response",
      description:
        "Average realisations are pegged near ₹12,250 per square foot, positioning the project at a premium to prevailing New Chandigarh rates but at a discount to comparable Delhi-NCR luxury stock. More than 35% of launched inventory has been booked ahead of the formal marketing campaign, largely through NRI channels and Tricity end-users upgrading from older Panchkula and Mohali stock.",
    },
    {
      heading: "Expansion Into Adjacent Real Estate Segments",
      description:
        "Beyond housing, the developer is preparing entries into serviced plotted development, managed rental housing and a small logistics footprint along the Chandigarh–Baddi corridor. Each vertical is intended to smooth cash flows across cycles and to reduce dependence on a single asset class — a shift several mid-sized North Indian developers have adopted since 2023.",
    },
  ],
  conclusion:
    "If executed on schedule, the commitment would materially deepen New Chandigarh's premium supply and accelerate its transition from a peripheral extension to a self-contained urban centre. For buyers and investors, the practical signal is timing: pricing power typically sits with early phases, while infrastructure delivery risk declines sharply once trunk services are commissioned.",
  category: "Luxury Real Estate Investment",
  image: heroImage,
  imageAlt: "Aerial view of premium residential towers under construction along a landscaped boulevard in New Chandigarh at sunrise",
  publishedAt: "2026-08-11T06:30:00.000Z",
  updatedAt: "2026-08-12T04:45:00.000Z",
  location: "New Chandigarh, Punjab",
  tags: ["Investment", "Luxury Housing", "Punjab", "Developer News", "Market Trends"],
  keywords: [
    "New Chandigarh",
    "GB Realty",
    "Luxury Housing",
    "Real Estate Investment",
    "Tricity Property Market",
    "Premium Residences",
  ],
  isBreaking: true,
  isFeatured: true,
  highlights: [
    { label: "Total planned investment", value: "₹10,000+ crore" },
    { label: "Deployment in first 3 years", value: "₹5,000 crore" },
    { label: "Luxury & ultra-luxury housing", value: "₹3,500 crore" },
    { label: "Premium residences planned", value: "688 units" },
    { label: "Inventory already booked", value: "35%+" },
    { label: "Average pricing", value: "≈ ₹12,250 / sq.ft" },
    { label: "New segments", value: "Plotted, rental & logistics" },
  ],
};

export const relatedArticles: NewsArticle[] = [
  {
    slug: "mohali-luxury-tower-launch",
    title: "Mohali Sees Record Launch of 1,200 Luxury Apartments This Quarter",
    description:
      "Developers are betting on upgrade demand as premium inventory absorption hits a four-year high across the Tricity.",
    hook: "Demand for larger, lifestyle-led homes is reshaping launch plans across Mohali's established micro-markets.",
    content: [],
    conclusion: "The quarter points to sustained demand for well-located premium homes.",
    category: "Residential Market",
    image: relatedOneImage,
    imageAlt: "Luxury apartment tower lit at dusk",
    publishedAt: "2026-08-09T05:00:00.000Z",
    updatedAt: "2026-08-09T05:00:00.000Z",
    location: "Mohali, Punjab",
    tags: ["Mohali", "Luxury homes"],
    keywords: ["Mohali", "Apartments"],
    highlights: [],
  },
  {
    slug: "grade-a-office-absorption-north-india",
    title: "Grade-A Office Absorption in North India Climbs 18% Year on Year",
    description:
      "GCC expansion and flexible-space operators drive leasing momentum well beyond traditional metro markets.",
    hook: "Office demand continues to spread beyond its traditional centres.",
    content: [],
    conclusion: "Leasing momentum is improving across North India.",
    category: "Commercial Real Estate",
    image: relatedTwoImage,
    imageAlt: "Modern commercial office park with landscaped plaza",
    publishedAt: "2026-08-06T11:20:00.000Z",
    updatedAt: "2026-08-06T11:20:00.000Z",
    location: "Gurugram, Haryana",
    tags: ["Commercial", "Office"],
    keywords: ["Office space", "Gurugram"],
    highlights: [],
  },
  {
    slug: "plotted-development-demand-surge",
    title: "Plotted Developments Return as the Preferred Bet for Long-Term Investors",
    description:
      "Low carrying costs and faster approvals push gated plotted townships back into the spotlight.",
    hook: "Investors are again considering plotted communities for their flexibility and long-term value.",
    content: [],
    conclusion: "Plotted development is returning to investors' shortlists.",
    category: "Investment Trends",
    image: relatedThreeImage,
    imageAlt: "Aerial view of a gated villa community with palm-lined streets",
    publishedAt: "2026-08-02T07:45:00.000Z",
    updatedAt: "2026-08-02T07:45:00.000Z",
    location: "Zirakpur, Punjab",
    tags: ["Plots", "Investment"],
    keywords: ["Plots", "Investment"],
    highlights: [],
  },
];

export const allArticles = [featuredArticle, ...relatedArticles];

export function getArticleBySlug(slug: string) {
  return allArticles.find((article) => article.slug === slug);
}

export function formatNewsDate(iso: string, withTime = false) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: withTime ? "short" : "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(iso));
}

export function getReadingTime(article: NewsArticle) {
  const body = [article.description, article.hook, article.conclusion, ...article.content.flatMap((section) => [section.heading, section.description])].join(" ");
  return Math.max(1, Math.round(body.trim().split(/\s+/).length / 200));
}
