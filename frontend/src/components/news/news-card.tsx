import Image from "next/image";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import type { NewsArticle } from "@/lib/news";
import { formatNewsDate } from "@/lib/news";

export function NewsCard({ article, priority = false, monochrome = false, clampTitle = false, darkCategory = false, editorial = false }: { article: NewsArticle; priority?: boolean; monochrome?: boolean; clampTitle?: boolean; darkCategory?: boolean; editorial?: boolean }) {
  return (
    <article className={`group flex h-full flex-col overflow-hidden border bg-white transition-all duration-200 ${editorial ? "rounded-md border-stone-200 shadow-[0_2px_8px_rgba(28,25,23,0.08)] hover:-translate-y-0.5 hover:shadow-[0_9px_22px_rgba(28,25,23,0.13)]" : "rounded-2xl border-border hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-950/10"}`}>
      <Link href={`/blog/${article.slug}`} className="relative block overflow-hidden">
        <Image
          src={article.image}
          alt={article.imageAlt}
          width={article.imageWidth || 1200}
          height={article.imageHeight || 800}
          priority={priority}
          className={`${editorial ? "aspect-[16/9] w-full object-cover" : "h-auto w-full"} transition-[filter,transform] duration-500 group-hover:scale-[1.03] ${monochrome ? "grayscale group-hover:grayscale-0" : ""}`}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {!editorial && !darkCategory && <span className="absolute bottom-3 left-3 rounded bg-saffron px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white">{article.category}</span>}
      </Link>
      <div className={`flex flex-1 flex-col ${editorial ? "p-3" : "p-4"}`}>
        {(editorial || darkCategory) && <span className={`mb-2 text-[10px] font-bold uppercase tracking-[0.1em] ${editorial ? "text-[#bb432a]" : "text-stone-500"}`}>{article.category}</span>}
        <h2 className={`${editorial ? "line-clamp-2 font-serif text-[0.95rem] font-semibold leading-[1.28] text-[#242424]" : `text-base font-bold leading-snug tracking-tight text-foreground sm:text-[17px] ${clampTitle ? "line-clamp-2" : ""}`}`}>
          <Link href={`/blog/${article.slug}`} className="transition-colors hover:text-saffron">
            {article.title}
          </Link>
        </h2>
        {editorial ? (
          <div className="mt-3 text-[10px] leading-relaxed text-stone-500">
            <p className="font-medium text-stone-600">{article.author?.name || "Makan Mantraa News Desk"}</p>
            <p>{formatNewsDate(article.publishedAt)}</p>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="grid size-5 place-items-center rounded-full bg-[#0A2036] text-[8px] font-bold text-white">M</span>
            <span className="font-medium text-foreground">Makan Mantraa</span>
            <span className="text-border">|</span>
            <span className="inline-flex items-center gap-1"><CalendarDays className="size-3" aria-hidden="true" />{formatNewsDate(article.publishedAt)}</span>
          </div>
        )}
      </div>
    </article>
  );
}
