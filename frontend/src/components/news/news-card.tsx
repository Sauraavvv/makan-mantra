import Image from "next/image";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import type { NewsArticle } from "@/lib/news";
import { formatNewsDate } from "@/lib/news";

export function NewsCard({ article, priority = false, monochrome = false }: { article: NewsArticle; priority?: boolean; monochrome?: boolean }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-950/10">
      <Link href={`/blog/${article.slug}`} className="relative block overflow-hidden">
        <Image
          src={article.image}
          alt={article.imageAlt}
          width={article.imageWidth || 1200}
          height={article.imageHeight || 800}
          priority={priority}
          className={`h-auto w-full transition-[filter,transform] duration-500 group-hover:scale-[1.03] ${monochrome ? "grayscale group-hover:grayscale-0" : ""}`}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <span className="absolute bottom-3 left-3 rounded bg-saffron px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
          {article.category}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <h2 className="text-base font-bold leading-snug tracking-tight text-foreground sm:text-[17px]">
          <Link href={`/blog/${article.slug}`} className="transition-colors hover:text-saffron">
            {article.title}
          </Link>
        </h2>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="grid size-5 place-items-center rounded-full bg-[#0A2036] text-[8px] font-bold text-white">M</span>
          <span className="font-medium text-foreground">Makan Mantraa</span>
          <span className="text-border">|</span>
          <span className="inline-flex items-center gap-1"><CalendarDays className="size-3" aria-hidden="true" />{formatNewsDate(article.publishedAt)}</span>
        </div>
      </div>
    </article>
  );
}
