import { NextRequest, NextResponse } from "next/server";
import {
  getAuthDbErrorMessage,
  getPropertySubmissionsCollection,
  getUsersCollection,
} from "@/lib/auth/db";
import { createSession, getSession } from "@/lib/auth/session";
import { PROPERTY_TYPES } from "@/lib/constants/propertyTypes";

const LISTING_TYPES = ["buy", "rent"] as const;
const SOURCES = ["banner", "post_property_page"] as const;
const USER_TYPES = ["owner", "builder", "broker"] as const;

const MAX_FILES = 6;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_VIDEO_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[6-9]\d{9}$/;

function text(form: FormData, key: string) {
  return String(form.get(key) || "").trim();
}

export async function POST(req: NextRequest) {
  let form: FormData;

  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form submission" }, { status: 400 });
  }

  const propertyType = text(form, "property_type");
  const listingType = text(form, "listing_type");
  const details = text(form, "details");
  const source = text(form, "source");

  // Optional on the short banner form, absent on the post-property page.
  const location = text(form, "location");
  const rawPrice = text(form, "price");
  const price = rawPrice ? Number(rawPrice) : null;

  const userType = text(form, "user_type");
  const ownerName = text(form, "owner_name");
  const ownerEmail = text(form, "owner_email").toLowerCase();
  const ownerPhone = text(form, "owner_phone");
  const wantsAccount = text(form, "create_account") === "true";

  if (!(propertyType in PROPERTY_TYPES)) {
    return NextResponse.json({ error: "Please select a valid property type" }, { status: 400 });
  }

  if (!LISTING_TYPES.includes(listingType as (typeof LISTING_TYPES)[number])) {
    return NextResponse.json({ error: "Please select a valid listing type" }, { status: 400 });
  }

  if (price !== null && (!Number.isFinite(price) || price <= 0)) {
    return NextResponse.json({ error: "Please enter a valid price" }, { status: 400 });
  }

  if (userType && !USER_TYPES.includes(userType as (typeof USER_TYPES)[number])) {
    return NextResponse.json({ error: "Please select who is posting this property" }, { status: 400 });
  }

  if (ownerEmail && !EMAIL_PATTERN.test(ownerEmail)) {
    return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
  }

  if (ownerPhone && !PHONE_PATTERN.test(ownerPhone)) {
    return NextResponse.json(
      { error: "Please enter a valid 10-digit phone number" },
      { status: 400 },
    );
  }

  const files = form.getAll("images").filter((entry): entry is File => entry instanceof File);

  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `You can upload up to ${MAX_FILES} files` }, { status: 400 });
  }

  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) {
    return NextResponse.json({ error: "Total upload size must stay under 10MB" }, { status: 400 });
  }

  const media = [];
  for (const file of files) {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: `"${file.name}" is neither an image nor a video` },
        { status: 400 },
      );
    }

    if (isImage && file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: `"${file.name}" is larger than 2MB` }, { status: 400 });
    }

    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: `"${file.name}" is larger than 8MB` }, { status: 400 });
    }

    media.push({
      kind: isVideo ? "video" : "image",
      filename: file.name,
      content_type: file.type,
      size: file.size,
      data: Buffer.from(await file.arrayBuffer()).toString("base64"),
    });
  }

  try {
    const session = await getSession();
    let userId = session?.userId ?? null;
    let accountCreated = false;

    // The owner opted in to an account, so create one when the email is new.
    // An existing email is never signed into here — that would need verification.
    if (!session && wantsAccount && ownerEmail && ownerName) {
      const users = await getUsersCollection();
      const existing = await users.findOne({ email: ownerEmail });

      if (!existing) {
        const created = await users.insertOne({
          name: ownerName,
          email: ownerEmail,
          phone: ownerPhone || null,
          password: null,
          role: "user",
          email_verified: false,
          provider: "post_property",
          created_at: new Date(),
        });

        userId = created.insertedId.toString();
        accountCreated = true;

        await createSession({
          userId,
          email: ownerEmail,
          name: ownerName,
          role: "user",
        });
      }
    }

    const submissions = await getPropertySubmissionsCollection();

    const result = await submissions.insertOne({
      property_type: propertyType,
      listing_type: listingType,
      location: location || null,
      state: text(form, "state") || null,
      city: text(form, "city") || null,
      price,
      details: details || null,
      images: media,
      user_type: userType || null,
      owner_name: ownerName || null,
      owner_email: ownerEmail || null,
      owner_phone: ownerPhone || null,
      account_consent: wantsAccount,
      source: (SOURCES as readonly string[]).includes(source) ? source : "banner",
      user_id: userId,
      user_email: session?.email ?? ownerEmail ?? null,
      status: "pending_review",
      created_at: new Date(),
    });

    return NextResponse.json({
      success: true,
      id: result.insertedId.toString(),
      account_created: accountCreated,
    });
  } catch (error) {
    return NextResponse.json({ error: getAuthDbErrorMessage(error) }, { status: 503 });
  }
}
