import type { Metadata } from "next";
import { Eye } from "lucide-react";

import { Panel } from "@/components/dashboard/panel";
import { RecentlyViewedList } from "@/components/dashboard/recently-viewed-list";

export const metadata: Metadata = {
  title: "Recently viewed properties | Makan Mantraa",
};

export default function RecentlyViewedPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-foreground md:text-[30px]">
          Recently viewed
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Properties you have opened, with the latest view first.
        </p>
      </div>

      <Panel title="Viewed properties" icon={Eye} tone="bg-[#eef7ff] text-[#3786c9]">
        <RecentlyViewedList />
      </Panel>
    </div>
  );
}
