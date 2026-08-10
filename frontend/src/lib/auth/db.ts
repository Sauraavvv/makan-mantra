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

/** One shortlist document per user; listing details resolve from these IDs. */
export type PropertySnapshot = {
  title: string;
  price: string;
  locality: string;
  city: string;
  image: string;
  config?: string;
  area?: string;
};

export type SavedPropertiesDoc = {
  _id?: ObjectId;
  user_id: string;
  property_ids: string[];
  updated_at: Date;
};

export async function getSavedPropertiesCollection() {
  const c = await getClient();
  return c.db("makan_mantraa").collection<SavedPropertiesDoc>("saved_properties");
}

export type RecentPropertyDoc = {
  _id?: ObjectId;
  user_id: string;
  property_id: string;
  snapshot: PropertySnapshot;
  viewed_at: Date;
};

export async function getRecentPropertiesCollection() {
  const c = await getClient();
  return c.db("makan_mantraa").collection<RecentPropertyDoc>("recent_properties");
}

export type RecentSearchesDoc = {
  _id?: ObjectId;
  user_id: string;
  searches: string[];
  updated_at: Date;
};

export async function getRecentSearchesCollection() {
  const c = await getClient();
  return c.db("makan_mantraa").collection<RecentSearchesDoc>("recent_searches");
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
  /** Public-facing relationship to property transactions, separate from auth role. */
  profile_role?: "broker" | "owner" | "builder" | null;
  profile_image?: {
    public_id: string;
    url: string;
    width: number;
    height: number;
  } | null;
  /** Collected by the post-property wizard; editable from the profile page. */
  phone?: string | null;
  alternate_phone?: string | null;
  /** Seeds the location picker on every device, ahead of browser geolocation. */
  preferred_state?: string | null;
  /** City preference; may be a database option or user-entered value. */
  preferred_city?: string | null;
  gender?: string | null;
  address?: string | null;
  /** Absent means active — only a deactivation ever writes `false`. */
  is_active?: boolean;
  deactivated_at?: Date | null;
  /**
   * A code-gated change waiting on the mailbox: swapping the email, or closing
   * the account. Only one can be in flight, which is the point.
   */
  account_action?: {
    kind: "email_change" | "deactivate";
    otp: string;
    expires: Date;
    new_email?: string;
  } | null;
  email_verified: boolean;
  otp?: string | null;
  otp_expires?: Date | null;
  provider: "email" | "google";
  created_at: Date;
};
