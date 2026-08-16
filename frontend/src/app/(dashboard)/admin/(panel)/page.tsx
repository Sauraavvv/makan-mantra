import Link from "next/link";
import { Inbox, Newspaper } from "lucide-react";
import { countPublishedNews, countQueuedNews } from "@/lib/admin/news-queue";
import { listSubmissions } from "@/lib/admin/submissions";

export const metadata = { title: "Admin — Makan Mantraa" };

export default async function AdminPage() {
  const [{ total }, publishedNews, queuedNews] = await Promise.all([
    listSubmissions({ page: 1 }),
    countPublishedNews(),
    countQueuedNews(),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:max-w-3xl">
        <OverviewCard
          href="/admin/post-property"
          icon={Inbox}
          tone="bg-violet-50 text-violet-600"
          value={total}
          label="Post Property enquiries"
        />

        {/* Published is the count of what is live on the site. Anything still in
            the queue is not news yet, so it is named separately rather than
            folded into the same number. */}
        <OverviewCard
          href="/admin/news?tab=published"
          icon={Newspaper}
          tone="bg-sky-50 text-sky-600"
          value={publishedNews}
          label="News published"
          note={queuedNews > 0 ? `${queuedNews} waiting in queue` : undefined}
        />
      </div>
    </div>
  );
}

function OverviewCard({
  href,
  icon: Icon,
  tone,
  value,
  label,
  note,
}: {
  href: string;
  icon: typeof Inbox;
  tone: string;
  value: number;
  label: string;
  note?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-xl border border-border bg-background p-5 transition-colors hover:bg-secondary/40"
    >
      <span className={`grid size-11 shrink-0 place-items-center rounded-full ${tone}`}>
        <Icon className="size-5" strokeWidth={1.8} />
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-bold">{value}</span>
        <span className="block text-sm text-muted-foreground">{label}</span>
        {note && <span className="mt-0.5 block text-xs text-muted-foreground">{note}</span>}
      </span>
    </Link>
  );
}
