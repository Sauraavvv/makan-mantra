const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const IMAGE_FALLBACK = "/news/new-chandigarh-investment.jpg";

export type NewsSection = {
  heading: string;
  description: string;
};

export type NewsArticle = {
  id?: string;
  slug: string;
  title: string;
  description: string;
  hook: string;
  content: NewsSection[];
  conclusion: string;
  category: string;
  image: string;
  imageAlt: string;
  imageWidth?: number;
  imageHeight?: number;
  featuredImageUrl?: string;
  publishedAt: string;
  updatedAt: string;
  location: string;
  tags: string[];
  keywords: string[];
  isBreaking?: boolean;
  isFeatured?: boolean;
  author?: {
    name: string;
    avatarUrl?: string;
  };
  body?: string[];
  highlights: Array<{ label: string; value: string }>;
};

type StoredNewsArticle = {
  id?: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  tags?: string[];
  author?: { name?: string; avatarUrl?: string };
  featuredImage: {
    url: string;
    altText: string;
    width?: number;
    height?: number;
  };
  publishedAt: string;
  updatedAt: string;
  status: string;
};

/** Location is not currently part of the CMS schema, so this preserves the precise label for existing content. */
const ARTICLE_LOCATIONS: Record<string, string> = {
  "birla-estates-navi-mumbai-vashi-redevelopment-2600-crore": "Vashi, Navi Mumbai",
};

function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function toNewsArticle(stored: StoredNewsArticle): NewsArticle {
  const storedImage = (
    stored.featuredImage.url.startsWith("/")
    || stored.featuredImage.url.startsWith("https://res.cloudinary.com/")
  )
    ? stored.featuredImage.url
    : undefined;
  const tags = stored.tags || [];

  return {
    id: stored.id,
    slug: stored.slug,
    title: stored.title,
    description: stored.summary,
    hook: stored.summary,
    content: [],
    body: stored.content.split(/\n\s*\n/).filter(Boolean),
    conclusion: "",
    category: titleCase(stored.category),
    image: storedImage || IMAGE_FALLBACK,
    imageAlt: stored.featuredImage.altText,
    imageWidth: stored.featuredImage.width,
    imageHeight: stored.featuredImage.height,
    featuredImageUrl: stored.featuredImage.url,
    publishedAt: stored.publishedAt,
    updatedAt: stored.updatedAt,
    location: ARTICLE_LOCATIONS[stored.slug] || tags[0] || "India",
    tags,
    keywords: tags,
    author: {
      name: stored.author?.name || "Makan Mantraa News Desk",
      avatarUrl: stored.author?.avatarUrl || undefined,
    },
    isBreaking: true,
    isFeatured: true,
    highlights: [],
  };
}

export function articleMatchesSearch(article: NewsArticle, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  return [
    article.title,
    article.description,
    article.category,
    article.location,
    ...article.tags,
    ...article.keywords,
    ...(article.body || []),
  ].join(" ").toLowerCase().includes(needle);
}

/** The news UI is database-driven. No legacy static articles are merged here. */
export async function fetchNewsArticles(search?: string): Promise<NewsArticle[]> {
  try {
    const params = new URLSearchParams();
    if (search?.trim()) params.set("search", search.trim());
    const response = await fetch(`${API}/news/${params.size ? `?${params}` : ""}`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return [];

    const stored = (await response.json()) as StoredNewsArticle[];
    const articles = stored.map(toNewsArticle);
    return search ? articles.filter((article) => articleMatchesSearch(article, search)) : articles;
  } catch {
    return [];
  }
}

export async function fetchNewsArticleBySlug(slug: string): Promise<NewsArticle | undefined> {
  try {
    const response = await fetch(`${API}/news/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (response.ok) return toNewsArticle((await response.json()) as StoredNewsArticle);
  } catch {
    // The article page should not fall back to stale static content.
  }

  return undefined;
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
  const body = [article.description, article.hook, article.conclusion, ...(article.body || []), ...article.content.flatMap((section) => [section.heading, section.description])].join(" ");
  return Math.max(1, Math.round(body.trim().split(/\s+/).length / 200));
}
