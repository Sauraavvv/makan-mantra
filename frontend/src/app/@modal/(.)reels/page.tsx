import { ReelsViewer } from "@/components/reels/reels-viewer";

/**
 * `/reels` opened from a page on the site: rendered into the root `@modal`
 * slot, over the page it was opened from, which stays visible (blurred)
 * underneath. A refresh or a shared link renders `app/reels/page.tsx` instead.
 */
export default async function ReelsModal({
  searchParams,
}: {
  searchParams: Promise<{ p?: string | string[] }>;
}) {
  const { p } = await searchParams;
  return <ReelsViewer startId={typeof p === "string" ? p : null} overlay />;
}
