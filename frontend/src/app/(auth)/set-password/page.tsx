import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { SetPasswordForm } from "@/components/auth/set-password-form";
import { ResendSetPasswordForm } from "@/components/auth/resend-set-password-form";
import { getUsersCollection } from "@/lib/auth/db";
import { hashSetPasswordToken } from "@/lib/auth/set-password";

export const metadata: Metadata = {
  title: "Set your password | Makan Mantraa",
  robots: { index: false, follow: false },
};

/** Checked before rendering so a dead link says so instead of failing on submit. */
async function tokenIsLive(token: string) {
  if (!token) return false;

  try {
    const users = await getUsersCollection();
    const user = await users.findOne(
      {
        set_password_token: hashSetPasswordToken(token),
        set_password_expires: { $gt: new Date() },
      },
      { projection: { _id: 1 } },
    );

    return Boolean(user);
  } catch {
    return false;
  }
}

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const live = await tokenIsLive(token);

  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      <Header />

      <main className="mx-auto flex w-full max-w-[1250px] flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-xl border border-border bg-background p-6">
          <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="size-5" />
          </span>

          {live ? (
            <>
              <h1 className="mt-4 text-xl font-bold tracking-tight">Set your password</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick a password to finish setting up your account. You will be signed
                in straight after.
              </p>

              <SetPasswordForm token={token} />
            </>
          ) : (
            <>
              <h1 className="mt-4 text-xl font-bold tracking-tight">This link has expired</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Set-password links are good for 24 hours and can only be used once.
                Enter your email and we will send a fresh one.
              </p>

              <ResendSetPasswordForm />

              <Link
                href="/"
                className="mt-4 block text-center text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Back to homepage
              </Link>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
