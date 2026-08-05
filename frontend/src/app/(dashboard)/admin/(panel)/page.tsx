import Link from "next/link";
import { Inbox } from "lucide-react";
import { listSubmissions } from "@/lib/admin/submissions";

export const metadata = { title: "Admin — Makan Mantraa" };

export default async function AdminPage() {
  const { total } = await listSubmissions({ page: 1 });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Overview</h1>

      <Link
        href="/admin/post-property"
        className="flex max-w-xs items-center gap-4 rounded-xl border border-border bg-background p-5 transition-colors hover:bg-secondary/40"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-violet-50 text-violet-600">
          <Inbox className="size-5" strokeWidth={1.8} />
        </span>
        <span>
          <span className="block text-2xl font-bold">{total}</span>
          <span className="block text-sm text-muted-foreground">Post Property enquiries</span>
        </span>
      </Link>
    </div>
  );
}
