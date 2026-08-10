import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, CalendarDays, Images } from "lucide-react";

import { Panel } from "@/components/dashboard/panel";
import { PropertyActions } from "@/components/dashboard/property-actions";
import { getPropertySubmissionsCollection } from "@/lib/auth/db";
import { getLiveSession } from "@/lib/auth/session";
import { PROPERTY_TYPES } from "@/lib/constants/propertyTypes";

export const metadata: Metadata = {
  title: "My properties | Makan Mantraa",
};

const DATE_FORMAT = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});

type PostedProperty = {
  pid: string | null;
  status: string;
  propertyType: string;
  listingType: string;
  details: string | null;
  mediaCount: number;
  createdAt: string | null;
};

async function loadProperties(userId: string, email: string): Promise<PostedProperty[]> {
  try {
    const submissions = await getPropertySubmissionsCollection();
    const docs = await submissions
      .find({ $or: [{ user_id: userId }, { user_email: email }, { owner_email: email }] })
      .sort({ created_at: -1 })
      .toArray();

    return docs.map((doc) => ({
      pid: (doc.pid as string) ?? null,
      status: (doc.status as string) ?? "pending_review",
      propertyType:
        PROPERTY_TYPES[doc.property_type as keyof typeof PROPERTY_TYPES] ??
        String(doc.property_type ?? "Property"),
      listingType: doc.listing_type === "rent" ? "For Rent" : "For Sale",
      details: (doc.details as string) ?? null,
      mediaCount: Array.isArray(doc.media) ? doc.media.length : 0,
      createdAt: doc.created_at ? new Date(doc.created_at as Date).toISOString() : null,
    }));
  } catch {
    return [];
  }
}

export default async function PropertiesPage() {
  const session = await getLiveSession();
  if (!session) redirect("/?auth=login");

  const properties = await loadProperties(session.userId, session.email);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-foreground md:text-[30px]">My properties</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Everything you have posted with us. Our team calls you to collect the rest of the
          details and build the listing.
        </p>
      </div>

      <Panel title="Posted with us" icon={Building2} tone="bg-[#1160F0]/10 text-[#1160F0]">
      {properties.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <Building2 className="mx-auto size-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="mt-3 font-semibold text-foreground">Nothing posted yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Post a property and we will take it from there.
          </p>
          <Link
            href="/post-property"
            className="mt-4 inline-flex h-9 items-center rounded-full bg-saffron px-4 text-sm font-semibold text-saffron-foreground transition-opacity hover:opacity-90"
          >
            Post a property
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {properties.map((property, index) => (
            <li
              key={property.pid ?? index}
              className="rounded-xl border border-border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">
                    {property.propertyType}
                    <span className="ml-2 text-xs font-medium text-muted-foreground">
                      {property.listingType}
                    </span>
                  </p>
                  {property.pid && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Property ID{" "}
                      <span className="font-mono text-sm font-bold tracking-wider text-saffron">
                        {property.pid}
                      </span>
                    </p>
                  )}
                </div>

                {property.status === "sold" ? (
                  <span className="shrink-0 rounded-full bg-[#0F8B8D]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0F8B8D]">
                    Sold out
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-[#F97316]/10 px-2.5 py-1 text-[11px] font-semibold text-[#C2410C]">
                    With our team
                  </span>
                )}
              </div>

              {property.details && (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {property.details}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                {property.createdAt && (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" />
                    Posted {DATE_FORMAT.format(new Date(property.createdAt))}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Images className="size-3.5" />
                  {property.mediaCount} {property.mediaCount === 1 ? "file" : "files"}
                </span>
              </div>

              {property.pid && (
                <div className="mt-3">
                  <PropertyActions pid={property.pid} status={property.status} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      </Panel>
    </div>
  );
}
