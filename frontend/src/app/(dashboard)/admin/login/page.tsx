import { redirect } from "next/navigation";
import { adminLoginAction } from "@/app/actions/admin-auth";
import { AdminAuthForm } from "@/components/admin/admin-auth-form";
import { getAdminSession, hasAnyAdmin } from "@/lib/auth/admin";

export const metadata = { title: "Admin sign in" };

export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect("/admin");

  // Nothing to sign in to yet — send the first visitor through setup instead.
  if (!(await hasAnyAdmin())) redirect("/admin/setup");

  return (
    <AdminAuthForm
      action={adminLoginAction}
      title="Admin sign in"
      subtitle="Makan Mantraa control panel"
      submitLabel="Sign in"
    />
  );
}
