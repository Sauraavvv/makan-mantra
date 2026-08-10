import Link from "next/link";
import { Plus } from "lucide-react";

import { DashboardAccountMenu } from "@/components/dashboard/dashboard-account-menu";
import { DashboardSearch } from "@/components/dashboard/dashboard-search";

export function DashboardTopbar({
  name,
  email,
  profileImageUrl,
}: {
  name: string;
  email: string;
  profileImageUrl: string;
}) {
  return (
    <header className="sticky top-0 z-30 w-full max-w-full border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="flex h-[72px] min-w-0 items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
        <DashboardSearch />

        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <Link
            href="/post-property"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#081b35] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#12345d] sm:px-5 sm:text-sm"
          >
            <Plus className="size-4" strokeWidth={2} />
            <span className="hidden sm:inline">Post Property</span>
          </Link>
          <DashboardAccountMenu name={name} email={email} profileImageUrl={profileImageUrl} />
        </div>
      </div>
    </header>
  );
}
