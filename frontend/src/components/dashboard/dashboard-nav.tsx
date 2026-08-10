"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bookmark,
  Building2,
  Eye,
  LayoutGrid,
  LogOut,
  MessageCircle,
  MessagesSquare,
  Search,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { useSaved } from "@/context/saved-context";
import { useRecentProperties } from "@/context/recent-properties-context";
import { useSession } from "@/context/session-context";
import { useSearchHistory } from "@/context/search-history-context";

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
};

const SAVED_HREF = "/dashboard/saved";
const PROPERTIES_HREF = "/dashboard/properties";
const RECENT_SEARCHES_HREF = "/dashboard/recent-searches";
const RECENTLY_VIEWED_HREF = "/dashboard/recently-viewed";

const ACTIVITY_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: PROPERTIES_HREF, label: "My Properties", icon: Building2 },
  { href: SAVED_HREF, label: "Saved Listings", icon: Bookmark },
  { href: RECENT_SEARCHES_HREF, label: "Recent Searches", icon: Search },
  { href: RECENTLY_VIEWED_HREF, label: "Recently Viewed", icon: Eye },
  { href: "/dashboard/inquiries", label: "Inquiries", icon: MessagesSquare, soon: true },
  { href: "/dashboard/messages", label: "Messages", icon: MessageCircle, soon: true },
];

const ACCOUNT_LINKS: NavLink[] = [
  { href: "/dashboard/profile", label: "Profile", icon: UserRound },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function NavRow({
  link,
  active,
  count,
}: {
  link: NavLink;
  active: boolean;
  count: number | null;
}) {
  const { href, label, icon: Icon, soon } = link;
  const content = (
    <>
      <Icon className="size-[18px] shrink-0" strokeWidth={1.8} />
      <span className="truncate">{label}</span>
      {soon ? (
        <span className="ml-auto hidden shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-semibold uppercase text-white/55 xl:inline">
          Soon
        </span>
      ) : count !== null ? (
        <span className="ml-auto shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/80">
          {count}
        </span>
      ) : null}
    </>
  );
  const className = `flex h-11 items-center gap-3 rounded-lg px-3.5 text-[13px] font-medium ${
    active ? "bg-[#23477f] text-white" : "text-white/70 hover:bg-white/[0.07] hover:text-white"
  }`;

  return (
    <li className="shrink-0 lg:shrink">
      {soon ? (
        <span aria-disabled="true" className={`${className} cursor-not-allowed`}>
          {content}
        </span>
      ) : (
        <Link href={href} aria-current={active ? "page" : undefined} className={className}>
          {content}
        </Link>
      )}
    </li>
  );
}

export function DashboardNav({ propertiesCount }: { propertiesCount: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ids: savedIds, loaded } = useSaved();
  const { items: recentSearches, loaded: recentSearchesLoaded } = useSearchHistory();
  const { items: recentlyViewed, loaded: recentlyViewedLoaded } = useRecentProperties();
  const { signOut } = useSession();

  const countFor = (href: string): number | null => {
    if (href === SAVED_HREF) return loaded ? savedIds.length : null;
    if (href === PROPERTIES_HREF) return propertiesCount;
    if (href === RECENT_SEARCHES_HREF) {
      return recentSearchesLoaded ? recentSearches.length : null;
    }
    if (href === RECENTLY_VIEWED_HREF) {
      return recentlyViewedLoaded ? recentlyViewed.length : null;
    }
    return null;
  };

  const row = (link: NavLink) => (
    <NavRow key={link.href} link={link} active={pathname === link.href} count={countFor(link.href)} />
  );

  return (
    <aside className="z-40 bg-[#071a33] text-white lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:h-dvh lg:w-[250px] lg:flex-col lg:overflow-y-auto">
      <div className="flex h-16 shrink-0 items-center px-4 lg:h-[88px] lg:px-6">
        <Link href="/" aria-label="Makan Mantraa home">
          <span className="text-xl font-bold text-white">
            Makan<span className="text-saffron">Mantraa</span>
          </span>
        </Link>
      </div>

      <div className="border-t border-white/10 px-3 pb-3 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:border-t-0 lg:px-3.5 lg:pb-5">
        <ul className="flex gap-1.5 overflow-x-auto py-3 no-scrollbar lg:flex-col lg:gap-1 lg:overflow-visible lg:py-0">
          {ACTIVITY_LINKS.map(row)}
          <li aria-hidden className="my-3 hidden border-t border-white/10 lg:block" />
          {ACCOUNT_LINKS.map(row)}
        </ul>

        <div className="mt-auto hidden lg:block">
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.push("/");
              router.refresh();
            }}
            className="flex h-11 w-full items-center gap-3 rounded-lg px-3.5 text-[13px] font-medium text-white/70 hover:bg-white/[0.07] hover:text-white"
          >
            <LogOut className="size-[18px]" strokeWidth={1.8} />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
