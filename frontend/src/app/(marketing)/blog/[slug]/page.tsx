import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Clock3, Home, MapPin, Tag } from "lucide-react";
import { ArticleActions } from "@/components/news/article-actions";
import { ArticleComments, NewsCommentForm } from "@/components/news/article-comments";
import { NewsCard } from "@/components/news/news-card";
import { NewsSearch } from "@/components/news/news-search";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { fetchNewsArticleBySlug, fetchNewsArticles, formatNewsDate, getReadingTime } from "@/lib/news";

type PageProps = { params: Promise<{ slug: string }> };

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchNewsArticleBySlug(slug);

  if (!article) return {};

  return {
    title: `${article.title} | Makan Mantraa News`,
    description: article.description,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const article = await fetchNewsArticleBySlug(slug);
  if (!article) notFound();

  const paragraphs = article.body?.length
    ? article.body
    : [article.hook, ...article.content.map((section) => section.description), article.conclusion].filter(Boolean);
  const otherNews = (await fetchNewsArticles()).filter((item) => item.slug !== article.slug);
  const moreFromCategory = otherNews.filter((item) => item.category === article.category).slice(0, 4);
  const recentPosts = otherNews.slice(0, 4);
  const related = otherNews.slice(0, 3);
  const author = article.author?.name || "Makan Mantraa News Desk";

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1b1b1b]">
      <Header />
      <NewsMasthead />

      <main className="mx-auto max-w-[1220px] px-4 pb-16 pt-5 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-xs text-stone-500">
          <Link href="/" className="inline-flex shrink-0 items-center gap-1 hover:text-[#b53a22]"><Home className="size-3" aria-hidden="true" />Home</Link>
          <ChevronRight className="size-3.5 text-stone-300" aria-hidden="true" />
          <Link href="/blog" className="shrink-0 hover:text-[#b53a22]">Real Estate News</Link>
          <ChevronRight className="size-3.5 text-stone-300" aria-hidden="true" />
          <Link href="/blog" className="shrink-0 hover:text-[#b53a22]">{article.category}</Link>
          <ChevronRight className="size-3.5 shrink-0 text-stone-300" aria-hidden="true" />
          <span aria-current="page" className="min-w-0 truncate font-medium text-stone-700" title={article.title}>{article.title}</span>
        </nav>

        <article className="mt-6">
          <header className="border-b-2 border-[#242424] pb-6">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-bold uppercase tracking-[0.14em]">
              <span className="bg-[#bb432a] px-2.5 py-1 text-white">{article.category}</span>
              <span className="text-stone-500">Real Estate · {article.location}</span>
            </div>

            <h1 className="mt-4 max-w-[960px] text-[2rem] font-bold leading-[1.1] tracking-[-0.035em] text-[#181818] sm:text-4xl lg:text-[3.25rem]">
              {article.title}
            </h1>
            <p className="mt-4 max-w-[820px] font-serif text-base leading-relaxed text-stone-600 sm:text-lg">
              {article.description}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-stone-300 pt-4">
              <div className="flex items-center gap-3 text-sm text-stone-600">
                <div className="grid size-9 place-items-center rounded-full bg-[#202b3b] font-serif text-lg font-bold text-white">M</div>
                <div>
                  <p className="font-semibold text-stone-900">By {author}</p>
                  <p className="mt-0.5 text-xs">Published {formatNewsDate(article.publishedAt, true)} · Updated {formatNewsDate(article.updatedAt, true)}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-stone-500">
                <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5 text-[#bb432a]" aria-hidden="true" />{article.location}</span>
                <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5 text-[#bb432a]" aria-hidden="true" />{getReadingTime(article)} min read</span>
                <ArticleActions compact articleSlug={article.slug} />
              </div>
            </div>
          </header>

          <div className="mt-7 grid gap-10 xl:grid-cols-[56px_minmax(0,720px)_minmax(250px,1fr)]">
            <aside className="hidden xl:block">
              <div className="sticky top-28"><ArticleActions articleSlug={article.slug} /></div>
            </aside>

            <div className="min-w-0">
              <figure className="overflow-hidden bg-[#d9d2ca]">
                <Image
                  src={article.image}
                  alt={article.imageAlt}
                  width={article.imageWidth || 1600}
                  height={article.imageHeight || 1067}
                  priority
                  className="h-auto w-full"
                  sizes="(max-width: 1280px) 100vw, 720px"
                />
                <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-300 bg-white px-3 py-2 text-xs text-stone-500 sm:px-4">
                  <span>{article.imageAlt}</span>
                  <span className="shrink-0 font-medium text-stone-600">Makan Mantraa</span>
                </figcaption>
              </figure>

              <p className="mt-8 border-l-4 border-[#bb432a] bg-[#f0e8e0] px-5 py-4 font-serif text-base leading-relaxed text-stone-800">
                <span className="font-bold">The big picture: </span>{article.hook}
              </p>

              <div className="mt-7 space-y-6 font-serif text-[1.05rem] leading-[1.72] text-[#292929] sm:text-lg">
                {paragraphs.map((paragraph, index) => (
                  <p key={`${article.slug}-${index}`} className={index === 0 ? "text-[1.13rem] leading-[1.65] sm:text-xl" : undefined}>{paragraph}</p>
                ))}
              </div>

              <section className="mt-10 border-b-2 border-t border-b-[#242424] border-t-stone-300 py-5" aria-labelledby="tags-heading">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                  <h2 id="tags-heading" className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.14em] text-stone-500"><Tag className="size-4" aria-hidden="true" />Tags:</h2>
                  <ul className="flex flex-wrap gap-2.5">
                    {article.tags.map((tag) => <li key={tag}><Link href="/blog" className="inline-flex border border-[#242424] bg-white px-3.5 py-1.5 text-sm font-medium uppercase tracking-[0.06em] text-[#242424] transition-colors hover:border-[#bb432a] hover:bg-[#bb432a] hover:text-white">{tag}</Link></li>)}
                  </ul>
                </div>
              </section>
            </div>

            <aside className="space-y-8 border-t border-stone-300 pt-6 xl:sticky xl:top-24 xl:self-start xl:border-l xl:border-t-0 xl:pl-7 xl:pt-0">
              {moreFromCategory.length > 0 && <section aria-labelledby="more-category-news" className="border-t-2 border-[#242424] pt-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 id="more-category-news" className="font-serif text-2xl font-bold">More from {article.category}</h2>
                  <Link href={`/blog?category=${encodeURIComponent(article.category)}`} className="text-xs font-bold uppercase tracking-wider text-[#b53a22] hover:underline">View all</Link>
                </div>
                <ol className="mt-3 divide-y divide-stone-300">
                  {moreFromCategory.map((item) => (
                    <li key={item.slug} className="py-4 first:pt-1">
                      <Link href={`/blog/${item.slug}`} className="group block">
                        <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">{item.category}</span>
                        <span className="mt-1.5 block text-[0.98rem] font-semibold leading-[1.35] tracking-[-0.01em] text-stone-900 transition-colors group-hover:text-[#b53a22]">{item.title}</span>
                        <time className="mt-2 block text-[11px] text-stone-500">{formatNewsDate(item.publishedAt)}</time>
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>}
              <section aria-labelledby="recent-posts" className="border-t-2 border-[#242424] pt-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 id="recent-posts" className="font-serif text-2xl font-bold">Recent posts</h2>
                  <Link href="/blog" className="text-xs font-bold uppercase tracking-wider text-[#b53a22] hover:underline">All news</Link>
                </div>
                <ol className="mt-3 divide-y divide-stone-300">
                  {recentPosts.map((item) => (
                    <li key={item.slug} className="py-4 first:pt-1">
                      <Link href={`/blog/${item.slug}`} className="group block">
                        <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">{item.category}</span>
                        <span className="mt-1.5 block text-[0.98rem] font-semibold leading-[1.35] tracking-[-0.01em] text-stone-900 transition-colors group-hover:text-[#b53a22]">{item.title}</span>
                        <time className="mt-2 block text-[11px] text-stone-500">{formatNewsDate(item.publishedAt)}</time>
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
              <NewsCommentForm articleSlug={article.slug} />
            </aside>
          </div>
        </article>

        {related.length > 0 && (
          <section className="mt-14 border-t-4 border-[#242424] pt-4" aria-labelledby="more-news">
            <div className="flex items-end justify-between gap-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#bb432a]">Keep reading</p><h2 id="more-news" className="mt-1 font-serif text-3xl font-bold">More from Makan Mantraa News</h2></div>
              <Link href="/blog" className="hidden text-sm font-bold text-[#b53a22] hover:underline sm:block">Browse all news →</Link>
            </div>
            <div className="mt-5 grid gap-5 md:grid-cols-3">{related.map((item) => <NewsCard key={item.slug} article={item} monochrome clampTitle darkCategory />)}</div>
          </section>
        )}
      </main>
      <ArticleComments articleTitle={article.title} articleSlug={article.slug} />
      <Footer />
    </div>
  );
}

function NewsMasthead() {
  const currentDate = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  return (
    <section className="bg-white text-[#1d1d1d] shadow-sm">
      <div className="mx-auto max-w-[1220px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-9 items-center justify-between border-b border-stone-200 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
          <span className="hidden sm:inline">{currentDate}</span>
          <span className="sm:hidden">Real estate, decoded</span>
          <span className="flex items-center gap-1.5"><MapPin className="size-3 text-[#bb432a]" aria-hidden="true" />India Edition</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 py-4 sm:flex-nowrap">
          <Link href="/blog" className="shrink-0 leading-none"><span className="block text-[2rem] font-bold leading-[1.1] tracking-[-0.035em] sm:text-[2.45rem]">Makan Mantraa</span><span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.34em] text-stone-500">Real Estate Newsroom</span></Link>
          <NewsSearch className="order-3 w-full sm:order-2 sm:ml-auto sm:w-[290px]" />
        </div>
      </div>
    </section>
  );
}
