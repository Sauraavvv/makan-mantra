"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useRecentProperties } from "@/context/recent-properties-context";
import { useSaved } from "@/context/saved-context";
import { useSearchHistory } from "@/context/search-history-context";
import { useSession, type SessionUser } from "@/context/session-context";
import { openAuthModal } from "@/lib/auth-modal";

function initials(name: string, email: string) {
  const source = name?.trim() || email || "";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (source[0] || "?").toUpperCase();
}

const budgetLinks = [
  { href: "/tools/emi-calculator", label: "EMI Calculator" },
  { href: "/tools/stamp-duty-calculator", label: "Stamp Duty Calculator" },
];

/**
 * The account panel, opened either from the header's avatar or from the home
 * page's activity card.
 *
 * `user` of null is a guest, and the same panel serves them: the counts are
 * real — built on this device and handed to the account when they sign in — but
 * every row that leads into the dashboard is inert, because the dashboard asks
 * for a sign-in and a row that only bounces them there is a row that lied. The
 * one thing that does ask them to sign in is the button that says so.
 */
export function AccountSidebar({
  user,
  open,
  onOpenChange,
}: {
  user: SessionUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { signOut } = useSession();
  const searches = useSearchHistory();
  const viewed = useRecentProperties();
  const saved = useSaved();

  const close = () => onOpenChange(false);

  const activityLinks = [
    // A guest has no listings of their own to count or open.
    ...(user ? [{ href: "/dashboard/properties", label: "My Listings", count: null }] : []),
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-saffron text-sm font-bold text-saffron-foreground">
                {user?.profileImageUrl ? (
                  <Image
                    src={user.profileImageUrl}
                    alt={`${user.name || "User"} profile`}
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                ) : user ? (
                  initials(user.name, user.email)
                ) : (
                  "G"
                )}
              </div>

              <div className="min-w-0">
                <p className="truncate text-base font-bold text-foreground">
                  {user ? user.name || "Your account" : "Guest user"}
                </p>
                {user && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              className="shrink-0 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Close
            </button>
          </div>
        </SheetHeader>

        <nav aria-label="Account navigation" className="flex-1 overflow-y-auto px-4 py-4">
          {user ? (
            <Link
              href="/dashboard"
              onClick={close}
              className="flex h-11 items-center rounded-lg bg-[#0A2036] px-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#12345d]"
            >
              Go to Dashboard
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                close();
                openAuthModal("login");
              }}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-[#0A2036] px-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#12345d]"
            >
              Login / Sign up
            </button>
          )}

          <div className="mt-6">
            <p className="px-1 text-[10px] font-bold uppercase text-muted-foreground">
              My Activity
            </p>
            <ul className="mt-2 space-y-1">
              {activityLinks.map(({ href, label, count }) => {
                const row = (
                  <>
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    {count !== null && (
                      <span className="min-w-6 shrink-0 rounded-full bg-muted px-2 py-0.5 text-center text-[10px] font-bold text-muted-foreground">
                        {count}
                      </span>
                    )}
                  </>
                );

                return (
                  <li key={href}>
                    {user ? (
                      <Link
                        href={href}
                        onClick={close}
                        className="flex h-10 items-center rounded-lg px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                      >
                        {row}
                      </Link>
                    ) : (
                      <span className="flex h-10 items-center rounded-lg px-2.5 text-sm font-medium text-foreground">
                        {row}
                      </span>
                    )}
                  </li>
                );
              })}
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
                    onClick={close}
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
            onClick={close}
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

        {user && (
          <SheetFooter className="border-t border-border p-3">
            <button
              type="button"
              onClick={async () => {
                close();
                await signOut();
                router.push("/");
                router.refresh();
              }}
              className="flex h-11 w-full items-center rounded-lg px-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
            >
              Logout
            </button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
