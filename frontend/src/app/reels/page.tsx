import type { Metadata } from "next";
import { ReelsViewer } from "@/components/reels/reels-viewer";

export const metadata: Metadata = {
  title: "Property Reels | Makan Mantraa",
  description: "Scroll through properties picked from your searches.",
  // The feed is personal and changes per visitor; the listings themselves are
  // indexed through their own pages.
  robots: { index: false, follow: true },
};

export default async function ReelsPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string | string[] }>;
}) {
  const { p } = await searchParams;
  return <ReelsViewer startId={typeof p === "string" ? p : null} />;
}
