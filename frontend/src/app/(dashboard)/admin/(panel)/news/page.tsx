import Link from "next/link";
import { CheckCircle2, Clock3, ExternalLink, ImageOff, Maximize2, Trash2 } from "lucide-react";
import { DeletePublishedNewsButton } from "@/components/admin/delete-published-news-button";
import { NewsReviewActions } from "@/components/admin/news-review-actions";
import {
  countPublishedNews,
  countQueuedNews,
  listPublishedNews,
  listQueuedNews,
  readingMinutes,
  toParagraphs,
} from "@/lib/admin/news-queue";
import { cldUrl } from "@/lib/cloudinary-url";

export const metadata = { title: "News Review — Admin" };

// Both lists change the moment something is approved, rejected or deleted, so
// neither is ever worth serving from cache.
export const dynamic = "force-dynamic";

const DATE_FORMAT = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

function formatDay(iso: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : DATE_FORMAT.format(date);
}

function titleCase(value: string) {
  return value.split(/[-_\s]+/).filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function AdminNewsReviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    published?: string;
    rejected?: string;
    deleted?: string;
  }>;
}) {
  const params = await searchParams;
  const showingPublished = params.tab === "published";

  const [pendingCount, publishedCount] = await Promise.all([
    countQueuedNews(),
    countPublishedNews(),
  ]);

  const stories = showingPublished ? [] : await listQueuedNews();
  const live = showingPublished ? await listPublishedNews() : [];

  const tabs = [
    { key: "pending", href: "/admin/news", label: "Pending", count: pendingCount },
    { key: "published", href: "/admin/news?tab=published", label: "Published", count: publishedCount },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">News</h1>
        <p className="text-sm text-muted-foreground">
          {showingPublished
            ? "Everything live on the news page."
            : pendingCount === 0
              ? "Stories written by the generator land here before they go live."
              : `${pendingCount} ${pendingCount === 1 ? "story is" : "stories are"} waiting on you`}
        </p>
      </div>

      <nav className="flex gap-1 border-b border-border">
        {tabs.map((tab) => {
          const active = showingPublished === (tab.key === "published");

          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                {tab.count}
              </span>
            </Link>
          );
        })}
      </nav>

      {params.published && (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-4" />
          Published. It is live on the news page now.
        </p>
      )}

      {params.rejected && (
        <p className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-3 text-sm font-medium text-muted-foreground">
          <Trash2 className="size-4" />
          Rejected. The story and its banner are gone.
        </p>
      )}

      {params.deleted && (
        <p className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-3 text-sm font-medium text-muted-foreground">
          <Trash2 className="size-4" />
          Deleted. The article is off the site and its banner is gone.
        </p>
      )}

      {showingPublished ? (
        live.length === 0 ? (
          <EmptyState
            title="No articles yet"
            hint="Approved stories show up here."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-background">
            <ul className="divide-y divide-border">
              {live.map((article) => (
                <li
                  key={article.id}
                  className="flex flex-wrap items-center gap-4 px-4 py-3 transition-colors hover:bg-secondary/40"
                >
                  <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-secondary">
                    {article.imagePublicId ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={cldUrl(article.imagePublicId, "w_112,h_112,c_fill,q_auto,f_auto")}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <ImageOff className="size-4 text-muted-foreground" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{article.title}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span>{titleCase(article.category)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDay(article.publishedAt)}</span>
                      {article.status !== "published" && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-amber-600">{article.status}</span>
                        </>
                      )}
                    </p>
                  </div>

                  <Link
                    href={`/blog/${article.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="size-3.5" />
                    View
                  </Link>

                  <DeletePublishedNewsButton slug={article.slug} />
                </li>
              ))}
            </ul>
          </div>
        )
      ) : stories.length === 0 ? (
        <EmptyState
          title="Nothing to review"
          hint="The generator stages the day's stories here each morning. When it has run, reload this page."
        />
      ) : (
        <div className="space-y-5">
          {stories.map((story) => {
            const paragraphs = toParagraphs(story.content);

            return (
              <article
                key={story.id}
                className="overflow-hidden rounded-xl border border-border bg-background"
              >
                <div className="grid gap-0 md:grid-cols-[300px_minmax(0,1fr)]">
                  <div className="relative aspect-[3/2] bg-secondary md:aspect-auto md:min-h-[220px]">
                    {story.featuredImage.publicId ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={cldUrl(story.featuredImage.publicId, "w_640,c_fill,ar_3:2,q_auto,f_auto")}
                        alt={story.featuredImage.altText}
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="grid size-full place-items-center text-muted-foreground">
                        <ImageOff className="size-7" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 p-5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-bold uppercase tracking-[0.12em]">
                      <span className="bg-[#bb432a] px-2 py-1 text-white">
                        {titleCase(story.category)}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDay(story.batchDate || story.publishedAt)}
                      </span>
                      <span className="inline-flex items-center gap-1 font-medium normal-case tracking-normal text-muted-foreground">
                        <Clock3 className="size-3.5" />
                        {readingMinutes(story.content)} min read
                      </span>
                    </div>

                    <h2 className="mt-3 text-xl font-bold leading-snug tracking-[-0.02em]">
                      {story.title}
                    </h2>

                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {story.summary}
                    </p>

                    <details className="mt-3">
                      <summary className="cursor-pointer list-none text-xs font-semibold text-primary hover:underline">
                        Read the full article ({paragraphs.length} paragraphs)
                      </summary>
                      <div className="mt-3 max-h-96 space-y-3 overflow-y-auto border-l-2 border-border pl-4 font-serif text-[15px] leading-relaxed text-foreground/90">
                        {paragraphs.map((paragraph, index) => (
                          <p key={`${story.slug}-${index}`}>{paragraph}</p>
                        ))}
                      </div>
                    </details>

                    {story.tags.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {story.tags.map((tag) => (
                          <li
                            key={tag}
                            className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {tag}
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                      <NewsReviewActions slug={story.slug} needsImage={story.needsImage} />

                      <Link
                        href={`/admin/news/${story.slug}`}
                        className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                      >
                        <Maximize2 className="size-3.5" />
                        Full preview
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-background py-16 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
