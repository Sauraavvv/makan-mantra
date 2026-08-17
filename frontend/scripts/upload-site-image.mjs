#!/usr/bin/env node

/**
 * Put one image on Cloudinary under `site/`, for the artwork the pages
 * themselves wear — heroes, banners, illustrations — as against the property
 * and builder media that have their own folders and their own scripts.
 *
 * The upload is the untouched original: no resizing, no re-encoding. Delivery
 * decides the size and the format, so one upload serves every screen and can be
 * asked for a larger one later without going back to the source.
 *
 * A rerun overwrites the same `site/<public-id>`, so a replaced image keeps its
 * URL and every page that points at it follows.
 *
 * Usage:
 *   node --env-file=.env.local scripts/upload-site-image.mjs <file> <public-id>
 *   node --env-file=.env.local scripts/upload-site-image.mjs hero.png hero-home --dry-run
 */
import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { v2 as cloudinary } from "cloudinary";

const CLOUDINARY_FOLDER = "site";

const [file, publicId] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const dryRun = process.argv.includes("--dry-run");

if (!file || !publicId) {
  throw new Error("Usage: upload-site-image.mjs <file> <public-id> [--dry-run]");
}

if (!/^[a-z0-9-]+$/.test(publicId)) {
  throw new Error("public-id should be lowercase words joined by hyphens");
}

const requiredEnvironment = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

const missingEnvironment = requiredEnvironment.filter((key) => !process.env[key]);
if (missingEnvironment.length > 0) {
  throw new Error(`Missing environment variables: ${missingEnvironment.join(", ")}`);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

async function run() {
  const path = resolve(file);
  const source = await stat(path);
  if (!source.isFile()) throw new Error(`${path}: not a file`);

  if (dryRun) {
    console.log(`Would upload ${path} → ${CLOUDINARY_FOLDER}/${publicId}`);
    return;
  }

  const uploaded = await cloudinary.uploader.upload(path, {
    resource_type: "image",
    folder: CLOUDINARY_FOLDER,
    public_id: publicId,
    overwrite: true,
    invalidate: true,
    tags: ["site"],
  });

  console.log(
    `Uploaded ${uploaded.public_id} — ${uploaded.width}x${uploaded.height} ${uploaded.format}, ${Math.round(uploaded.bytes / 1024)} KB`,
  );
  console.log(`  cldUrl("${uploaded.public_id}", …)`);
}

run().catch((error) => {
  console.error(`Upload failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
