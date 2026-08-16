import type { Metadata } from "next";

import {
  DashboardPropertyActivity,
  type DashboardPostedProperty,
} from "@/components/dashboard/dashboard-property-activity";
import { DashboardGuestPlaceholder } from "@/components/dashboard/dashboard-guest-placeholder";
import { getPropertySubmissionsCollection } from "@/lib/auth/db";
import { getLiveSession } from "@/lib/auth/session";
import { PROPERTY_TYPES } from "@/lib/constants/propertyTypes";

export const metadata: Metadata = {
  title: "Dashboard | Makan Mantraa",
};

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

async function loadPostedProperties(
  userId: string,
  email: string,
): Promise<DashboardPostedProperty[]> {
  try {
    const submissions = await getPropertySubmissionsCollection();
    const docs = await submissions
      .find({ $or: [{ user_id: userId }, { user_email: email }, { owner_email: email }] })
      .sort({ created_at: -1 })
      .limit(3)
      .toArray();

    return docs.map((doc) => {
      const media = Array.isArray(doc.media)
        ? doc.media
        : Array.isArray(doc.images)
          ? doc.images
          : [];
      const image = media.find(
        (asset) =>
          asset &&
          typeof asset === "object" &&
          "kind" in asset &&
          asset.kind === "image" &&
          "url" in asset &&
          typeof asset.url === "string",
      ) as { url?: string } | undefined;

      return {
        pid: typeof doc.pid === "string" ? doc.pid : null,
        status: typeof doc.status === "string" ? doc.status : "pending_review",
        propertyType:
          PROPERTY_TYPES[doc.property_type as keyof typeof PROPERTY_TYPES] ??
          String(doc.property_type ?? "Property"),
        listingType: doc.listing_type === "rent" ? "For Rent" : "For Sale",
        details: typeof doc.details === "string" ? doc.details : null,
        image: image?.url ?? "",
        mediaCount: media.length,
        createdAt: doc.created_at ? new Date(doc.created_at as Date).toISOString() : null,
      };
    });
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const session = await getLiveSession();
  // A guest is not sent away: the dashboard layout keeps them here behind
  // `DashboardGuestGate`, which blurs this shell and asks them to sign in.
  if (!session) return <DashboardGuestPlaceholder />;

  const firstName = (session.name || "").trim().split(/\s+/)[0];
  const postedProperties = await loadPostedProperties(session.userId, session.email);

  return (
    <div className="min-w-0 space-y-5">
      <div>
        <h1 className="text-[25px] font-bold leading-8 text-foreground md:text-[28px]">
          {greeting()}{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening in your property journey today.
        </p>
      </div>

      <DashboardPropertyActivity postedProperties={postedProperties} />
    </div>
  );
}
