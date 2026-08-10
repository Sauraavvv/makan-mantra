import type { Metadata } from "next";
import { Search } from "lucide-react";

import { Panel } from "@/components/dashboard/panel";
import { RecentSearchesClearAction } from "@/components/dashboard/recent-searches-clear-action";
import { RecentSearchesList } from "@/components/dashboard/recent-searches-list";

export const metadata: Metadata = {
  title: "Recent searches | Makan Mantraa",
};

export default function RecentSearchesPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-foreground md:text-[30px]">
          Recent searches
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Your latest property searches, with the newest first.
        </p>
      </div>

      <Panel
        title="Search history"
        icon={Search}
        tone="bg-[#eef3ff] text-[#536de4]"
        headerAction={<RecentSearchesClearAction />}
      >
        <RecentSearchesList />
      </Panel>
    </div>
  );
}
