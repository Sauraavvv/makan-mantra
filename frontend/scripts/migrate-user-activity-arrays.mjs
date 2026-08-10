/**
 * Collapses saved properties and recent searches into one document per user.
 * Safe to run again: both legacy rows and the new array documents are accepted.
 *
 *   npm run migrate:user-activity
 */
import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";

const envPath = path.join(process.cwd(), ".env.local");

if (!fs.existsSync(envPath)) {
  console.error("Run this from the frontend directory (.env.local not found).");
  process.exit(1);
}

const url = fs.readFileSync(envPath, "utf8").match(/^MONGODB_URL=(.+)$/m)?.[1]?.trim();

if (!url) {
  console.error("MONGODB_URL is missing from .env.local");
  process.exit(1);
}

function activityTime(document, legacyField) {
  const value = document.updated_at ?? document[legacyField];
  const time = value instanceof Date ? value.getTime() : new Date(value ?? 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function addUnique(target, values, normalize = (value) => value) {
  const seen = new Set(target.map(normalize));
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    const key = normalize(trimmed);
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    target.push(trimmed);
  }
}

function groupSaved(documents) {
  const grouped = new Map();
  documents.sort((left, right) => activityTime(right, "saved_at") - activityTime(left, "saved_at"));

  for (const document of documents) {
    if (typeof document.user_id !== "string" || !document.user_id) continue;
    const current = grouped.get(document.user_id) ?? [];
    const ids = Array.isArray(document.property_ids)
      ? document.property_ids
      : [document.property_id];
    addUnique(current, ids);
    grouped.set(document.user_id, current);
  }

  return [...grouped].map(([user_id, property_ids]) => ({
    user_id,
    property_ids,
    updated_at: new Date(),
  }));
}

function groupSearches(documents) {
  const grouped = new Map();
  documents.sort(
    (left, right) => activityTime(right, "searched_at") - activityTime(left, "searched_at"),
  );

  for (const document of documents) {
    if (typeof document.user_id !== "string" || !document.user_id) continue;
    const current = grouped.get(document.user_id) ?? [];
    const searches = Array.isArray(document.searches) ? document.searches : [document.label];
    addUnique(current, searches, (value) => value.toLowerCase());
    grouped.set(document.user_id, current.slice(0, 10));
  }

  return [...grouped].map(([user_id, searches]) => ({
    user_id,
    searches: searches.slice(0, 10),
    updated_at: new Date(),
  }));
}

async function replaceCollection(db, name, documents) {
  const temporaryName = `${name}_array_migration`;
  await db.collection(temporaryName).drop().catch(() => {});
  await db.createCollection(temporaryName);
  if (documents.length > 0) await db.collection(temporaryName).insertMany(documents);
  await db.collection(temporaryName).rename(name, { dropTarget: true });
  await db.collection(name).createIndex({ user_id: 1 }, { name: "user_id_unique", unique: true });
}

async function backupCollection(db, name, documents, suffix) {
  const backupName = `${name}_backup_${suffix}`;
  await db.createCollection(backupName);
  if (documents.length > 0) await db.collection(backupName).insertMany(documents);

  const backedUp = await db.collection(backupName).countDocuments();
  if (backedUp !== documents.length) {
    throw new Error(`Backup verification failed for ${name}: ${backedUp}/${documents.length}`);
  }
  return backupName;
}

const client = new MongoClient(url);

try {
  await client.connect();
  const db = client.db("makan_mantraa");
  const [savedDocuments, searchDocuments] = await Promise.all([
    db.collection("saved_properties").find({}).toArray(),
    db.collection("recent_searches").find({}).toArray(),
  ]);

  const savedUsers = groupSaved(savedDocuments);
  const searchUsers = groupSearches(searchDocuments);

  const backupSuffix = new Date().toISOString().replace(/[:.]/g, "-");
  const savedBackup = await backupCollection(
    db,
    "saved_properties",
    savedDocuments,
    backupSuffix,
  );
  const searchesBackup = await backupCollection(
    db,
    "recent_searches",
    searchDocuments,
    backupSuffix,
  );

  await replaceCollection(db, "saved_properties", savedUsers);
  await replaceCollection(db, "recent_searches", searchUsers);

  console.log(
    JSON.stringify({
      saved: { before: savedDocuments.length, users: savedUsers.length },
      searches: { before: searchDocuments.length, users: searchUsers.length },
      backups: { saved: savedBackup, searches: searchesBackup },
    }),
  );
} finally {
  await client.close();
}
