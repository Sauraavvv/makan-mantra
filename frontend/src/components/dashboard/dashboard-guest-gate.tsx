"use client";

import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";

import { DashboardGuestPlaceholder } from "@/components/dashboard/dashboard-guest-placeholder";
import { openAuthModal } from "@/lib/auth-modal";

/**
 * The two pages a signed-out visitor may read: both are built entirely from
 * what this device recorded, so there is nothing on them an account is needed
 * to fetch — and nothing another person's account could leak into.
 */
const GUEST_PATHS = ["/dashboard/recent-searches", "/dashboard/recently-viewed"];

/**
 * Everything else in the dashboard is somebody's account. Rather than bouncing
 * a guest back to the home page, they are kept here and asked to sign in, with
 * the shape of the page behind the ask so they can see where they have landed.
 *
 * What is behind the blur is a placeholder, never `children`. A blur is a
 * curtain: anything drawn under it is still in the page, one devtools panel or
 * one disabled stylesheet away from being read. So the page's own content is
 * not rendered at all.
 *
 * Even this is only the second line. The blur runs in the browser, and by then
 * the server has already decided what to send — so every dashboard page guards
 * itself as well, returning a placeholder of its own rather than fetching an
 * account's data for someone who has not signed in. That guard is the real one;
 * this one keeps a page that forgets it from showing anything.
 */
export function DashboardGuestGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (GUEST_PATHS.includes(pathname)) return <>{children}</>;

  return (
    <div className="relative min-h-[60vh]">
      <div aria-hidden="true" className="pointer-events-none select-none blur-[6px]">
        <DashboardGuestPlaceholder />
      </div>

      <div className="absolute inset-0 grid place-items-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 text-center shadow-lg">
          <span className="mx-auto grid size-11 place-items-center rounded-full bg-[#0A2036]/10">
            <Lock className="size-5 text-[#0A2036]" strokeWidth={2} />
          </span>

          <h2 className="mt-4 text-lg font-bold text-[#0A2036]">Sign in to continue</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            This part of your dashboard belongs to an account. Your searches and viewed
            properties are already saved on this device and will move across when you sign in.
          </p>

          <button
            type="button"
            onClick={() => openAuthModal("login")}
            className="mt-5 grid h-10 w-full place-items-center rounded-lg bg-[#0A2036] text-sm font-bold text-white transition-colors hover:bg-[#12345d]"
          >
            Login / Sign up
          </button>
        </div>
      </div>
    </div>
  );
}
