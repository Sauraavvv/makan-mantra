#!/usr/bin/env node

/**
 * Upload each local news banner to Cloudinary's `blog` folder, then persist the
 * matching article to MongoDB. A rerun overwrites the same `blog/<slug>` image
 * and upserts the same `news:<slug>` document, so the operation is repeatable.
 *
 * Usage:
 *   node --env-file=.env.local scripts/import-news-to-cloudinary.mjs
 *   node --env-file=.env.local scripts/import-news-to-cloudinary.mjs --dry-run
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";
import { MongoClient } from "mongodb";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(scriptDir, "..");
const projectRoot = resolve(frontendRoot, "..");
const workspaceRoot = resolve(projectRoot, "..");
const newsDirectory = resolve(workspaceRoot, "chatgpt news data");
const dryRun = process.argv.includes("--dry-run");

const requiredEnvironment = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "MONGODB_URL",
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

function assertNewsPayload(value, sourcePath) {
  if (!value || typeof value !== "object") throw new Error(`${sourcePath}: JSON object expected`);

  const required = ["slug", "title", "summary", "content", "category", "publishedAt", "updatedAt"];
  const missing = required.filter((field) => !value[field]);
  if (missing.length > 0) throw new Error(`${sourcePath}: missing ${missing.join(", ")}`);
  if (!value.featuredImage?.altText) throw new Error(`${sourcePath}: featuredImage.altText is required`);
}

async function findNewsEntries() {
  const directories = await readdir(newsDirectory, { withFileTypes: true });
  const entries = [];

  for (const directory of directories.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!directory.isDirectory()) continue;

    const sourceDirectory = join(newsDirectory, directory.name);
    const jsonPath = join(sourceDirectory, "news.json");
    const bannerPath = join(sourceDirectory, "banner.png");
    const [raw, banner] = await Promise.all([
      readFile(jsonPath, "utf8"),
      stat(bannerPath),
    ]);
    if (!banner.isFile()) throw new Error(`${bannerPath}: banner image is not a file`);

    const news = JSON.parse(raw);
    assertNewsPayload(news, jsonPath);
    if (news.slug !== directory.name) {
      throw new Error(`${jsonPath}: slug must match its directory name`);
    }
    entries.push({ news, bannerPath });
  }

  if (entries.length === 0) throw new Error(`No news.json files found in ${newsDirectory}`);
  return entries;
}

async function run() {
  const entries = await findNewsEntries();
  console.log(`${dryRun ? "Would import" : "Importing"} ${entries.length} news articles`);

  if (dryRun) {
    for (const { news } of entries) console.log(`  ${news.slug} → blog/${news.slug}`);
    return;
  }

  const client = new MongoClient(process.env.MONGODB_URL);
  const collection = client.db("makan_mantraa").collection("news");
  await collection.createIndex("slug", { unique: true });
  await collection.createIndex({ status: 1, publishedAt: -1 });

  let inserted = 0;
  let updated = 0;

  try {
    for (const { news, bannerPath } of entries) {
      const uploaded = await cloudinary.uploader.upload(bannerPath, {
        resource_type: "image",
        folder: "blog",
        public_id: news.slug,
        overwrite: true,
        invalidate: true,
        tags: ["blog", "news"],
      });

      const now = new Date().toISOString();
      const document = {
        ...news,
        _id: `news:${news.slug}`,
        document_type: "news",
        featuredImage: {
          ...news.featuredImage,
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          width: uploaded.width,
          height: uploaded.height,
          format: uploaded.format,
          bytes: uploaded.bytes,
        },
        updated_at: now,
      };

      const result = await collection.updateOne(
        { _id: document._id },
        { $set: document, $setOnInsert: { created_at: now } },
        { upsert: true },
      );

      if (result.upsertedId) inserted += 1;
      else if (result.modifiedCount > 0) updated += 1;
      console.log(`  ${result.upsertedId ? "inserted" : result.modifiedCount > 0 ? "updated" : "unchanged"}: ${news.slug}`);
    }
  } finally {
    await client.close();
  }

  console.log(`Done — inserted: ${inserted}, updated: ${updated}`);
}

run().catch((error) => {
  console.error(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
