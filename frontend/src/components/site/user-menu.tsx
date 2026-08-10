"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bookmark, Eye, LayoutDashboard, LogOut, Search } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useRecentProperties } from "@/context/recent-properties-context";
import { useSaved } from "@/context/saved-context";
import { useSearchHistory } from "@/context/search-history-context";
import { useSession, type SessionUser } from "@/context/session-context";

function initials(name: string, email: string) {
  const source = name?.trim() || email || "";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (source[0] || "?").toUpperCase();
}

export function UserMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { signOut } = useSession();
  const searches = useSearchHistory();
  const viewed = useRecentProperties();
  const saved = useSaved();

  const links = [
    {
      href: "/dashboard",
      label: "Go to Dashboard",
      icon: LayoutDashboard,
      count: null,
    },
    {
      href: "/dashboard/recent-searches",
      label: "Recent Searches",
      icon: Search,
      count: searches.loaded ? searches.items.length : null,
    },
    {
      href: "/dashboard/recently-viewed",
      label: "Viewed Properties",
      icon: Eye,
      count: viewed.loaded ? viewed.items.length : null,
    },
    {
      href: "/dashboard/saved",
      label: "Saved Properties",
      icon: Bookmark,
      count: saved.loaded ? saved.ids.length : null,
    },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label={`Open account sidebar for ${user.name || user.email}`}
        className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-saffron text-sm font-bold text-saffron-foreground transition-opacity hover:opacity-90"
      >
        {user.profileImageUrl ? (
          <Image
            src={user.profileImageUrl}
            alt={`${user.name || "User"} profile`}
            fill
            sizes="36px"
            className="object-cover"
          />
        ) : (
          initials(user.name, user.email)
        )}
      </SheetTrigger>

      <SheetContent
        side="right"
        className="gap-0 data-[side=right]:w-[300px] data-[side=right]:max-w-[88vw] data-[side=right]:sm:max-w-[300px]"
      >
        <SheetHeader className="border-b border-border px-5 pb-5 pt-6">
          <SheetTitle className="sr-only">Your account</SheetTitle>
          <SheetDescription className="sr-only">
            Open your dashboard and property activity.
          </SheetDescription>

          <div className="flex items-center gap-3 pr-10">
            <div className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-saffron text-base font-bold text-saffron-foreground">
              {user.profileImageUrl ? (
                <Image
                  src={user.profileImageUrl}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : (
                initials(user.name, user.email)
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-foreground">
                {user.name || "Your account"}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </SheetHeader>

        <nav aria-label="Account navigation" className="flex-1 p-3">
          <ul className="space-y-1">
            {links.map(({ href, label, icon: Icon, count }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-[#315ea8]">
                    <Icon className="size-[18px]" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {count !== null && (
                    <span className="min-w-6 shrink-0 rounded-full bg-muted px-2 py-0.5 text-center text-[10px] font-bold text-muted-foreground">
                      {count}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <SheetFooter className="border-t border-border p-3">
          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.push("/");
              router.refresh();
            }}
            className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="size-[18px]" strokeWidth={1.8} />
            Logout
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
