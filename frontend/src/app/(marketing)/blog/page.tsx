import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
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
  searchParams: Promise<{ search?: string }>;
};

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { search = "" } = await searchParams;
  const query = search.trim();
  const [allArticles, results] = await Promise.all([
    fetchNewsArticles(),
    fetchNewsArticles(query || undefined),
  ]);

  return (
    <div className="min-h-screen bg-white text-foreground">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/" className="inline-flex items-center gap-1 transition-colors hover:text-foreground"><Home className="size-3.5" aria-hidden="true" />Home</Link>
          <ChevronRight className="size-4 text-muted-foreground/70" aria-hidden="true" />
          <span className="font-medium text-foreground">News</span>
        </nav>

        <section className="mx-auto max-w-3xl py-12 text-center sm:py-16" aria-labelledby="news-heading">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-foreground">Latest updates and market stories</p>
          <h1 id="news-heading" className="mt-2 text-4xl font-extrabold tracking-tight text-saffron sm:text-5xl">Makan Mantraa News</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Stay informed with the latest real estate news, market trends, and expert insights curated for home buyers, investors, and property enthusiasts.
          </p>
          <NewsSearch initialQuery={search} className="mx-auto mt-6 max-w-md text-left" />
        </section>

        <section className="pb-2" aria-labelledby="news-results">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="border-l-4 border-saffron pl-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">Makan Mantraa news results</p>
              <h2 id="news-results" className="mt-1 text-lg font-bold">{results.length} results found{query ? ` for “${query}”` : ""}</h2>
            </div>
            <p className="text-sm text-muted-foreground">Showing {results.length} of {allArticles.length}</p>
          </div>
          {results.length > 0 ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {results.map((article, index) => <NewsCard key={article.slug} article={article} priority={index < 2} />)}
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
