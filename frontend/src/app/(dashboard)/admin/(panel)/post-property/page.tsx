import Link from "next/link";
import { Film, ImageOff, Phone, Search } from "lucide-react";
import { listSubmissions, PAGE_SIZE } from "@/lib/admin/submissions";
import { cldThumb } from "@/lib/cloudinary-url";
import { PROPERTY_TYPES } from "@/lib/constants/propertyTypes";

export const metadata = { title: "Post Property — Admin" };

const DATE_FORMAT = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

function label(type: string) {
  return PROPERTY_TYPES[type as keyof typeof PROPERTY_TYPES] ?? type;
}

export default async function AdminPostPropertyPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const { items, total, page, pages } = await listSubmissions({
    page: Number(params.page) || 1,
    q,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Post Property</h1>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "enquiry" : "enquiries"} from the post-property form
          </p>
        </div>

        <form className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Name, email or phone"
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
        <div className="rounded-2xl border border-border bg-background py-16 text-center">
          <p className="text-sm font-medium">No enquiries yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {q ? "Nothing matched that search." : "New form submissions will appear here."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-background">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Property</th>
                  <th className="px-4 py-3 font-semibold">Owner</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Media</th>
                  <th className="px-4 py-3 font-semibold">Received</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {items.map((item) => {
                  const cover = item.media.find((asset) => asset.kind === "image");
                  const videos = item.media.filter((asset) => asset.kind === "video").length;

                  return (
                    <tr key={item.id} className="transition-colors hover:bg-secondary/40">
                      <td className="px-4 py-3">
                        <Link href={`/admin/post-property/${item.id}`} className="flex items-center gap-3">
                          <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-secondary">
                            {cover ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={cldThumb(cover.public_id, 88)}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              <ImageOff className="size-4 text-muted-foreground" />
                            )}
                          </span>

                          <span className="min-w-0">
                            <span className="block font-semibold text-foreground hover:underline">
                              {label(item.property_type)}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {item.listing_type === "rent" ? "For Rent" : "For Sale"}
                              {item.user_type ? ` · ${item.user_type}` : ""}
                            </span>
                          </span>
                        </Link>
                      </td>

                      <td className="px-4 py-3">
                        <span className="block font-medium">{item.owner_name || "—"}</span>
                        <span className="block text-xs text-muted-foreground">
                          {item.owner_email || "—"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {item.owner_phone ? (
                          <a
                            href={`tel:${item.owner_phone}`}
                            className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                          >
                            <Phone className="size-3.5" />
                            {item.owner_phone}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {item.media.length === 0 ? (
                          "None"
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            {item.media.length} file{item.media.length === 1 ? "" : "s"}
                            {videos > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <Film className="size-3.5" />
                                {videos}
                              </span>
                            )}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {DATE_FORMAT.format(new Date(item.created_at))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs">
              <span className="text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </span>

              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/post-property?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                    className="rounded-md border border-border px-3 py-1.5 font-medium hover:bg-secondary"
                  >
                    Previous
                  </Link>
                )}
                {page < pages && (
                  <Link
                    href={`/admin/post-property?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
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
