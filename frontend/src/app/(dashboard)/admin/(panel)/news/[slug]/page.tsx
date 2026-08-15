import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, ImageOff, MapPin, Tag } from "lucide-react";
import { NewsReviewActions } from "@/components/admin/news-review-actions";
import { getQueuedNews, readingMinutes, toParagraphs } from "@/lib/admin/news-queue";
import { cldUrl } from "@/lib/cloudinary-url";

export const metadata = { title: "News Preview — Admin" };

export const dynamic = "force-dynamic";

const DATE_FORMAT = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

function formatMoment(iso: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : DATE_FORMAT.format(date);
}

function titleCase(value: string) {
  return value.split(/[-_\s]+/).filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * The story as a reader would meet it.
 *
 * The layout deliberately copies the public article page — same masthead rules,
 * same serif body, same accent — so that what an admin approves is what the site
 * actually renders, rather than a tidier admin-only version of it.
 */
export default async function AdminNewsPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const story = await getQueuedNews(slug);
  if (!story) notFound();

  const paragraphs = toParagraphs(story.content);
  const [hook, ...body] = paragraphs;
  const location = story.tags[0] || "India";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/news"
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to review queue
        </Link>

        <p className="font-mono text-xs text-muted-foreground">/blog/{story.slug}</p>
      </div>

      <div className="rounded-xl border border-border bg-background p-5">
        <NewsReviewActions slug={story.slug} needsImage={story.needsImage} />
      </div>

      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Preview — not published yet
      </p>

      <div className="overflow-hidden rounded-xl border border-border bg-[#f8f7f4] text-[#1b1b1b]">
        <article className="mx-auto max-w-[760px] px-5 py-8 sm:px-8">
          <header className="border-b-2 border-[#242424] pb-6">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-bold uppercase tracking-[0.14em]">
              <span className="bg-[#bb432a] px-2.5 py-1 text-white">
                {titleCase(story.category)}
              </span>
              <span className="text-stone-500">Real Estate · {location}</span>
            </div>

            <h1 className="mt-4 text-[2rem] font-bold leading-[1.1] tracking-[-0.035em] text-[#181818] sm:text-[2.6rem]">
              {story.title}
            </h1>

            <p className="mt-4 font-serif text-base leading-relaxed text-stone-600 sm:text-lg">
              {story.summary}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-stone-300 pt-4">
              <div className="flex items-center gap-3 text-sm text-stone-600">
                <div className="grid size-9 place-items-center rounded-full bg-[#202b3b] font-serif text-lg font-bold text-white">
                  M
                </div>
                <div>
                  <p className="font-semibold text-stone-900">By {story.author.name}</p>
                  <p className="mt-0.5 text-xs">
                    Will publish as {formatMoment(story.publishedAt)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-stone-500">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-[#bb432a]" aria-hidden="true" />
                  {location}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="size-3.5 text-[#bb432a]" aria-hidden="true" />
                  {readingMinutes(story.content)} min read
                </span>
              </div>
            </div>
          </header>

          <figure className="mt-7 overflow-hidden bg-[#d9d2ca]">
            {story.featuredImage.publicId ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={cldUrl(story.featuredImage.publicId, "w_1200,q_auto,f_auto")}
                alt={story.featuredImage.altText}
                className="h-auto w-full"
              />
            ) : (
              <div className="grid aspect-[3/2] place-items-center text-stone-500">
                <span className="flex flex-col items-center gap-2 text-xs font-medium">
                  <ImageOff className="size-7" />
                  No banner generated
                </span>
              </div>
            )}

            <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-300 bg-white px-3 py-2 text-xs text-stone-500 sm:px-4">
              <span>{story.featuredImage.altText}</span>
              <span className="shrink-0 font-medium text-stone-600">Makan Mantraa</span>
            </figcaption>
          </figure>

          {hook && (
            <p className="mt-8 border-l-4 border-[#bb432a] bg-[#f0e8e0] px-5 py-4 font-serif text-base leading-relaxed text-stone-800">
              <span className="font-bold">The big picture: </span>
              {hook}
            </p>
          )}

          <div className="mt-7 space-y-6 font-serif text-[1.05rem] leading-[1.72] text-[#292929] sm:text-lg">
            {body.map((paragraph, index) => (
              <p key={`${story.slug}-${index}`}>{paragraph}</p>
            ))}
          </div>

          {story.tags.length > 0 && (
            <section className="mt-10 border-b-2 border-t border-b-[#242424] border-t-stone-300 py-5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <h2 className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.14em] text-stone-500">
                  <Tag className="size-4" aria-hidden="true" />
                  Tags:
                </h2>
                <ul className="flex flex-wrap gap-2.5">
                  {story.tags.map((tag) => (
                    <li
                      key={tag}
                      className="inline-flex border border-[#242424] bg-white px-3.5 py-1.5 text-sm font-medium uppercase tracking-[0.06em] text-[#242424]"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </article>
      </div>

      <div className="rounded-xl border border-border bg-background p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Search engines will see
        </h2>
        <p className="mt-2 text-sm font-semibold text-[#1a0dab] dark:text-[#8ab4f8]">
          {story.seo.metaTitle || story.title}
        </p>
        <p className="text-xs text-emerald-700 dark:text-emerald-500">
          makanmantraa.com › blog › {story.slug}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {story.seo.metaDescription || story.summary}
        </p>
      </div>
    </div>
  );
}
