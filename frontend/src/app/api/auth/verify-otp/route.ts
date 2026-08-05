import { NextRequest, NextResponse } from "next/server";
import { getAuthDbErrorMessage, getPendingUsersCollection, getUsersCollection } from "@/lib/auth/db";
import { normalizeEmail } from "@/lib/auth/normalize";
import { createSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const { email: rawEmail, otp } = await req.json();
    const email = normalizeEmail(String(rawEmail || ""));

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP required" }, { status: 400 });
    }

    const users = await getUsersCollection();
    const pendingUsers = await getPendingUsersCollection();
    const user = await pendingUsers.findOne({ email });

    if (!user) {
      const existingUser = await users.findOne({ email });
      if (existingUser) {
        return NextResponse.json({ error: "Email already verified" }, { status: 400 });
      }

      return NextResponse.json({ error: "Verification request not found" }, { status: 404 });
    }

    if (user.otp !== otp) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    if (!user.otp_expires || new Date() > user.otp_expires) {
      return NextResponse.json({ error: "OTP expired" }, { status: 400 });
    }

    const existingUser = await users.findOne({ email });
    if (existingUser) {
      await pendingUsers.deleteOne({ email });
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const result = await users.insertOne({
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: user.password,
      role: user.role || "user",
      email_verified: true,
      provider: user.provider || "email",
      created_at: user.created_at || new Date(),
      verified_at: new Date(),
    });

    await pendingUsers.deleteOne({ email });

    await createSession({
      userId: result.insertedId.toString(),
      email: user.email,
      name: user.name,
      role: user.role || "user",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: getAuthDbErrorMessage(error) },
      { status: 503 },
    );
  }
}
