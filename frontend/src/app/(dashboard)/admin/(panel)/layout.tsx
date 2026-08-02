import Link from "next/link";
import { Inbox, LayoutDashboard, LogOut, MapPin, Users } from "lucide-react";
import { adminLogoutAction } from "@/app/actions/admin-auth";
import { requireAdminPage } from "@/lib/auth/admin";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/post-property", label: "Post Property", icon: Inbox },
  { href: "/admin/locations", label: "Locations", icon: MapPin },
  { href: "/admin/team", label: "Admins", icon: Users },
];

/**
 * Everything in this group sits behind the admin session. Login and setup live
 * outside it, which is why they are not nested here.
 */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminPage();

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-background md:block">
        <div className="border-b border-border px-5 py-4">
          <p className="text-sm font-bold">Makan Mantraa</p>
          <p className="text-xs text-muted-foreground">Admin</p>
        </div>

        <nav className="space-y-1 p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground"
            >
              <item.icon className="size-4" strokeWidth={1.8} />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-4 border-b border-border bg-background px-5 py-3">
          <div className="flex gap-1 overflow-x-auto md:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium hover:bg-secondary"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <p className="ml-auto hidden text-xs text-muted-foreground sm:block">
            {session.name} · {session.email}
          </p>

          <form action={adminLogoutAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-secondary"
            >
              <LogOut className="size-3.5" />
              Sign out
            </button>
          </form>
        </header>

        <main className="min-w-0 flex-1 p-5">{children}</main>
      </div>
    </div>
  );
}
