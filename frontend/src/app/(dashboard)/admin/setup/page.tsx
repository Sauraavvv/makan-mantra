import { redirect } from "next/navigation";
import { adminSetupAction } from "@/app/actions/admin-auth";
import { AdminAuthForm } from "@/components/admin/admin-auth-form";
import { hasAnyAdmin } from "@/lib/auth/admin";

export const metadata = { title: "Create the first admin" };

/**
 * Open only while `admin_users` is empty. Once the first admin exists this page
 * closes for good and further admins are added from inside the panel.
 */
export default async function AdminSetupPage() {
  if (await hasAnyAdmin()) redirect("/admin/login");

  return (
    <AdminAuthForm
      action={adminSetupAction}
      title="Create the first admin"
      subtitle="This page closes once an admin exists."
      submitLabel="Create admin"
      withName
    />
  );
}
