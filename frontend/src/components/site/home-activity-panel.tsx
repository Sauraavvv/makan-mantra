"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { useRecentProperties } from "@/context/recent-properties-context";
import { useSaved } from "@/context/saved-context";
import { useSearchHistory } from "@/context/search-history-context";
import { useSession } from "@/context/session-context";
import { openAuthModal } from "@/lib/auth-modal";

/** The site's navy, the same one the header and the hero headings wear. */
const ACTION_CLASS =
  "grid h-9 shrink-0 place-items-center rounded-lg bg-[#0A2036] text-xs font-bold text-white transition-colors hover:bg-[#132E4A]";

/**
 * The reader's own corner of the home page: who they are, what they searched,
 * what they opened, and what they shortlisted.
 *
 * Search, view, and shortlist counts belong to the reader whether or not they
 * have signed in — a guest builds them on this device, and signing in hands
 * them to the account.
 */
export function HomeActivityPanel({ className = "" }: { className?: string }) {
  const { user, loaded: sessionLoaded } = useSession();
  const { items: searches } = useSearchHistory();
  const { items: viewed } = useRecentProperties();
  const { items: saved, loaded: savedLoaded } = useSaved();

  return (
    <aside
      className={`flex min-h-[21rem] flex-col overflow-hidden rounded-[20px] border border-border bg-background p-4 ${className}`}
    >
      <header className="flex items-center gap-3">
        {/* The photo where there is one, initials where there is not — a guest
            has neither, and gets the initials tile's placeholder. A plain `img`,
            as everywhere else we serve Cloudinary. */}
        <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[#DCF0E4] text-xs font-bold tracking-[0.15em] text-[#1F7A4C]">
          {user?.profileImageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={user.profileImageUrl}
              alt=""
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            initials(user?.name)
          )}
        </div>

        <div className="min-w-0">
          {/* Nothing is claimed about the reader until the session has answered:
              a flash of the wrong name reads as being signed into someone else. */}
          {!sessionLoaded ? (
            <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
          ) : (
            <>
              <p className="truncate text-sm font-bold leading-tight text-[#0A2036]">
                {user?.name ?? "Guest user"}
              </p>
              {user?.role && (
                <p className="truncate text-[11px] capitalize leading-tight text-muted-foreground">
                  {user.role}
                </p>
              )}
            </>
          )}
        </div>
      </header>

      <p className="mt-3 text-[11px] font-bold text-[#0A2036]">Your Recent Activity</p>

      {/* Activity rows keep the original compact height even though the panel
          itself is taller, leaving the remaining room open above the action. */}
      <div className="mt-2 flex flex-1 flex-col gap-2">
        <StatCard
          count={searches.length}
          label="Searched"
          href="/dashboard/recent-searches"
        />
        <StatCard
          count={viewed.length}
          label="Viewed"
          href="/dashboard/recently-viewed"
        />
        <StatCard
          count={savedLoaded ? saved.length : "—"}
          label="Shortlisted"
          href="/dashboard/saved"
        />
      </div>

      {/* The dashboard is behind its own sign-in, so a guest is asked for the
          account first — and signing in claims what this device already holds,
          which lands them on a dashboard that has their history in it.

          The modal, not a link to it: the reader is on the page they wanted, and
          sending them elsewhere to sign in would cost them their place. */}
      {user ? (
        <Link
          href="/dashboard"
          className={`mt-2 ${ACTION_CLASS}`}
        >
          View all activity
        </Link>
      ) : (
        <button type="button" onClick={() => openAuthModal("login")} className={`mt-2 ${ACTION_CLASS}`}>
          Login / Sign up
        </button>
      )}

    </aside>
  );
}

/** "Saurav Sharma" → "S S"; a single name gives a single letter. */
function initials(name?: string) {
  if (!name) return "—";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join(" ");
}

/** The original compact stat height: number, label, and their vertical padding. */
const STAT_CLASS =
  "flex h-[3.25rem] shrink-0 flex-col justify-between gap-1 overflow-hidden rounded-lg bg-[#FDF3E3] px-3 py-2 text-left";

/**
 * One trail: how much of it there is, what it is, and where to see the details.
 */
function StatCard({
  count,
  label,
  href,
}: {
  count: number | string;
  label: string;
  href: string;
}) {
  const body = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className="text-lg font-bold leading-none text-[#0A2036]">{count}</span>
        <ArrowUpRight className="size-3.5 shrink-0 text-saffron" strokeWidth={2} />
      </span>
      <span className="text-[11px] font-semibold text-[#0A2036]">{label}</span>
    </>
  );

  return (
    <Link href={href} className={`${STAT_CLASS} transition-colors hover:bg-[#FBEBD2]`}>
      {body}
    </Link>
  );
}
