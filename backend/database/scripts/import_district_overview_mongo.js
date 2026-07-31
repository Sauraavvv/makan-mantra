const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

const SCRIPT_DIR = __dirname;
const BACKEND_ROOT = path.resolve(SCRIPT_DIR, "../..");
const PROJECT_ROOT = path.resolve(BACKEND_ROOT, "..");
const WORKSPACE_ROOT = path.resolve(PROJECT_ROOT, "..");
const ENV_PATH = path.join(BACKEND_ROOT, ".env");
const DEFAULT_JSON_PATH = path.join(WORKSPACE_ROOT, "district_names_district_overview_results_final.json");
const BACKUP_DIR = path.join(BACKEND_ROOT, "database", "backups");
const DB_NAME = process.env.MONGODB_DB || "makan_mantraa";
const COLLECTION_NAME = "district_overview";

function readEnvValue(key) {
  if (process.env[key]) return process.env[key];
  const env = fs.readFileSync(ENV_PATH, "utf8");
  const line = env
    .split(/\r?\n/)
    .find((item) => item.trim().startsWith(`${key}=`));

  return line ? line.slice(line.indexOf("=") + 1).trim() : "";
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    apply: false,
    jsonPath: DEFAULT_JSON_PATH,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--apply") {
      options.apply = true;
    } else if (arg === "--json-path") {
      options.jsonPath = path.resolve(args[index + 1]);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function canonicalDistrictSlug(record) {
  return `${normalizeKey(record.district_name)}-${normalizeKey(record.state_name)}`;
}

function normalizeRecords(data) {
  const input = Array.isArray(data) ? data : data.results || data.data || data.documents || [data];
  const records = [];
  const seen = new Map();
  const duplicateSlugs = [];

  input.forEach((record, index) => {
    if (!record || typeof record !== "object") {
      throw new Error(`Invalid district record at index ${index}`);
    }
    if (!record.slug || !record.state_name || !record.district_name) {
      throw new Error(`Missing slug/state_name/district_name at index ${index}`);
    }
    const canonicalSlug = canonicalDistrictSlug(record);
    if (seen.has(canonicalSlug)) {
      const existing = seen.get(canonicalSlug);
      if (JSON.stringify(existing) !== JSON.stringify(record)) {
        throw new Error(`Conflicting duplicate district slug: ${canonicalSlug}`);
      }
      duplicateSlugs.push(canonicalSlug);
      return;
    }
    seen.set(canonicalSlug, record);
    records.push(record);
  });

  return { records, duplicateSlugs };
}

function slugAliases(doc) {
  const values = new Set();
  if (doc.slug) values.add(doc.slug);
  if (doc.route_slug) values.add(String(doc.route_slug).replace(/^explore-/, ""));
  if (doc._id && typeof doc._id === "string") values.add(doc._id.replace(/^district_overview:/, ""));
  return [...values];
}

function districtKey(stateName, districtName) {
  return `${normalizeKey(stateName)}::${normalizeKey(districtName)}`;
}

function buildExistingMaps(existingDocs) {
  const bySlug = new Map();
  const byDistrict = new Map();

  for (const doc of existingDocs) {
    for (const slug of slugAliases(doc)) {
      if (slug && !bySlug.has(slug)) {
        bySlug.set(slug, doc);
      }
    }
    const key = districtKey(doc.state_name || doc.location?.state, doc.district_name || doc.location?.district);
    if (key !== "::" && !byDistrict.has(key)) {
      byDistrict.set(key, doc);
    }
  }

  return { bySlug, byDistrict };
}

function buildDocument(raw, existingDoc) {
  const now = new Date().toISOString();
  const slug = canonicalDistrictSlug(raw);
  const coordinates = existingDoc?.location?.coordinates || null;

  return {
    _id: `district_overview:${slug}`,
    document_type: "district_overview",
    slug,
    route_slug: `explore-${slug}`,
    route_path: `/explore-${slug}`,
    district_name: raw.district_name,
    state_name: raw.state_name,
    district_type: raw.district_type || "district",
    country: raw.country || "India",
    location: {
      country: raw.country || "India",
      state: raw.state_name,
      district: raw.district_name,
      district_type: raw.district_type || "district",
      coordinates,
    },
    seo: raw.seo || {},
    overview: raw.overview || {},
    connectivity: raw.connectivity || {},
    real_estate_overview: raw.real_estate_overview || existingDoc?.real_estate_overview || {},
    social_infrastructure: raw.social_infrastructure || {},
    economy_employment: raw.economy_employment || existingDoc?.economy_employment || {},
    lifestyle_environment: raw.lifestyle_environment || {},
    investment_angle: raw.investment_angle || {},
    faq: raw.faq || [],
    sources: raw.sources || {},
    is_active: existingDoc?.is_active ?? true,
    content_version: existingDoc?.content_version || 1,
    created_at: existingDoc?.created_at || now,
    updated_at: now,
  };
}

function writeBackup(existingDocs, indexes) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(BACKUP_DIR, `district_overview_backup_${stamp}.json`);
  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      {
        created_at: new Date().toISOString(),
        database: DB_NAME,
        collection: COLLECTION_NAME,
        count: existingDocs.length,
        indexes,
        documents: existingDocs,
      },
      null,
      2,
    ),
  );
  return backupPath;
}

async function createOrReplaceIndex(col, key, options = {}) {
  try {
    await col.createIndex(key, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!options.name || !/same name|already exists/i.test(message)) {
      throw error;
    }

    await col.dropIndex(options.name);
    await col.createIndex(key, options);
  }
}

async function ensureIndexes(col) {
  await createOrReplaceIndex(col, { slug: 1 }, { name: "slug_1", unique: true });
  await createOrReplaceIndex(col, { route_slug: 1 }, { name: "route_slug_1", unique: true, sparse: true });
  await createOrReplaceIndex(col, { state_name: 1 }, { name: "state_name_1" });
  await createOrReplaceIndex(col, { "location.state": 1 }, { name: "location.state_1" });
  await createOrReplaceIndex(col, { is_active: 1 }, { name: "is_active_1" });
}

async function main() {
  const options = parseArgs();
  const mongodbUrl = readEnvValue("MONGODB_URL");

  if (!mongodbUrl) {
    throw new Error("MONGODB_URL not found. Check backend/.env");
  }

  if (!fs.existsSync(options.jsonPath)) {
    throw new Error(`JSON file not found: ${options.jsonPath}`);
  }

  const { records, duplicateSlugs } = normalizeRecords(loadJson(options.jsonPath));
  const client = new MongoClient(mongodbUrl);

  await client.connect();
  const col = client.db(DB_NAME).collection(COLLECTION_NAME);
  const existingDocs = await col.find({}).toArray();
  const indexes = await col.indexes().catch(() => []);
  const existingMaps = buildExistingMaps(existingDocs);
  const matchedExistingIds = new Set();
  const docs = records.map((record) => {
    const existingDoc =
      existingMaps.bySlug.get(record.slug) ||
      existingMaps.byDistrict.get(districtKey(record.state_name, record.district_name));

    if (existingDoc?._id) {
      matchedExistingIds.add(String(existingDoc._id));
    }

    return buildDocument(record, existingDoc);
  });
  const preservedCoordinates = docs.filter((doc) => doc.location.coordinates).length;
  const matchedExistingCount = matchedExistingIds.size;
  const oldOnlyCount = existingDocs.length - matchedExistingCount;

  console.log(`Loaded records: ${records.length}`);
  if (duplicateSlugs.length > 0) {
    console.log(`Skipped identical duplicate slugs: ${duplicateSlugs.length} (${[...new Set(duplicateSlugs)].join(", ")})`);
  }
  console.log(`Existing DB docs: ${existingDocs.length}`);
  console.log(`Matched existing docs to preserve: ${matchedExistingCount}`);
  console.log(`Preserved coordinates: ${preservedCoordinates}`);
  console.log(`Old docs not in new JSON: ${oldOnlyCount}`);
  console.log(`Mode: ${options.apply ? "APPLY" : "DRY RUN"}`);

  if (!options.apply) {
    await client.close();
    return;
  }

  const backupPath = writeBackup(existingDocs, indexes);
  console.log(`Backup written: ${backupPath}`);

  await col.deleteMany({});
  if (docs.length > 0) {
    await col.insertMany(docs, { ordered: false });
  }
  await ensureIndexes(col);

  const finalCount = await col.countDocuments({});
  console.log(`Done - inserted: ${docs.length}, final count: ${finalCount}`);

  await client.close();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
