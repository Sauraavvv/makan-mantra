import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Home,
} from "lucide-react";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { NewsCard } from "@/components/news/news-card";
import { allArticles, formatNewsDate, getArticleBySlug, getReadingTime, relatedArticles } from "@/lib/news";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return allArticles.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};

  return { title: `${article.title} | Makan Mantraa`, description: article.description };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const hasLongFormContent = article.content.length > 0;
  const related = relatedArticles.filter((item) => item.slug !== article.slug);

  return (
    <div className="min-h-screen bg-white text-foreground">
      <Header />
      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <ol className="flex items-center gap-1.5">
            <li className="flex shrink-0 items-center gap-1.5"><Link href="/" className="flex items-center gap-1 hover:text-foreground"><Home className="size-3.5" aria-hidden="true" />Home</Link><ChevronRight className="size-3.5 opacity-50" /></li>
            <li className="flex items-center gap-1.5"><Link href="/blog" className="hover:text-foreground">News</Link><ChevronRight className="size-3.5 opacity-50" /></li>
            <li className="flex min-w-0 items-center gap-1.5"><span className="max-w-28 truncate sm:max-w-56">{article.category}</span><ChevronRight className="size-3.5 shrink-0 opacity-50" /></li>
            <li aria-current="page" className="min-w-0 truncate font-medium text-foreground">{article.title}</li>
          </ol>
        </nav>

        <article className="pt-8">
          <ul className="flex flex-wrap gap-2" aria-label="Article topics">
            {article.keywords.map((keyword) => <li key={keyword}><Link href="/blog" className="inline-block rounded-full border border-saffron/40 bg-saffron/5 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-saffron/15">{keyword}</Link></li>)}
          </ul>
          <header className="mt-8">
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl xl:text-[3.5rem]">{article.title}</h1>
            <p className="mt-4 text-xl leading-relaxed text-foreground/80 sm:text-2xl">{article.description}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3 border-y border-border py-4 text-sm text-foreground">
              <span className="inline-flex items-center gap-2"><CalendarDays className="size-4" aria-hidden="true" />{formatNewsDate(article.publishedAt)}</span>
              <span className="inline-flex items-center gap-2"><Clock3 className="size-4" aria-hidden="true" />{getReadingTime(article)} min read</span>
            </div>
          </header>

          <figure className="relative mx-auto mt-8 w-full overflow-hidden bg-secondary" style={{ maxWidth: 740 }}>
            <Image src={article.image} alt={article.imageAlt} width={1600} height={912} priority className="aspect-[16/9] w-full object-cover" sizes="(max-width: 768px) 100vw, 740px" />
            <figcaption className="absolute inset-x-0 bottom-8 bg-black/65 px-6 py-3 text-center text-sm font-semibold text-white">{article.title}</figcaption>
          </figure>

          <div className="mt-9 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20.75rem] lg:items-start">
            <div className="min-w-0">
              {hasLongFormContent ? <div className="space-y-8">
                <section id="introduction" className="scroll-mt-24"><h2 className="text-2xl font-bold tracking-tight">Introduction</h2><p className="mt-4 text-[17px] leading-[1.7] text-foreground/90">{article.hook}</p></section>
                {article.content.map((section) => <section id={toAnchor(section.heading)} key={section.heading} className="scroll-mt-24"><h2 className="text-2xl font-bold leading-snug tracking-tight">{section.heading}</h2><p className="mt-4 text-[17px] leading-[1.7] text-foreground/90">{section.description}</p></section>)}
                <section id="key-takeaway" className="scroll-mt-24"><h2 className="text-2xl font-bold tracking-tight">Key Takeaway</h2><p className="mt-4 text-[17px] leading-[1.7] text-foreground/90">{article.conclusion}</p></section>
              </div> : <p className="text-[17px] leading-[1.7] text-foreground/90">{article.conclusion}</p>}
            </div>
            {hasLongFormContent && <aside className="rounded-xl border border-border bg-white p-6 lg:sticky lg:top-24" aria-labelledby="table-of-contents">
              <h2 id="table-of-contents" className="text-lg font-bold">Table of contents</h2>
              <ol className="mt-6 space-y-4 pl-4 text-sm leading-snug text-foreground/90">
                <li><a href="#introduction" className="hover:text-saffron">Introduction</a></li>
                {article.content.map((section) => <li key={section.heading}><a href={`#${toAnchor(section.heading)}`} className="hover:text-saffron">{section.heading}</a></li>)}
                <li><a href="#key-takeaway" className="hover:text-saffron">Key Takeaway</a></li>
              </ol>
            </aside>}
          </div>
        </article>

        {related.length > 0 && <section className="mt-16 border-t border-border pt-10" aria-labelledby="more-news"><h2 id="more-news" className="text-2xl font-bold tracking-tight">More real estate news</h2><div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{related.map((item) => <NewsCard key={item.slug} article={item} />)}</div></section>}
      </main>
      <Footer />
    </div>
  );
}

function toAnchor(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
