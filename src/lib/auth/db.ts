import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URL!;
let client: MongoClient;

async function getClient() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client;
}

export async function getUsersCollection() {
  const c = await getClient();
  return c.db("makan_mantraa").collection("users");
}

export async function getPendingUsersCollection() {
  const c = await getClient();
  return c.db("makan_mantraa").collection("pending_users");
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
