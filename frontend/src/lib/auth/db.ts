import { MongoClient, ObjectId } from "mongodb";

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

/**
 * Page collections were seeded in more than one pass, so `_id` is a readable
 * string on some documents and a real ObjectId on others. Both spellings have
 * to be accepted when looking a page up.
 */
export type PageDoc = {
  _id: string | ObjectId;
  slug?: string;
  route_slug?: string;
  is_active?: boolean;
  [key: string]: unknown;
};

export async function getLocationPagesCollection() {
  const c = await getClient();
  return c.db("makan_mantraa").collection<PageDoc>("location_pages");
}

export async function getStateOverviewCollection() {
  const c = await getClient();
  return c.db("makan_mantraa").collection<PageDoc>("state_overview");
}

export async function getDistrictOverviewCollection() {
  const c = await getClient();
  return c.db("makan_mantraa").collection<PageDoc>("district_overview");
}

export async function getNewsletterCollection() {
  const c = await getClient();
  return c.db("makan_mantraa").collection("newsletter_subscribers");
}

export async function getPropertySubmissionsCollection() {
  const c = await getClient();
  return c.db("makan_mantraa").collection("property_submissions");
}

/** Admins live apart from site users — separate collection, separate session. */
export async function getAdminUsersCollection() {
  const c = await getClient();
  return c.db("makan_mantraa").collection("admin_users");
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
