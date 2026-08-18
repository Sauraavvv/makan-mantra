#!/usr/bin/env node

/**
 * Upload the normalized state banners used by state-level Explore pages.
 *
 * A filename such as `Madhya Pradesh.png` becomes the permanent Cloudinary id
 * `site/explore-state-madhya-pradesh`. Rerunning replaces that one asset, so
 * the page URL never needs to change when a banner is refreshed.
 *
 * Usage:
 *   node --env-file=.env.local scripts/upload-state-explore-banners.mjs
 *   node --env-file=.env.local scripts/upload-state-explore-banners.mjs --dry-run
 */
import { readdir, stat } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(scriptDirectory, "..");
const workspaceRoot = resolve(frontendRoot, "..", "..");
const sourceDirectory = resolve(workspaceRoot, "normalized state images");
const dryRun = process.argv.includes("--dry-run");
const CLOUDINARY_FOLDER = "site";

function stateSlug(state) {
  return state
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

async function findBanners() {
  const entries = await readdir(sourceDirectory, { withFileTypes: true });
  const banners = entries
    .filter((entry) => entry.isFile() && [".png", ".jpg", ".jpeg", ".webp"].includes(extname(entry.name).toLowerCase()))
    .map((entry) => ({
      state: entry.name.slice(0, -extname(entry.name).length),
      path: join(sourceDirectory, entry.name),
    }))
    .sort((first, second) => first.state.localeCompare(second.state));

  if (banners.length === 0) throw new Error(`No banners found in ${sourceDirectory}`);

  for (const banner of banners) {
    const source = await stat(banner.path);
    if (!source.isFile()) throw new Error(`${banner.path}: not a file`);
  }

  return banners;
}

async function run() {
  const banners = await findBanners();
  console.log(`${dryRun ? "Would upload" : "Uploading"} ${banners.length} state Explore banners`);

  for (const banner of banners) {
    const publicId = `explore-state-${stateSlug(banner.state)}`;

    if (dryRun) {
      console.log(`  ${banner.state} → ${CLOUDINARY_FOLDER}/${publicId}`);
      continue;
    }

    const uploaded = await cloudinary.uploader.upload(banner.path, {
      resource_type: "image",
      folder: CLOUDINARY_FOLDER,
      public_id: publicId,
      overwrite: true,
      invalidate: true,
      tags: ["site", "state-explore-banner"],
    });
    console.log(`  ✓ ${banner.state} → ${uploaded.public_id}`);
  }
}

run().catch((error) => {
  console.error(`Upload failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
