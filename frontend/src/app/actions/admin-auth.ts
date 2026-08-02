"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { getAdminUsersCollection, getAuthDbErrorMessage } from "@/lib/auth/db";
import {
  createAdminSession,
  deleteAdminSession,
} from "@/lib/auth/admin-session";
import { getAdminSession, hasAnyAdmin } from "@/lib/auth/admin";

export type AdminAuthState = { error?: string; success?: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 10;

function readCredentials(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  };
}

function validateNewAdmin({ name, email, password }: ReturnType<typeof readCredentials>) {
  if (!name) return "Please enter a name.";
  if (!EMAIL_PATTERN.test(email)) return "Please enter a valid email address.";
  if (password.length < MIN_PASSWORD) {
    return `Password must be at least ${MIN_PASSWORD} characters.`;
  }
  return null;
}

export async function adminLoginAction(
  _prev: AdminAuthState,
  formData: FormData,
): Promise<AdminAuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    const admins = await getAdminUsersCollection();
    const admin = await admins.findOne({ email });

    // One message for every failure so the form cannot be used to discover
    // which admin emails exist.
    const invalid = { error: "Invalid email or password." };

    if (!admin?.password || admin.active === false) return invalid;
    if (!(await bcrypt.compare(password, admin.password))) return invalid;

    await admins.updateOne({ _id: admin._id }, { $set: { last_login_at: new Date() } });

    await createAdminSession({
      adminId: admin._id.toString(),
      email: admin.email,
      name: admin.name,
    });
  } catch (error) {
    return { error: getAuthDbErrorMessage(error) };
  }

  redirect("/admin");
}

/**
 * First-run bootstrap. It only works while `admin_users` is empty, so the page
 * cannot be used to mint a second admin once the panel is live.
 */
export async function adminSetupAction(
  _prev: AdminAuthState,
  formData: FormData,
): Promise<AdminAuthState> {
  const credentials = readCredentials(formData);
  const problem = validateNewAdmin(credentials);
  if (problem) return { error: problem };

  try {
    if (await hasAnyAdmin()) {
      return { error: "An admin already exists. Please sign in instead." };
    }

    const admins = await getAdminUsersCollection();

    const created = await admins.insertOne({
      name: credentials.name,
      email: credentials.email,
      password: await bcrypt.hash(credentials.password, 12),
      active: true,
      created_at: new Date(),
      created_by: null,
      last_login_at: null,
    });

    await createAdminSession({
      adminId: created.insertedId.toString(),
      email: credentials.email,
      name: credentials.name,
    });
  } catch (error) {
    return { error: getAuthDbErrorMessage(error) };
  }

  redirect("/admin");
}

/** Adding further admins is done from inside the panel, by an admin. */
export async function createAdminAction(
  _prev: AdminAuthState,
  formData: FormData,
): Promise<AdminAuthState> {
  const session = await getAdminSession();
  if (!session) return { error: "Not authorised." };

  const credentials = readCredentials(formData);
  const problem = validateNewAdmin(credentials);
  if (problem) return { error: problem };

  try {
    const admins = await getAdminUsersCollection();

    if (await admins.findOne({ email: credentials.email })) {
      return { error: "An admin with that email already exists." };
    }

    await admins.insertOne({
      name: credentials.name,
      email: credentials.email,
      password: await bcrypt.hash(credentials.password, 12),
      active: true,
      created_at: new Date(),
      created_by: session.adminId,
      last_login_at: null,
    });
  } catch (error) {
    return { error: getAuthDbErrorMessage(error) };
  }

  revalidatePath("/admin/team");
  return { success: `${credentials.email} can now sign in.` };
}

export async function adminLogoutAction() {
  await deleteAdminSession();
  redirect("/admin/login");
}
