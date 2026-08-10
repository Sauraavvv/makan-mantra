"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

  const activityLinks = [
    { href: "/dashboard/properties", label: "My Listings", count: null },
    {
      href: "/dashboard/recent-searches",
      label: "Recent Searches",
      count: searches.loaded ? searches.items.length : null,
    },
    {
      href: "/dashboard/recently-viewed",
      label: "Viewed Properties",
      count: viewed.loaded ? viewed.items.length : null,
    },
    {
      href: "/dashboard/saved",
      label: "Shortlisted Properties",
      count: saved.loaded ? saved.ids.length : null,
    },
  ];
  const budgetLinks = [
    { href: "/tools/emi-calculator", label: "EMI Calculator" },
    { href: "/tools/stamp-duty-calculator", label: "Stamp Duty Calculator" },
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
        showCloseButton={false}
        className="gap-0 data-[side=right]:w-[300px] data-[side=right]:max-w-[88vw] data-[side=right]:sm:max-w-[300px]"
      >
        <SheetHeader className="border-b border-border px-5 py-5">
          <SheetTitle className="sr-only">Your account</SheetTitle>
          <SheetDescription className="sr-only">
            Open your dashboard and property activity.
          </SheetDescription>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 pt-0.5">
              <p className="truncate text-base font-bold text-foreground">
                {user.name || "Your account"}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Close
            </button>
          </div>
        </SheetHeader>

        <nav aria-label="Account navigation" className="flex-1 overflow-y-auto px-4 py-4">
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="flex h-11 items-center rounded-lg bg-[#0A2036] px-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#12345d]"
          >
            Go to Dashboard
          </Link>

          <div className="mt-6">
            <p className="px-1 text-[10px] font-bold uppercase text-muted-foreground">
              My Activity
            </p>
            <ul className="mt-2 space-y-1">
              {activityLinks.map(({ href, label, count }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    className="flex h-10 items-center rounded-lg px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                  >
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
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <p className="px-1 text-[10px] font-bold uppercase text-muted-foreground">
              Plan Your Budget
            </p>
            <ul className="mt-2 space-y-1">
              {budgetLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    className="flex h-10 items-center rounded-lg px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <Link
            href="/post-property"
            onClick={() => setOpen(false)}
            className="group mt-6 block overflow-hidden rounded-lg border border-[#ffe0d1] bg-[#fff7f2] p-3 transition-colors hover:border-[#ffc3a7]"
          >
            <span className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3">
              <span className="relative h-[112px] overflow-hidden rounded-md bg-[#fff1e9]">
                <Image
                  src="/post-property-sidebar.png"
                  alt="Modern home ready to be listed"
                  fill
                  sizes="96px"
                  className="object-cover object-center"
                />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-bold leading-6 text-foreground">
                  Post Your <span className="text-saffron">Property</span>
                </span>
                <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                  Reach thousands of genuine buyers and tenants.
                </span>
              </span>
            </span>
            <span className="mt-3 flex h-10 w-full items-center justify-center rounded-lg bg-saffron text-sm font-semibold text-saffron-foreground transition-colors group-hover:bg-saffron/90">
              Post Property
            </span>
          </Link>
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
            className="flex h-11 w-full items-center rounded-lg px-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
          >
            Logout
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
