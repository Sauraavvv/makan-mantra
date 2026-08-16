#!/usr/bin/env node

/**
 * Upload every builder logo to Cloudinary's `builders` folder and regenerate
 * `src/data/builder-logos.json`, the map the Top Builders pages read.
 *
 * The images live outside the repo, in `<workspace>/logos`, as one folder per
 * builder holding a single file — `dlf_logo/dlf_logo_003_736x736.jpg`. Folder
 * names are matched to the registered names in `state-builders.json` by
 * stripping company forms, brackets and punctuation from both sides, so the
 * two lists can be spelt differently and still line up.
 *
 * A rerun overwrites the same `builders/<slug>` asset and rewrites the same
 * JSON, so the operation is repeatable.
 *
 * `--builder` replaces one logo from a file anywhere on disk, which is how a
 * single builder gets a better image without a full sweep. It overwrites the
 * same `public_id`, so the old asset is gone and every page picks the new one
 * up on the next request.
 *
 * Usage:
 *   node --env-file=.env.local scripts/upload-builder-logos.mjs
 *   node --env-file=.env.local scripts/upload-builder-logos.mjs --dry-run
 *   node --env-file=.env.local scripts/upload-builder-logos.mjs \
 *     --builder "Amitus Infra" --file ~/Downloads/logo.jpeg
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(scriptDir, "..");
const workspaceRoot = resolve(frontendRoot, "..", "..");
const logosDirectory = resolve(workspaceRoot, "logos");
const buildersDataPath = resolve(frontendRoot, "src/data/state-builders.json");
const logoMapPath = resolve(frontendRoot, "src/data/builder-logos.json");
const dryRun = process.argv.includes("--dry-run");

function argumentValue(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

const singleBuilder = argumentValue("--builder");
const singleFile = argumentValue("--file");

const CLOUDINARY_FOLDER = "builders";

/**
 * Logos that are light ink on a transparent background: on a white tile they
 * range from faint to fully invisible, so the page puts them on its navy one.
 * Judged by eye against both backgrounds — a contrast score alone gets it
 * wrong for logos carrying their own white plate, like Ganesh Housing.
 */
const DARK_TILE_SLUGS = new Set([
  "z-estates",
  "vinco-construction",
  "rahaman-construction",
  "pranami-group",
  "sage-realty",
  "okaville-developers",
  "jain-housing-constructions",
  "sevvi-construction",
  "manglam-build-developers",
  "ashiana-housing",
  "kanglei-construction-consultant",
  "shalimar-corp",
  "homeland-group",
  "janta-land-promoters",
]);

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

/**
 * Reduces a builder name or a folder name to the words that identify the
 * company: no legal form, no bracketed aside, no "M/s" prefix, no punctuation.
 * "M/S Tripureswari Developers" and `tripureswari_developers_logo` both land on
 * "tripureswari developers".
 */
function matchKey(value) {
  return value
    .toLowerCase()
    .replace(/^m\s*\/?\s*s\b\.?/, " ")
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(?:private|pvt|limited|ltd|llp|inc|co|company|corp|corporation|and|&)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** `dlf_logo` → `dlf`, the slug the Cloudinary asset is stored under. */
function folderSlug(folderName) {
  return folderName.replace(/_logo$/, "").replace(/_/g, "-");
}

async function findLogoFiles() {
  const entries = await readdir(logosDirectory, { withFileTypes: true });
  const logos = new Map();

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const files = (await readdir(join(logosDirectory, entry.name))).filter(
      (file) => !file.startsWith("."),
    );
    if (files.length !== 1) {
      throw new Error(`${entry.name}: expected exactly one image, found ${files.length}`);
    }

    logos.set(matchKey(folderSlug(entry.name).replace(/-/g, " ")), {
      slug: folderSlug(entry.name),
      path: join(logosDirectory, entry.name, files[0]),
    });
  }

  if (logos.size === 0) throw new Error(`No logo folders found in ${logosDirectory}`);
  return logos;
}

/**
 * Replaces a single builder's logo. The slug comes from the existing map, so
 * the asset keeps the id the pages already point at and the caller only has to
 * name the builder — any spelling that matches, suffix or not.
 */
async function replaceOne(builderName, filePath) {
  const logoMap = JSON.parse(await readFile(logoMapPath, "utf8"));
  const wanted = matchKey(builderName);
  const entry = Object.entries(logoMap).find(([name]) => matchKey(name) === wanted);
  if (!entry) throw new Error(`No builder in builder-logos.json matches "${builderName}"`);

  const publicId = entry[1].id;
  if (dryRun) {
    console.log(`Would replace ${publicId} with ${filePath}`);
    return;
  }

  const uploaded = await cloudinary.uploader.upload(resolve(filePath), {
    resource_type: "image",
    public_id: publicId,
    overwrite: true,
    invalidate: true,
    tags: ["builders", "logo"],
  });

  console.log(
    `Replaced ${uploaded.public_id} — ${uploaded.width}x${uploaded.height} ${uploaded.format}, ${Math.round(uploaded.bytes / 1024)} KB`,
  );
  console.log(`  covers: ${Object.keys(logoMap).filter((name) => logoMap[name].id === publicId).join(", ")}`);
}

async function run() {
  if (singleBuilder || singleFile) {
    if (!singleBuilder || !singleFile) {
      throw new Error("--builder and --file go together");
    }
    return replaceOne(singleBuilder, singleFile);
  }

  const [logos, buildersRaw] = await Promise.all([
    findLogoFiles(),
    readFile(buildersDataPath, "utf8"),
  ]);

  const builderNames = [
    ...new Set(
      Object.values(JSON.parse(buildersRaw))
        .flat()
        .map((builder) => builder.builder_name.trim()),
    ),
  ].sort((left, right) => left.localeCompare(right));

  // Every name must resolve: a silent miss would drop a logo off the page.
  const pairs = builderNames.map((name) => {
    const logo = logos.get(matchKey(name));
    if (!logo) throw new Error(`No logo folder matches "${name}"`);
    return { name, logo };
  });

  const unused = [...logos.values()].filter(
    (logo) => !pairs.some((pair) => pair.logo.slug === logo.slug),
  );
  for (const logo of unused) console.warn(`  unused logo folder: ${logo.slug}`);

  console.log(
    `${dryRun ? "Would upload" : "Uploading"} ${logos.size} logos for ${pairs.length} builder names`,
  );

  // The same file backs several names where the data spells one company two
  // ways, so each slug is uploaded once and the id reused.
  const uploadedBySlug = new Map();
  const logoMap = {};

  for (const { name, logo } of pairs) {
    if (!uploadedBySlug.has(logo.slug)) {
      if (dryRun) {
        console.log(`  ${logo.slug}${extname(logo.path)} → ${CLOUDINARY_FOLDER}/${logo.slug}`);
        uploadedBySlug.set(logo.slug, `${CLOUDINARY_FOLDER}/${logo.slug}`);
      } else {
        const uploaded = await cloudinary.uploader.upload(logo.path, {
          resource_type: "image",
          folder: CLOUDINARY_FOLDER,
          public_id: logo.slug,
          overwrite: true,
          invalidate: true,
          tags: ["builders", "logo"],
        });
        uploadedBySlug.set(logo.slug, uploaded.public_id);
        console.log(`  uploaded: ${uploaded.public_id} (${uploaded.width}x${uploaded.height})`);
      }
    }

    logoMap[name] = { id: uploadedBySlug.get(logo.slug) };
    if (DARK_TILE_SLUGS.has(logo.slug)) logoMap[name].tile = "dark";
  }

  if (dryRun) return;

  await writeFile(logoMapPath, `${JSON.stringify(logoMap, null, 2)}\n`);
  console.log(`Done — ${uploadedBySlug.size} assets, ${Object.keys(logoMap).length} names mapped`);
}

run().catch((error) => {
  console.error(`Upload failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
