import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

/**
 * Admins get their own cookie. Keeping it apart from `mm_session` means a site
 * visitor's session can never be mistaken for an admin one, and signing out of
 * one does not touch the other.
 */
export const ADMIN_COOKIE = "mm_admin";

const MAX_AGE_SECONDS = 60 * 60 * 8;

export type AdminSession = {
  adminId: string;
  email: string;
  name: string;
};

export async function createAdminSession(payload: AdminSession) {
  const token = await new SignJWT({ ...payload, kind: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function readAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.kind !== "admin") return null;

    return {
      adminId: String(payload.adminId),
      email: String(payload.email),
      name: String(payload.name),
    };
  } catch {
    return null;
  }
}

export async function deleteAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}
