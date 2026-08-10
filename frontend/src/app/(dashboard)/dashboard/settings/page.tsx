import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { DeactivateAccount } from "@/components/dashboard/deactivate-account";
import { Panel } from "@/components/dashboard/panel";
import { getLiveSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Settings | Makan Mantraa",
};

export default async function SettingsPage() {
  const session = await getLiveSession();
  if (!session) redirect("/?auth=login");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-foreground md:text-[30px]">Settings</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">Manage your account.</p>
      </div>

      <Panel title="Account" icon={ShieldCheck} tone="bg-[#1160F0]/10 text-[#1160F0]">
        <DeactivateAccount email={session.email} />
      </Panel>
    </div>
  );
}
