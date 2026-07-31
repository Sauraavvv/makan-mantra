import { NextRequest, NextResponse } from "next/server";
import { getAuthDbErrorMessage, getPropertySubmissionsCollection } from "@/lib/auth/db";
import { getSession } from "@/lib/auth/session";
import { PROPERTY_TYPES } from "@/lib/constants/propertyTypes";

const LISTING_TYPES = ["buy", "rent"] as const;
const SOURCES = ["banner", "post_property_page"] as const;

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export async function POST(req: NextRequest) {
  let form: FormData;

  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form submission" }, { status: 400 });
  }

  const propertyType = String(form.get("property_type") || "");
  const listingType = String(form.get("listing_type") || "");
  const location = String(form.get("location") || "").trim();
  const price = Number(form.get("price"));
  const details = String(form.get("details") || "").trim();
  const source = String(form.get("source") || "");

  if (!(propertyType in PROPERTY_TYPES)) {
    return NextResponse.json({ error: "Please select a valid property type" }, { status: 400 });
  }

  if (!LISTING_TYPES.includes(listingType as (typeof LISTING_TYPES)[number])) {
    return NextResponse.json({ error: "Please select a valid listing type" }, { status: 400 });
  }

  if (!location) {
    return NextResponse.json({ error: "Please enter a location" }, { status: 400 });
  }

  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: "Please enter a valid price" }, { status: 400 });
  }

  const files = form.getAll("images").filter((entry): entry is File => entry instanceof File);

  if (files.length > MAX_IMAGES) {
    return NextResponse.json(
      { error: `You can upload up to ${MAX_IMAGES} images` },
      { status: 400 },
    );
  }

  const images = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: `"${file.name}" is not an image` }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: `"${file.name}" is larger than 2MB` }, { status: 400 });
    }

    images.push({
      filename: file.name,
      content_type: file.type,
      size: file.size,
      data: Buffer.from(await file.arrayBuffer()).toString("base64"),
    });
  }

  try {
    const session = await getSession();
    const submissions = await getPropertySubmissionsCollection();

    const result = await submissions.insertOne({
      property_type: propertyType,
      listing_type: listingType,
      location,
      price,
      details: details || null,
      images,
      source: (SOURCES as readonly string[]).includes(source) ? source : "banner",
      user_id: session?.userId ?? null,
      user_email: session?.email ?? null,
      status: "pending_review",
      created_at: new Date(),
    });

    return NextResponse.json({ success: true, id: result.insertedId.toString() });
  } catch (error) {
    return NextResponse.json({ error: getAuthDbErrorMessage(error) }, { status: 503 });
  }
}
