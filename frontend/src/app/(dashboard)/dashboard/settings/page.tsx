import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { DashboardGuestPlaceholder } from "@/components/dashboard/dashboard-guest-placeholder";
import { DeactivateAccount } from "@/components/dashboard/deactivate-account";
import { DeleteAccount } from "@/components/dashboard/delete-account";
import { Panel } from "@/components/dashboard/panel";
import { PURGE_AFTER_DAYS, REACTIVATE_WINDOW_DAYS } from "@/lib/auth/deactivation";
import { getLiveSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Settings | Makan Mantraa",
};

export default async function SettingsPage() {
  const session = await getLiveSession();
  // A guest is not sent away: the dashboard layout keeps them here behind
  // `DashboardGuestGate`, which blurs this shell and asks them to sign in.
  if (!session) return <DashboardGuestPlaceholder />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-foreground md:text-[30px]">
          Settings
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">Manage your account.</p>
      </div>

      {/* The reversible option leads; deleting is the last thing on the page. */}
      <Panel title="Account" icon={ShieldCheck} tone="bg-[#1160F0]/10 text-[#1160F0]">
        <div className="space-y-4">
          <DeactivateAccount
            email={session.email}
            reactivateDays={REACTIVATE_WINDOW_DAYS}
            purgeDays={PURGE_AFTER_DAYS}
          />
          <DeleteAccount email={session.email} />
        </div>
      </Panel>
    </div>
  );
}
