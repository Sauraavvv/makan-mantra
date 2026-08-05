"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { getAuthDbErrorMessage, getPendingUsersCollection, getUsersCollection } from "@/lib/auth/db";
import { sendOTPEmail } from "@/lib/auth/email";
import { normalizeEmail } from "@/lib/auth/normalize";
import { createSession } from "@/lib/auth/session";

export type AuthState = {
  error?: string;
  email?: string;
  success?: boolean;
  devOtp?: string;
  emailWarning?: string;
  /**
   * The address belongs to an account that was opened from the post-property
   * form and never activated. Signing in and signing up both refuse it, so the
   * caller should offer a fresh set-password link instead of a plain error.
   */
  needsSetPassword?: boolean;
} | undefined;

// Accepts "9876543210", "+91 98765 43210", "091-9876543210" and stores the
// bare 10-digit number.
function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^(?:0|91|091)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

async function createUnverifiedUser(
  name: string,
  rawEmail: string,
  phone: string,
  password: string,
): Promise<AuthState> {
  const email = normalizeEmail(rawEmail || "");

  if (!name || !email || !phone || !password) {
    return { error: "All fields are required" };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return { error: "Enter a valid 10-digit mobile number" };
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    const users = await getUsersCollection();
    const existingUser = await users.findOne({ $or: [{ email }, { phone: normalizedPhone }] });
    if (existingUser) {
      // An account opened from the post-property form sits here unverified. It
      // is theirs, not a clash — send them to the link instead of a dead end.
      if (existingUser.email === email && !existingUser.email_verified) {
        return {
          error: "You already have an account from posting a property. Set its password to continue.",
          email,
          needsSetPassword: true,
        };
      }

      return {
        error: existingUser.email === email
          ? "Email already registered"
          : "Mobile number already registered",
      };
    }

    const hashed = await bcrypt.hash(password, 12);
    const otp_expires = new Date(Date.now() + 10 * 60 * 1000);
    const pendingUsers = await getPendingUsersCollection();

    await pendingUsers.updateOne(
      { email },
      {
        $set: {
          name,
          email,
          phone: normalizedPhone,
          password: hashed,
          role: "user",
          otp,
          otp_expires,
          provider: "email",
          updated_at: new Date(),
        },
        $setOnInsert: {
          created_at: new Date(),
        },
      },
      { upsert: true },
    );

    await sendOTPEmail(email, name, otp);
    return { success: true, email };
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      return { error: getAuthDbErrorMessage(error) };
    }

    if (error instanceof Error && !error.message.toLowerCase().includes("mongodb")) {
      return {
        success: true,
        email,
        devOtp: otp,
        emailWarning: error.message,
      };
    }

    return { error: getAuthDbErrorMessage(error) };
  }
}

export async function registerAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;

  const result = await createUnverifiedUser(name, email, phone, password);
  if (result?.error) return result;

  // `result.email` is the normalised spelling — the one verify-otp will match.
  const verifyEmail = result?.email ?? normalizeEmail(email || "");

  if (result?.devOtp) {
    redirect(`/verify-email?email=${encodeURIComponent(verifyEmail)}&devOtp=${encodeURIComponent(result.devOtp)}`);
  }

  redirect(`/verify-email?email=${encodeURIComponent(verifyEmail)}`);
}

export async function registerModalAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;

  return createUnverifiedUser(name, email, phone, password);
}

export async function loginAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  // Stored lower-cased, so it has to be matched lower-cased too — otherwise a
  // capitalised address looks like a wrong password.
  const email = normalizeEmail((formData.get("email") as string) || "");
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  let session;

  try {
    const users = await getUsersCollection();
    const user = await users.findOne({ email });

    if (!user || !user.password) {
      return { error: "Invalid email or password" };
    }

    if (!user.email_verified) {
      // Post-property accounts never had a password chosen, so "verify your
      // email" is not something they can act on — offer the link instead.
      if (user.provider === "post_property") {
        return {
          error: "This account came from posting a property. Set a password to sign in.",
          email,
          needsSetPassword: true,
        };
      }

      return { error: "Please verify your email first", email };
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return { error: "Invalid email or password" };
    }

    session = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };
  } catch (error) {
    return { error: getAuthDbErrorMessage(error) };
  }

  await createSession(session);

  // No redirect here: the modal navigates itself, so it can refresh the header
  // session in the same step. Redirecting would also have to sit outside the
  // try above — it signals by throwing, and the catch would report it as a
  // database failure.
  return { success: true };
}
