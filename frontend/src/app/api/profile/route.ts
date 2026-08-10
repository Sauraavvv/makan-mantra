import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { getUsersCollection } from "@/lib/auth/db";
import { getLiveSession } from "@/lib/auth/session";
import {
  deleteAsset,
  markProfileImageSaved,
  UPLOAD_FOLDER,
  verifyAsset,
  type UploadedAsset,
} from "@/lib/cloudinary";

const NO_STORE = { "cache-control": "no-store" };
const PHONE_PATTERN = /^[6-9]\d{9}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const GENDERS = ["male", "female", "other", "prefer_not_to_say"];
const PROFILE_ROLES = ["broker", "owner", "builder"];
const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;

type StoredProfileImage = {
  public_id: string;
  url: string;
  width: number;
  height: number;
};

type ProfileUpdate = string | number | null | StoredProfileImage;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidDateOfBirth(value: string) {
  if (!DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isCalendarDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return isCalendarDate && date.getTime() <= Date.now();
}

export async function GET() {
  const session = await getLiveSession();
  if (!session) {
    return NextResponse.json({ profile: null }, { headers: NO_STORE });
  }

  try {
    const users = await getUsersCollection();
    const user = await users.findOne({ _id: new ObjectId(session.userId) });
    if (!user) return NextResponse.json({ profile: null }, { headers: NO_STORE });

    return NextResponse.json(
      {
        profile: {
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
        },
      },
      { headers: NO_STORE },
    );
  } catch {
    return NextResponse.json({ error: "Could not load your profile" }, { status: 503 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getLiveSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to update your profile" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Only the fields present in the request are touched, so the location picker
  // can save a preferred state without sending the whole profile back.
  const updates: Record<string, ProfileUpdate> = {};
  let verifiedProfileImage: UploadedAsset | null = null;

  if ("profileRole" in body) {
    const profileRole = text(body.profileRole);
    if (!PROFILE_ROLES.includes(profileRole)) {
      return NextResponse.json({ error: "Select a valid role" }, { status: 400 });
    }
    updates.profile_role = profileRole;
  }

  if ("profileImage" in body) {
    if (body.profileImage === null) {
      updates.profile_image = null;
    } else {
      const claimed = body.profileImage as Record<string, unknown>;
      const publicId = text(claimed?.publicId);

      if (!publicId.startsWith(UPLOAD_FOLDER)) {
        return NextResponse.json({ error: "Invalid profile image" }, { status: 400 });
      }

      try {
        verifiedProfileImage = await verifyAsset(publicId, "image");
      } catch {
        return NextResponse.json({ error: "Profile image could not be found" }, { status: 400 });
      }

      if (verifiedProfileImage.bytes > MAX_PROFILE_IMAGE_BYTES) {
        return NextResponse.json({ error: "Profile image must be under 2MB" }, { status: 400 });
      }

      updates.profile_image = {
        public_id: verifiedProfileImage.public_id,
        url: verifiedProfileImage.url,
        width: verifiedProfileImage.width,
        height: verifiedProfileImage.height,
      };
    }
  }

  if ("name" in body) {
    const name = text(body.name);
    if (name.length < 2) {
      return NextResponse.json({ error: "Enter your full name" }, { status: 400 });
    }
    updates.name = name;
  }

  if ("phone" in body) {
    const phone = text(body.phone);
    if (phone && !PHONE_PATTERN.test(phone)) {
      return NextResponse.json({ error: "Enter a valid 10-digit mobile number" }, { status: 400 });
    }
    updates.phone = phone || null;
  }

  if ("alternatePhone" in body) {
    const alternatePhone = text(body.alternatePhone);
    if (alternatePhone && !PHONE_PATTERN.test(alternatePhone)) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit alternate mobile number" },
        { status: 400 },
      );
    }
    updates.alternate_phone = alternatePhone || null;
  }

  if ("preferredState" in body) {
    updates.preferred_state = text(body.preferredState) || null;
  }

  if ("preferredCity" in body) {
    updates.preferred_city = text(body.preferredCity) || null;
  }

  if ("gender" in body) {
    const gender = text(body.gender);
    if (gender && !GENDERS.includes(gender)) {
      return NextResponse.json({ error: "Choose a valid option" }, { status: 400 });
    }
    updates.gender = gender || null;
  }

  if ("dateOfBirth" in body) {
    const dateOfBirth = text(body.dateOfBirth);
    if (dateOfBirth && !isValidDateOfBirth(dateOfBirth)) {
      return NextResponse.json({ error: "Enter a valid date of birth" }, { status: 400 });
    }
    updates.date_of_birth = dateOfBirth || null;
  }

  if ("address" in body) {
    updates.address = text(body.address).slice(0, 300) || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const users = await getUsersCollection();
    const current = await users.findOne({ _id: new ObjectId(session.userId) });
    if (!current) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (verifiedProfileImage) {
      await markProfileImageSaved(verifiedProfileImage, session.userId);
    }

    await users.updateOne({ _id: new ObjectId(session.userId) }, { $set: updates });

    const oldImageId = current.profile_image?.public_id;
    const nextImageId = verifiedProfileImage?.public_id;
    if ("profile_image" in updates && oldImageId && oldImageId !== nextImageId) {
      await deleteAsset(oldImageId, "image").catch(() => {});
    }

    return NextResponse.json({ updated: true }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Could not save your changes" }, { status: 503 });
  }
}
