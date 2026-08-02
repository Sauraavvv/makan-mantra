import { getAdminUsersCollection } from "@/lib/auth/db";
import { requireAdminPage } from "@/lib/auth/admin";
import { CreateAdminForm } from "@/components/admin/create-admin-form";

export const metadata = { title: "Admins — Admin" };

const DATE_FORMAT = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});

export default async function AdminTeamPage() {
  await requireAdminPage();

  const collection = await getAdminUsersCollection();
  const admins = await collection
    .find({}, { projection: { password: 0 } })
    .sort({ created_at: 1 })
    .toArray();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Admins</h1>
        <p className="text-sm text-muted-foreground">
          Everyone here can sign in to the control panel.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="overflow-hidden rounded-2xl border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Added</th>
                <th className="px-4 py-3 font-semibold">Last sign in</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {admins.map((admin) => (
                <tr key={String(admin._id)}>
                  <td className="px-4 py-3 font-medium">{admin.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{admin.email}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {admin.created_at ? DATE_FORMAT.format(new Date(admin.created_at)) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {admin.last_login_at ? DATE_FORMAT.format(new Date(admin.last_login_at)) : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <CreateAdminForm />
      </div>
    </div>
  );
}
