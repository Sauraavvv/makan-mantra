/**
 * Ensures the indexes the admin panel relies on. Admin accounts themselves are
 * created through /admin/setup, so this script does not touch them.
 *
 *   node scripts/admin-indexes.mjs
 */
import { MongoClient } from "mongodb";
import fs from "node:fs";
import path from "node:path";

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

const client = new MongoClient(url);
await client.connect();
const db = client.db("makan_mantraa");

await db.collection("property_submissions").createIndexes([
  { key: { created_at: -1 }, name: "created_at_desc" },
  { key: { owner_email: 1 }, name: "owner_email" },
  { key: { owner_phone: 1 }, name: "owner_phone" },
]);
console.log("✓ property_submissions indexes");

await db.collection("admin_users").createIndexes([
  { key: { email: 1 }, name: "email_unique", unique: true },
]);
console.log("✓ admin_users unique email index");

await client.close();
