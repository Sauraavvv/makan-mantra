import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { getSubmission } from "@/lib/admin/submissions";
import { DeleteSubmissionButton } from "@/components/admin/delete-submission-button";
import { cldThumb, cldUrl, cldVideoPoster, cldVideoUrl } from "@/lib/cloudinary-url";
import { PROPERTY_TYPES } from "@/lib/constants/propertyTypes";

export const metadata = { title: "Enquiry — Admin" };

const DATE_FORMAT = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

export default async function AdminSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const submission = await getSubmission(id);

  if (!submission) notFound();

  const type =
    PROPERTY_TYPES[submission.property_type as keyof typeof PROPERTY_TYPES] ??
    submission.property_type;

  const facts = [
    ["Property type", type],
    ["Listing", submission.listing_type === "rent" ? "For Rent" : "For Sale"],
    ["Posted by", submission.user_type ?? "—"],
    ["Source", submission.source || "—"],
    ["Received", DATE_FORMAT.format(new Date(submission.created_at))],
  ];

  return (
    <div className="space-y-4">
      <Link
        href="/admin/post-property"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to enquiries
      </Link>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-background p-5">
            <h1 className="text-xl font-bold">{type}</h1>
            <p className="text-sm text-muted-foreground">
              {submission.listing_type === "rent" ? "For Rent" : "For Sale"}
            </p>

            <h2 className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Details shared by owner
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
              {submission.details || "No details were provided."}
            </p>
          </section>

          <section className="rounded-xl border border-border bg-background p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Photos &amp; videos ({submission.media.length})
            </h2>

            {submission.media.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nothing was uploaded.</p>
            ) : (
              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {submission.media.map((asset) =>
                  asset.kind === "video" ? (
                    <li key={asset.public_id}>
                      <a
                        href={cldVideoUrl(asset.public_id)}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded-lg border border-border"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={cldVideoPoster(asset.public_id, 400)}
                          alt=""
                          className="aspect-video w-full bg-secondary object-cover"
                        />
                        <span className="block px-2 py-1.5 text-[11px] text-muted-foreground">
                          Video · {asset.format}
                        </span>
                      </a>
                    </li>
                  ) : (
                    <li key={asset.public_id}>
                      <a
                        href={cldUrl(asset.public_id, "q_auto,f_auto")}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded-lg border border-border"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={cldThumb(asset.public_id, 500)}
                          alt=""
                          className="aspect-square w-full bg-secondary object-cover"
                        />
                        <span className="block px-2 py-1.5 text-[11px] text-muted-foreground">
                          {asset.width}×{asset.height}
                        </span>
                      </a>
                    </li>
                  ),
                )}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-border bg-background p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Contact the owner
            </h2>

            <p className="mt-3 text-base font-bold">{submission.owner_name || "—"}</p>

            <div className="mt-3 space-y-2">
              {submission.owner_phone && (
                <a
                  href={`tel:${submission.owner_phone}`}
                  className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Phone className="size-4" />
                  {submission.owner_phone}
                </a>
              )}

              {submission.owner_email && (
                <a
                  href={`mailto:${submission.owner_email}`}
                  className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary"
                >
                  <Mail className="size-4" />
                  Email
                </a>
              )}
            </div>

            {submission.owner_email && (
              <p className="mt-3 break-all text-xs text-muted-foreground">
                {submission.owner_email}
              </p>
            )}
          </section>

          <section className="rounded-xl border border-border bg-background p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Enquiry
            </h2>

            <dl className="mt-3 space-y-2 text-sm">
              {facts.map(([key, value]) => (
                <div key={key} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{key}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <DeleteSubmissionButton id={submission.id} mediaCount={submission.media.length} />
        </aside>
      </div>
    </div>
  );
}
