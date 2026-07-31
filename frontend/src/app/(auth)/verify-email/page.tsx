import { redirect } from "next/navigation";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; devOtp?: string }>;
}) {
  const { email, devOtp } = await searchParams;
  const params = new URLSearchParams({ auth: "verify" });

  if (email) params.set("email", email);
  if (devOtp) params.set("devOtp", devOtp);

  redirect(`/?${params.toString()}`);
}
