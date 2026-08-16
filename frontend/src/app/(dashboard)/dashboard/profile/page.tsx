import type { Metadata } from "next";
import { ObjectId } from "mongodb";

import { DashboardGuestPlaceholder } from "@/components/dashboard/dashboard-guest-placeholder";
import { ProfileForm, type Profile } from "@/components/dashboard/profile-form";
import { getUsersCollection } from "@/lib/auth/db";
import { getLiveSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Profile | Makan Mantraa",
};

async function loadProfile(userId: string): Promise<Profile | null> {
  try {
    const users = await getUsersCollection();
    const user = await users.findOne({ _id: new ObjectId(userId) });
    if (!user) return null;

    return {
      name: user.name ?? "",
      email: user.email,
      profileRole: user.profile_role ?? "",
      profileImage: user.profile_image
        ? { publicId: user.profile_image.public_id, url: user.profile_image.url }
        : null,
      phone: user.phone ?? "",
      alternatePhone: user.alternate_phone ?? "",
      preferredState: user.preferred_state ?? "",
      preferredCity: user.preferred_city ?? "",
      gender: user.gender ?? "",
      dateOfBirth: user.date_of_birth ?? "",
      address: user.address ?? "",
      emailVerified: Boolean(user.email_verified),
      provider: user.provider,
    };
  } catch {
    return null;
  }
}

export default async function ProfilePage() {
  const session = await getLiveSession();
  // A guest is not sent away: the dashboard layout keeps them here behind
  // `DashboardGuestGate`, which blurs this shell and asks them to sign in.
  if (!session) return <DashboardGuestPlaceholder />;

  const profile = await loadProfile(session.userId);

  return profile ? (
    <ProfileForm profile={profile} />
  ) : (
    <section className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">
        We could not load your profile right now. Please refresh in a moment.
      </p>
    </section>
  );
}
