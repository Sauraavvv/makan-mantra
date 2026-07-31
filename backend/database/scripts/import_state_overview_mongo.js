const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "../..");
const WORKSPACE_ROOT = path.resolve(PROJECT_ROOT, "..");
const ENV_PATH = path.join(PROJECT_ROOT, "backend", ".env");
const DATA_DIR = path.join(WORKSPACE_ROOT, "state pages data");
const COORDINATES_PATH = path.join(DATA_DIR, "state_coordinates.json");

function readEnvValue(key) {
  const env = fs.readFileSync(ENV_PATH, "utf8");
  const line = env
    .split(/\r?\n/)
    .find((item) => item.trim().startsWith(`${key}=`));

  return line ? line.slice(line.indexOf("=") + 1).trim() : process.env[key];
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadCoordinates() {
  if (!fs.existsSync(COORDINATES_PATH)) {
    return new Map();
  }

  const data = loadJson(COORDINATES_PATH);
  return new Map((data.states || []).map((item) => [item.slug, item]));
}

function buildDocument(raw, coordinatesBySlug) {
  const slug = raw.slug;

  if (!slug) {
    throw new Error("Missing slug");
  }

  const now = new Date().toISOString();
  const coords = coordinatesBySlug.get(slug);

  return {
    _id: `state_overview:${slug}`,
    document_type: "state_overview",
    slug,
    route_slug: `explore-${slug}`,
    route_path: `/explore-${slug}`,
    state_name: raw.state_name,
    state_type: raw.state_type,
    country: raw.country || "India",
    location: {
      country: raw.country || "India",
      state: raw.state_name,
      state_type: raw.state_type,
      coordinates: coords
        ? {
            latitude: coords.latitude,
            longitude: coords.longitude,
          }
        : null,
    },
    seo: raw.seo || {},
    overview: raw.overview || {},
    connectivity: raw.connectivity || {},
    social_infrastructure: raw.social_infrastructure || {},
    lifestyle_environment: raw.lifestyle_environment || {},
    investment_angle: raw.investment_angle || {},
    faq: raw.faq || [],
    sources: raw.sources || {},
    is_active: true,
    content_version: 1,
    updated_at: now,
  };
}

async function main() {
  const mongodbUrl = readEnvValue("MONGODB_URL");

  if (!mongodbUrl) {
    throw new Error("MONGODB_URL not found. Check backend/.env");
  }

  const coordinatesBySlug = loadCoordinates();
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((file) => file.endsWith(".json") && file !== "state_coordinates.json")
    .sort();

  const client = new MongoClient(mongodbUrl);
  await client.connect();

  const col = client.db("makan_mantraa").collection("state_overview");
  await col.createIndex({ slug: 1 }, { unique: true });
  await col.createIndex({ route_slug: 1 }, { unique: true });
  await col.createIndex({ "location.state": 1 });
  await col.createIndex({ is_active: 1 });

  let upserted = 0;
  let modified = 0;
  let errors = 0;

  for (const file of files) {
    try {
      const raw = loadJson(path.join(DATA_DIR, file));
      const doc = buildDocument(raw, coordinatesBySlug);
      const existing = await col.findOne({ _id: doc._id }, { projection: { created_at: 1 } });

      doc.created_at = existing?.created_at || doc.updated_at;

      const result = await col.updateOne(
        { _id: doc._id },
        { $set: doc },
        { upsert: true },
      );

      if (result.upsertedCount) {
        upserted += result.upsertedCount;
      } else {
        modified += result.modifiedCount;
      }
    } catch (error) {
      errors += 1;
      console.error(`Error importing ${file}: ${error.message}`);
    }
  }

  const unchanged = files.length - upserted - modified - errors;
  console.log(`Done - files: ${files.length}, upserted: ${upserted}, modified: ${modified}, unchanged: ${unchanged}, errors: ${errors}`);

  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
