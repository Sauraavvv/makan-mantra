import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/admin";
import { PageStatusToggle } from "@/components/admin/page-status-toggle";
import {
  KIND_LABELS,
  PAGE_KINDS,
  collectionFor,
  isPageKind,
  labelFor,
  pathFor,
  searchFilter,
  type PageKind,
} from "@/lib/admin/location-collections";

export const metadata = { title: "Locations — Admin" };

const PER_PAGE = 50;

type Search = { kind?: string; q?: string; status?: string; page?: string };

export default async function AdminLocationsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await requireAdminPage();

  const params = await searchParams;
  const kind: PageKind = isPageKind(params.kind) ? params.kind : "location";
  const term = (params.q ?? "").trim();
  const status = params.status === "retired" || params.status === "live" ? params.status : "all";
  const page = Math.max(1, Number(params.page) || 1);

  const collection = await collectionFor(kind);
  const filter = {
    ...(term ? searchFilter(kind, term) : {}),
    ...(status === "retired"
      ? { is_active: false }
      : status === "live"
        ? { is_active: { $ne: false } }
        : {}),
  };

  const [total, retiredCount, docs] = await Promise.all([
    collection.countDocuments(filter),
    collection.countDocuments({ is_active: false }),
    collection
      .find(filter)
      .sort({ slug: 1 })
      .skip((page - 1) * PER_PAGE)
      .limit(PER_PAGE)
      .toArray(),
  ]);

  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));

  const linkTo = (next: Partial<Search>) => {
    const query = new URLSearchParams();
    const merged = { kind, q: term, status, page: String(page), ...next };

    if (merged.kind && merged.kind !== "location") query.set("kind", merged.kind);
    if (merged.q) query.set("q", merged.q);
    if (merged.status && merged.status !== "all") query.set("status", merged.status);
    if (merged.page && merged.page !== "1") query.set("page", merged.page);

    const qs = query.toString();
    return qs ? `/admin/locations?${qs}` : "/admin/locations";
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Locations</h1>
        <p className="text-sm text-muted-foreground">
          Retiring a page takes it off the site for good — its URL starts answering
          410 Gone instead of serving content. Either way the change reaches
          visitors within about 30 seconds.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PAGE_KINDS.map((item) => (
          <Link
            key={item}
            href={linkTo({ kind: item, page: "1" })}
            className={
              item === kind
                ? "rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                : "rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
            }
          >
            {KIND_LABELS[item]}
          </Link>
        ))}

        <span className="ml-auto text-xs text-muted-foreground">
          {retiredCount} retired in {KIND_LABELS[kind].toLowerCase()}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form method="get" className="flex flex-1 items-center gap-2">
          {kind !== "location" && <input type="hidden" name="kind" value={kind} />}
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={term}
            placeholder={`Search ${KIND_LABELS[kind].toLowerCase()} by name or slug`}
            className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="h-10 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-secondary"
          >
            Search
          </button>
        </form>

        <div className="flex gap-1">
          {(["all", "live", "retired"] as const).map((item) => (
            <Link
              key={item}
              href={linkTo({ status: item, page: "1" })}
              className={
                item === status
                  ? "rounded-md bg-secondary px-2.5 py-1.5 text-xs font-semibold capitalize"
                  : "rounded-md px-2.5 py-1.5 text-xs font-medium capitalize text-muted-foreground hover:bg-secondary/60"
              }
            >
              {item}
            </Link>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Page</th>
                <th className="px-4 py-3 font-semibold">URL</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {docs.map((doc) => {
                const active = doc.is_active !== false;
                const path = pathFor(kind, doc);
                // `_id` is an ObjectId on part of the seed data — never a plain
                // value, so it cannot cross into a Client Component as-is.
                const id = String(doc._id);

                return (
                  <tr key={id}>
                    <td className="px-4 py-3 font-medium">{labelFor(kind, doc)}</td>
                    <td className="px-4 py-3">
                      <a
                        href={path}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {path}
                        <ExternalLink className="size-3" />
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          active
                            ? "rounded-md bg-green-50 px-2 py-1 text-[11px] font-semibold text-green-700"
                            : "rounded-md bg-destructive/10 px-2 py-1 text-[11px] font-semibold text-destructive"
                        }
                      >
                        {active ? "Live" : "Retired · 410"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <PageStatusToggle kind={kind} id={id} active={active} />
                    </td>
                  </tr>
                );
              })}

              {docs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Nothing matches this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {total.toLocaleString("en-IN")} page{total === 1 ? "" : "s"} · showing {docs.length}
        </span>

        <div className="flex items-center gap-2">
          {page > 1 && (
            <Link
              href={linkTo({ page: String(page - 1) })}
              className="rounded-md border border-border px-2.5 py-1.5 font-medium hover:bg-secondary"
            >
              Previous
            </Link>
          )}
          <span>
            Page {page} of {lastPage}
          </span>
          {page < lastPage && (
            <Link
              href={linkTo({ page: String(page + 1) })}
              className="rounded-md border border-border px-2.5 py-1.5 font-medium hover:bg-secondary"
            >
              Next
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
