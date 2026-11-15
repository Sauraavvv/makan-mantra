import Link from "next/link";
import { Mail, Search } from "lucide-react";
import { DeleteQuestionButton } from "@/components/admin/delete-question-button";
import { listContactQuestions, QUESTIONS_PAGE_SIZE } from "@/lib/admin/contact-questions";

export const metadata = { title: "Questions — Admin" };

const DATE_FORMAT = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const { items, total, page, pages } = await listContactQuestions({
    page: Number(params.page) || 1,
    q,
  });

  const pageHref = (target: number) =>
    `/admin/questions?page=${target}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Questions</h1>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "question" : "questions"} from the FAQ &ldquo;Contact Us&rdquo; card
          </p>
        </div>

        <form className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Email or question text"
              className="h-10 w-64 rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Search
          </button>
        </form>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-border bg-background py-16 text-center">
          <p className="text-sm font-medium">No questions yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {q ? "Nothing matched that search." : "Questions sent from the FAQ section will appear here."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-64 px-4 py-3 font-semibold">From</th>
                  <th className="px-4 py-3 font-semibold">Question</th>
                  <th className="w-44 px-4 py-3 font-semibold">Received</th>
                  <th className="w-48 px-4 py-3 text-right font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr key={item.id} className="align-top transition-colors hover:bg-secondary/40">
                    <td className="px-4 py-3">
                      <a
                        href={`mailto:${item.email}?subject=${encodeURIComponent("Re: Your question to Makan Mantraa")}`}
                        className="inline-flex items-center gap-1.5 break-all font-medium text-primary hover:underline"
                        title="Reply by email"
                      >
                        <Mail className="size-3.5 shrink-0" />
                        {item.email}
                      </a>
                      {item.page && (
                        <span className="mt-1 block truncate text-xs text-muted-foreground">
                          from{" "}
                          <Link href={item.page} target="_blank" className="hover:underline">
                            {item.page}
                          </Link>
                        </span>
                      )}
                    </td>
                    <td className="whitespace-pre-line px-4 py-3 leading-relaxed text-foreground">
                      {item.question}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {DATE_FORMAT.format(new Date(item.created_at))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <DeleteQuestionButton id={item.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs">
              <span className="text-muted-foreground">
                Showing {(page - 1) * QUESTIONS_PAGE_SIZE + 1}–
                {Math.min(page * QUESTIONS_PAGE_SIZE, total)} of {total}
              </span>

              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={pageHref(page - 1)}
                    className="rounded-md border border-border px-3 py-1.5 font-medium hover:bg-secondary"
                  >
                    Previous
                  </Link>
                )}
                {page < pages && (
                  <Link
                    href={pageHref(page + 1)}
                    className="rounded-md border border-border px-3 py-1.5 font-medium hover:bg-secondary"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
