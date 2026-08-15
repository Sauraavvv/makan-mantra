import Link from "next/link";
import { ArrowRight, ChevronRight, Home } from "lucide-react";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { NewsCard } from "@/components/news/news-card";
import { NewsSearch } from "@/components/news/news-search";
import { fetchNewsArticles } from "@/lib/news";

export const metadata = {
  title: "Real Estate News & Insights | Makan Mantraa",
  description: "Market news, investment insights and the latest updates from Indian real estate.",
};

type BlogPageProps = {
  searchParams: Promise<{ search?: string; category?: string }>;
};

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { search = "", category = "" } = await searchParams;
  const query = search.trim();
  const selectedCategory = category.trim().toLowerCase();
  const matchingArticles = await fetchNewsArticles(query || undefined);
  const results = selectedCategory
    ? matchingArticles.filter((article) => article.category.toLowerCase() === selectedCategory)
    : matchingArticles;
  const articlesByCategory = results.reduce<Map<string, typeof results>>((groups, article) => {
    const category = article.category || "Latest news";
    groups.set(category, [...(groups.get(category) || []), article]);
    return groups;
  }, new Map());

  return (
    <div className="min-h-screen bg-white text-foreground">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/" className="inline-flex items-center gap-1 transition-colors hover:text-foreground"><Home className="size-3.5" aria-hidden="true" />Home</Link>
          <ChevronRight className="size-4 text-muted-foreground/70" aria-hidden="true" />
          <span className="font-medium text-foreground">News</span>
        </nav>

        <section className="mx-auto max-w-3xl py-10 text-center sm:py-14" aria-labelledby="news-heading">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#bb432a]">Latest updates and market stories</p>
          <h1 id="news-heading" className="mt-2 font-serif text-4xl font-bold tracking-[-0.025em] text-[#202020] sm:text-5xl">Makan Mantraa News</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Stay informed with the latest real estate news, market trends, and expert insights curated for home buyers, investors, and property enthusiasts.
          </p>
          <NewsSearch initialQuery={search} className="mx-auto mt-6 max-w-[560px] text-left" />
        </section>

        <section className="pb-2" aria-labelledby="news-results">
          <div className="text-center">
            <h2 id="news-results" className="font-serif text-2xl font-bold text-[#242424] sm:text-3xl">{query ? `Search results for “${query}”` : selectedCategory ? `${category} news` : "Latest stories by category"}</h2>
            <span className="mx-auto mt-3 block h-0.5 w-8 bg-[#bb432a]" aria-hidden="true" />
          </div>
          {results.length > 0 ? (
            <div className="mt-9 space-y-10">
              {Array.from(articlesByCategory.entries()).map(([category, articles], categoryIndex) => (
                <section key={category} aria-labelledby={`category-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                  <div className="flex items-end justify-between gap-4 border-b border-stone-300 pb-2">
                    <div>
                      <h3 id={`category-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} className="font-serif text-2xl font-bold leading-none text-[#242424]">{category}</h3>
                      <span className="mt-2 block h-0.5 w-7 bg-[#bb432a]" aria-hidden="true" />
                    </div>
                    {!selectedCategory && <Link href={`/blog?category=${encodeURIComponent(category)}`} className="inline-flex items-center gap-1 pb-0.5 text-[11px] font-bold text-stone-700 transition-colors hover:text-[#bb432a]">View all <ArrowRight className="size-3" aria-hidden="true" /></Link>}
                  </div>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    {(query || selectedCategory ? articles : articles.slice(0, 4)).map((article, index) => <NewsCard key={article.slug} article={article} editorial priority={categoryIndex === 0 && index < 2} />)}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-border bg-secondary px-6 py-12 text-center">
              <p className="font-semibold text-foreground">No news matched “{query}”.</p>
              <Link href="/blog" className="mt-2 inline-block text-sm font-medium text-saffron hover:underline">View all news</Link>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
