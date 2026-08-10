import type { Metadata } from "next";
import { RotateCcw } from "lucide-react";

import { ReactivateForm } from "@/app/(auth)/reactivate/reactivate-form";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";

export const metadata: Metadata = {
  title: "Reactivate your account | Makan Mantraa",
  robots: { index: false, follow: false },
};

export default async function ReactivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      <Header />

      <main className="mx-auto flex w-full max-w-[1250px] flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-xl border border-border bg-background p-6">
          <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <RotateCcw className="size-5" strokeWidth={1.9} />
          </span>

          <h1 className="mt-4 text-xl font-bold tracking-tight">Reactivate your account</h1>

          <div className="mt-4">
            <ReactivateForm token={token} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
