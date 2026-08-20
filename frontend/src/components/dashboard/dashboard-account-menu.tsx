"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Home, LogIn, LogOut, Settings, UserRound } from "lucide-react";

import { useSession } from "@/context/session-context";
import { openAuthModal } from "@/lib/auth-modal";

function initials(name: string, email: string) {
  const parts = (name.trim() || email).split(/\s+/).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) || "MM").toUpperCase();
}

export function DashboardAccountMenu({
  name,
  email,
  profileImageUrl,
  guest = false,
}: {
  name: string;
  email: string;
  profileImageUrl: string;
  /** No account behind the menu: it offers the way into one instead of out of it. */
  guest?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { signOut } = useSession();

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const menuItemClass =
    "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-foreground hover:bg-secondary";

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-11 items-center gap-2.5 rounded-lg px-1.5 text-left hover:bg-secondary sm:pr-2.5"
      >
        <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary/10 text-xs font-bold text-primary">
          {profileImageUrl ? (
            <Image
              src={profileImageUrl}
              alt={`${name || "User"} profile`}
              fill
              sizes="36px"
              className="object-cover"
            />
          ) : (
            initials(name, email)
          )}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-36 truncate text-[13px] font-bold leading-5 text-foreground">
            {name || "Your account"}
          </span>
          <span className="block text-[11px] leading-4 text-muted-foreground">
            {guest ? "Not signed in" : "Member account"}
          </span>
        </span>
        <ChevronDown className="hidden size-4 text-muted-foreground sm:block" strokeWidth={1.8} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-lg border border-border bg-popover shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-bold text-foreground">{name || "Your account"}</p>
            {email && <p className="mt-0.5 truncate text-xs text-muted-foreground">{email}</p>}
          </div>

          {/* A guest is offered none of the account's own pages — Profile and
              Settings would only put them in front of the sign-in gate, and
              there is no session to sign out of. */}
          {!guest && (
            <>
              <Link href="/dashboard/profile" onClick={() => setOpen(false)} role="menuitem" className={menuItemClass}>
                <UserRound className="size-4" strokeWidth={1.8} />
                Profile
              </Link>
              <Link href="/dashboard/settings" onClick={() => setOpen(false)} role="menuitem" className={menuItemClass}>
                <Settings className="size-4" strokeWidth={1.8} />
                Settings
              </Link>
            </>
          )}

          <Link href="/" onClick={() => setOpen(false)} role="menuitem" className={menuItemClass}>
            <Home className="size-4" strokeWidth={1.8} />
            Back to website
          </Link>

          {guest ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                openAuthModal("login");
              }}
              className={`${menuItemClass} border-t border-border font-bold text-[#0A2036]`}
            >
              <LogIn className="size-4" strokeWidth={1.8} />
              Login / Sign up
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              onClick={async () => {
                setOpen(false);
                await signOut();
                router.push("/");
                router.refresh();
              }}
              className={`${menuItemClass} border-t border-border text-destructive hover:bg-destructive/5`}
            >
              <LogOut className="size-4" strokeWidth={1.8} />
              Sign out
            </button>
          )}
        </div>
      )}
    </div>
  );
}
