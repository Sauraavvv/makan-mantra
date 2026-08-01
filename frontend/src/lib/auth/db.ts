import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URL!;
let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

const MONGO_TIMEOUT_MS = 5000;

export function getAuthDbErrorMessage(error: unknown) {
  if (!process.env.MONGODB_URL) {
    return "Authentication is temporarily unavailable. Server database is not configured.";
  }

  if (
    error instanceof Error &&
    ("code" in error || error.message.toLowerCase().includes("mongodb"))
  ) {
    return "Authentication is temporarily unavailable. Please try again in a moment.";
  }

  return "Something went wrong while accessing your account. Please try again.";
}

async function getClient() {
  if (!client) {
    client = new MongoClient(uri, {
      connectTimeoutMS: MONGO_TIMEOUT_MS,
      serverSelectionTimeoutMS: MONGO_TIMEOUT_MS,
      socketTimeoutMS: MONGO_TIMEOUT_MS,
    });
  }

  if (!clientPromise) {
    clientPromise = client.connect().catch((error) => {
      clientPromise = null;
      client = null;
      throw error;
    });
  }

  return clientPromise;
}

export async function getUsersCollection() {
  const c = await getClient();
  return c.db("makan_mantraa").collection("users");
}

export async function getPendingUsersCollection() {
  const c = await getClient();
  return c.db("makan_mantraa").collection("pending_users");
}

export async function getLocationPagesCollection() {
  const c = await getClient();
  return c.db("makan_mantraa").collection("location_pages");
}

export async function getPropertySubmissionsCollection() {
  const c = await getClient();
  return c.db("makan_mantraa").collection("property_submissions");
}

export type UserDoc = {
  _id?: string;
  name: string;
  email: string;
  password: string | null;
  role: "user" | "agent" | "admin";
  email_verified: boolean;
  otp?: string | null;
  otp_expires?: Date | null;
  provider: "email" | "google";
  created_at: Date;
};
