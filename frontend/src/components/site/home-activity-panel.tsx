"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { useRecentProperties } from "@/context/recent-properties-context";
import { useSearchHistory } from "@/context/search-history-context";
import { useSession } from "@/context/session-context";
import { openAuthModal } from "@/lib/auth-modal";

/** The site's navy, the same one the header and the hero headings wear. */
const ACTION_CLASS =
  "grid h-9 shrink-0 place-items-center rounded-lg bg-[#0A2036] text-xs font-bold text-white transition-colors hover:bg-[#132E4A]";

/**
 * The reader's own corner of the home page: who they are, and the two trails
 * worth a glance — what they searched, and what they opened.
 *
 * The shortlist is not among them on purpose: it has a home of its own in the
 * dashboard, and it is the one trail a reader goes looking for deliberately
 * rather than one they want counted back at them here.
 *
 * Both counts are the reader's own whether or not they have signed in — a guest
 * builds them on this device, and signing in hands them to the account.
 */
export function HomeActivityPanel({ className = "" }: { className?: string }) {
  const { user, loaded: sessionLoaded } = useSession();
  const { items: searches } = useSearchHistory();
  const { items: viewed } = useRecentProperties();

  return (
    <aside
      className={`flex min-h-0 flex-col overflow-hidden rounded-[20px] border border-border bg-background p-4 ${className}`}
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

      {/* The stats divide whatever height the card has, with the button under
          them — so the card fills as it did before. `min-h-0` is what keeps that
          from working the other way round: without it a stat would insist on its
          own content height and push the whole section past the viewport. */}
      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2">
        <StatCard
          count={searches.length}
          label="Searched"
          href="/dashboard/recent-searches"
          signedIn={Boolean(user)}
        />
        <StatCard
          count={viewed.length}
          label="Viewed"
          href="/dashboard/recently-viewed"
          signedIn={Boolean(user)}
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

const STAT_CLASS =
  "flex min-h-0 flex-1 flex-col justify-between overflow-hidden rounded-lg bg-[#FDF3E3] px-3 py-2 text-left";

/**
 * One trail: how much of it there is, and what it is.
 *
 * A signed-out reader gets the real count — what they did on this device counts
 * whether or not they have an account yet — but the card does not open, and does
 * not ask them to sign in either. Sign-in is asked for once, by the button that
 * says so; a count that quietly turns into a login prompt is a card that lied
 * about what clicking it does.
 */
function StatCard({
  count,
  label,
  href,
  signedIn,
}: {
  count: number;
  label: string;
  href: string;
  signedIn: boolean;
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

  return signedIn ? (
    <Link href={href} className={`${STAT_CLASS} transition-colors hover:bg-[#FBEBD2]`}>
      {body}
    </Link>
  ) : (
    <div className={STAT_CLASS}>{body}</div>
  );
}
