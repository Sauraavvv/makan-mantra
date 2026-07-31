"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { getAuthDbErrorMessage, getPendingUsersCollection, getUsersCollection } from "@/lib/auth/db";
import { sendOTPEmail } from "@/lib/auth/email";
import { createSession } from "@/lib/auth/session";

export type AuthState = {
  error?: string;
  email?: string;
  success?: boolean;
  devOtp?: string;
  emailWarning?: string;
} | undefined;

// Accepts "9876543210", "+91 98765 43210", "091-9876543210" and stores the
// bare 10-digit number.
function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^(?:0|91|091)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

async function createUnverifiedUser(
  name: string,
  email: string,
  phone: string,
  password: string,
): Promise<AuthState> {
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
  if (result?.devOtp) {
    redirect(`/verify-email?email=${encodeURIComponent(email)}&devOtp=${encodeURIComponent(result.devOtp)}`);
  }

  redirect(`/verify-email?email=${encodeURIComponent(email)}`);
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
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  try {
    const users = await getUsersCollection();
    const user = await users.findOne({ email });

    if (!user || !user.password) {
      return { error: "Invalid email or password" };
    }

    if (!user.email_verified) {
      return { error: "Please verify your email first", email };
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return { error: "Invalid email or password" };
    }

    await createSession({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    });

    redirect("/dashboard");
  } catch (error) {
    return { error: getAuthDbErrorMessage(error) };
  }
}
