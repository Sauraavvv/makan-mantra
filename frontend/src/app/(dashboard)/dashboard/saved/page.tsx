import type { Metadata } from "next";
import { Panel } from "@/components/dashboard/panel";
import { SavedList } from "@/components/dashboard/saved-list";

export const metadata: Metadata = {
  title: "Saved properties | Makan Mantraa",
};

export default function SavedPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-foreground md:text-[30px]">Saved properties</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Everything you have shortlisted, newest first.
        </p>
      </div>

      <Panel title="Your shortlist">
        <SavedList />
      </Panel>
    </div>
  );
}
