import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { getUsersCollection } from "@/lib/auth/db";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE = "mm_session";

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: string;
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE);
}

/**
 * A session that still has a user behind it.
 *
 * The cookie is a self-contained JWT good for seven days, so it keeps verifying
 * long after the account it names has been removed. Anything that branches on
 * "is this person signed in" must resolve the record, not just the signature —
 * `getAdminSession` does the same for admins.
 */
export async function getLiveSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session?.userId) return null;

  if (!ObjectId.isValid(session.userId)) return null;

  try {
    const users = await getUsersCollection();
    const user = await users.findOne(
      { _id: new ObjectId(session.userId) },
      { projection: { _id: 1, is_active: 1 } },
    );

    // The cookie stays valid for days, so it has to be checked against the
    // account behind it: deleting removes the row, and deactivating leaves one
    // that must stop counting as a signed-in person.
    if (!user || user.is_active === false) return null;

    return session;
  } catch {
    // A database blip should not silently sign everyone out mid-request.
    return session;
  }
}
