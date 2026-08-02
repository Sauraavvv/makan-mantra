import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { getAdminUsersCollection } from "@/lib/auth/db";
import { readAdminSession, type AdminSession } from "@/lib/auth/admin-session";

export type AdminUser = {
  _id?: ObjectId;
  name: string;
  email: string;
  password: string;
  active: boolean;
  created_at: Date;
  created_by: string | null;
  last_login_at: Date | null;
};

/** True while no admin exists — the only window in which /admin/setup works. */
export async function hasAnyAdmin() {
  const admins = await getAdminUsersCollection();
  return (await admins.countDocuments({}, { limit: 1 })) > 0;
}

/**
 * The cookie carries the admin's id for 8 hours, so an account that was
 * disabled in the meantime would still hold a valid token. Every guarded
 * request re-reads the record instead of trusting the claim.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await readAdminSession();
  if (!session || !ObjectId.isValid(session.adminId)) return null;

  try {
    const admins = await getAdminUsersCollection();
    const admin = await admins.findOne({ _id: new ObjectId(session.adminId) });
    return admin && admin.active !== false ? session : null;
  } catch {
    return null;
  }
}

/** Page/layout guard — bounces anyone who is not a signed-in admin. */
export async function requireAdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** API guard — `response` is non-null when the caller must be turned away. */
export async function requireAdminApi() {
  const session = await getAdminSession();

  if (!session) {
    return {
      session: null,
      response: Response.json({ error: "Not authorised" }, { status: 403 }),
    };
  }

  return { session, response: null };
}
