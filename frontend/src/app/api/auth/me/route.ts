import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { getUsersCollection } from "@/lib/auth/db";
import { getLiveSession } from "@/lib/auth/session";

/**
 * Who the header should show.
 *
 * The session is read here rather than in the root layout on purpose: touching
 * cookies up there would opt every marketing page out of static rendering.
 */
export async function GET() {
  const session = await getLiveSession();
  let profileImageUrl = "";

  if (session) {
    try {
      const users = await getUsersCollection();
      const user = await users.findOne(
        { _id: new ObjectId(session.userId) },
        { projection: { "profile_image.url": 1 } },
      );
      if (typeof user?.profile_image?.url === "string") {
        profileImageUrl = user.profile_image.url;
      }
    } catch {
      // Session identity can still render with initials during a database blip.
    }
  }

  return NextResponse.json(
    {
      user: session
        ? {
            name: session.name,
            email: session.email,
            role: session.role,
            profileImageUrl,
          }
        : null,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
