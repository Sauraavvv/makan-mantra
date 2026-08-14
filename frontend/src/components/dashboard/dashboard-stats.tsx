"use client";

import { Bookmark, Building2, MessageCircle, UserRoundCheck, type LucideIcon } from "lucide-react";

import { useSaved } from "@/context/saved-context";

type StatCard = {
  label: string;
  value: string | number;
  note: string;
  icon: LucideIcon;
  tone: string;
  progress?: number;
};

export function DashboardStats({
  propertiesCount,
  profileCompletion,
}: {
  propertiesCount: number;
  profileCompletion: number;
}) {
  const { items, loaded } = useSaved();
  const stats: StatCard[] = [
    {
      label: "Saved Listings",
      value: loaded ? items.length : "-",
      note: "Properties shortlisted",
      icon: Bookmark,
      tone: "bg-primary/10 text-primary",
    },
    {
      label: "Inquiries",
      value: 0,
      note: "Feature coming soon",
      icon: MessageCircle,
      tone: "bg-primary/10 text-primary",
    },
    {
      label: "Properties Posted",
      value: propertiesCount,
      note: propertiesCount === 1 ? "Active submission" : "Active submissions",
      icon: Building2,
      tone: "bg-[#edf4ff] text-[#2f6fd6]",
    },
    {
      label: "Profile Completion",
      value: `${profileCompletion}%`,
      note: profileCompletion === 100 ? "Profile complete" : "Complete your profile",
      icon: UserRoundCheck,
      tone: "bg-[#eff8ff] text-[#3786c9]",
      progress: profileCompletion,
    },
  ];

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <article key={stat.label} className="min-h-[126px] min-w-0 rounded-xl border border-border bg-white p-4">
            <div className="flex items-start gap-3">
              <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${stat.tone}`}>
                <Icon className="size-[18px]" strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-xl font-bold leading-6 text-foreground">{stat.value}</p>
              </div>
            </div>
            {typeof stat.progress === "number" ? (
              <div className="mt-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-[#e8edf5]">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(0, Math.min(100, stat.progress))}%` }}
                  />
                </div>
                <p className="mt-1.5 truncate text-[10px] text-muted-foreground">{stat.note}</p>
              </div>
            ) : (
              <p className="mt-3 truncate text-[10px] text-muted-foreground">{stat.note}</p>
            )}
          </article>
        );
      })}
    </div>
  );
}
