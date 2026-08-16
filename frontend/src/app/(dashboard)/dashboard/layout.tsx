import { ObjectId } from "mongodb";

import { DashboardGuestGate } from "@/components/dashboard/dashboard-guest-gate";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { getPropertySubmissionsCollection, getUsersCollection } from "@/lib/auth/db";
import { getLiveSession } from "@/lib/auth/session";

/** Email is matched alongside the id to catch posts made before signing up. */
async function countProperties(userId: string, email: string) {
  try {
    const submissions = await getPropertySubmissionsCollection();
    return await submissions.countDocuments({
      $or: [{ user_id: userId }, { user_email: email }, { owner_email: email }],
    });
  } catch {
    return 0;
  }
}

async function getProfileImageUrl(userId: string) {
  try {
    const users = await getUsersCollection();
    const user = await users.findOne(
      { _id: new ObjectId(userId) },
      { projection: { "profile_image.url": 1 } },
    );
    return typeof user?.profile_image?.url === "string" ? user.profile_image.url : "";
  } catch {
    return "";
  }
}

/**
 * A guest is let in rather than redirected: their searches and viewed properties
 * live on their own device and have pages here that can show them. Every other
 * page belongs to an account, and `DashboardGuestGate` holds those behind a
 * blur with the sign-in ask on top.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getLiveSession();

  const [propertiesCount, profileImageUrl] = session
    ? await Promise.all([
        countProperties(session.userId, session.email),
        getProfileImageUrl(session.userId),
      ])
    : [0, ""];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f6f8fc]">
      <DashboardNav propertiesCount={propertiesCount} />
      <div className="min-w-0 lg:ml-[250px]">
        <DashboardTopbar
          name={session?.name ?? "Guest user"}
          email={session?.email ?? ""}
          profileImageUrl={profileImageUrl}
          guest={!session}
        />
        <main className="mx-auto w-full min-w-0 max-w-[1500px] px-4 py-5 sm:px-6 lg:px-7 lg:py-7 xl:px-8">
          {session ? children : <DashboardGuestGate>{children}</DashboardGuestGate>}
        </main>
      </div>
    </div>
  );
}
