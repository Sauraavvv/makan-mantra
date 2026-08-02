import { NextResponse } from "next/server";
import { cloudinary, DRAFT_TAG, UPLOAD_FOLDER, isCloudinaryConfigured } from "@/lib/cloudinary";

/**
 * Hands the browser a short-lived signature so it can upload straight to
 * Cloudinary. The file never passes through this server, which keeps us clear
 * of the serverless request body limit.
 *
 * Only the params signed here are accepted by Cloudinary, so the client cannot
 * redirect the upload to another folder or drop the draft tag.
 */
export async function POST() {
  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: "Uploads are not configured" }, { status: 503 });
  }

  const timestamp = Math.round(Date.now() / 1000);

  const params = {
    timestamp,
    folder: UPLOAD_FOLDER,
    tags: DRAFT_TAG,
  };

  const signature = cloudinary.utils.api_sign_request(
    params,
    process.env.CLOUDINARY_API_SECRET!,
  );

  return NextResponse.json({
    ...params,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  });
}
