import Link from "next/link";
import { ChevronDown, Globe, Inbox, MessageCircleQuestionMark, Newspaper } from "lucide-react";
import { countContactQuestions } from "@/lib/admin/contact-questions";
import { countLivePages, type LevelCount, type LivePageCounts } from "@/lib/admin/live-pages";
import { countPublishedNews, countQueuedNews } from "@/lib/admin/news-queue";
import { listSubmissions } from "@/lib/admin/submissions";

export const metadata = { title: "Admin — Makan Mantraa" };

export default async function AdminPage() {
  const [{ total }, publishedNews, queuedNews, questions, livePages] = await Promise.all([
    listSubmissions({ page: 1 }),
    countPublishedNews(),
    countQueuedNews(),
    countContactQuestions(),
    countLivePages(),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:max-w-5xl lg:grid-cols-3">
        <OverviewCard
          href="/admin/post-property"
          icon={Inbox}
          tone="bg-violet-50 text-violet-600"
          value={total}
          label="Post Property enquiries"
        />

        <OverviewCard
          href="/admin/questions"
          icon={MessageCircleQuestionMark}
          tone="bg-amber-50 text-amber-600"
          value={questions}
          label="Questions from FAQ"
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

      <LivePagesPanel counts={livePages} />
    </div>
  );
}

const NUMBER = new Intl.NumberFormat("en-IN");

/**
 * How many public pages the site is serving right now. The total is the
 * header; clicking it expands the breakdown by kind and level. A native
 * `<details>` keeps this a server component.
 */
function LivePagesPanel({ counts }: { counts: LivePageCounts }) {
  return (
    <details className="group overflow-hidden rounded-xl border border-border bg-background lg:max-w-5xl">
      <summary className="flex cursor-pointer list-none items-center gap-4 p-5 transition-colors hover:bg-secondary/40 [&::-webkit-details-marker]:hidden">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <Globe className="size-5" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-2xl font-bold">{NUMBER.format(counts.total)}</span>
          <span className="block text-sm text-muted-foreground">Pages live on the site</span>
        </span>
        <span className="hidden text-xs font-medium text-muted-foreground sm:block">
          <span className="group-open:hidden">Show breakdown</span>
          <span className="hidden group-open:inline">Hide breakdown</span>
        </span>
        <span className="grid size-8 shrink-0 place-items-center rounded-md border border-border text-muted-foreground">
          <ChevronDown className="size-4 transition-transform duration-200 group-open:rotate-180" />
        </span>
      </summary>

      <div className="grid divide-y divide-border border-t border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <PageGroup
          title="Explore pages"
          total={counts.explore.total}
          rows={[
            {
              label: "State",
              count: counts.explore.state,
              href: "/admin/locations?kind=state&status=live",
            },
            {
              label: "District",
              count: counts.explore.district,
              href: "/admin/locations?kind=district&status=live",
            },
          ]}
        />
        <PageGroup
          title="Category pages"
          total={counts.category.total}
          unitHint="Property type × sale/rent combinations"
          rows={[
            {
              label: "State",
              count: counts.category.state,
              href: "/admin/locations?status=live",
            },
            {
              label: "District",
              count: counts.category.district,
              href: "/admin/locations?status=live",
            },
            {
              label: "City",
              count: counts.category.city,
              href: "/admin/locations?status=live",
            },
          ]}
        />
      </div>
    </details>
  );
}

/**
 * One table per page kind: `Number × Total type = Total pages` per location
 * level. When places don't all have the same number of pages the
 * multiplication wouldn't hold, so "Total type" shows a dash.
 */
function PageGroup({
  title,
  total,
  unitHint,
  rows,
}: {
  title: string;
  total: number;
  unitHint?: string;
  rows: Array<{ label: string; count: LevelCount; href: string }>;
}) {
  return (
    <div className="p-5">
      <div className="flex items-baseline justify-between gap-3 border-b border-border pb-3">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-lg font-bold tabular-nums">{NUMBER.format(total)}</p>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs text-muted-foreground">
            <tr className="divide-x divide-border border-b border-border">
              <th className="px-3 py-2 font-medium">Location type</th>
              <th className="px-3 py-2 text-right font-medium">Number</th>
              <th className="px-3 py-2 text-right font-medium" title={unitHint}>
                Total type
              </th>
              <th className="px-3 py-2 text-right font-medium">Total pages</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border tabular-nums">
            {rows.map((row) => (
              <tr key={row.label} className="divide-x divide-border">
                <td className="px-3 py-2">
                  <Link href={row.href} className="font-medium hover:text-primary hover:underline">
                    {row.label}
                  </Link>
                </td>
                <td className="px-3 py-2 text-right">{NUMBER.format(row.count.places)}</td>
                <td className="px-3 py-2 text-right">
                  {row.count.perPlace === null ? "—" : NUMBER.format(row.count.perPlace)}
                </td>
                <td className="px-3 py-2 text-right font-semibold">
                  {NUMBER.format(row.count.pages)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
