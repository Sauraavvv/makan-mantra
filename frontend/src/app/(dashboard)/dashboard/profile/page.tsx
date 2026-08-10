import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";

import { Panel } from "@/components/dashboard/panel";
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
  if (!session) redirect("/?auth=login");

  const profile = await loadProfile(session.userId);

  return (
    <div>
      <Panel title="Your details" icon={UserRound} tone="bg-[#0F8B8D]/10 text-[#0F8B8D]">
        {profile ? (
          <ProfileForm profile={profile} />
        ) : (
          <p className="text-sm text-muted-foreground">
            We could not load your profile right now. Please refresh in a moment.
          </p>
        )}
      </Panel>
    </div>
  );
}
