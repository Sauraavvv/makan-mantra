import { proxyJson } from "@/lib/chat/backend";

export const dynamic = "force-dynamic";

export async function GET() {
  return proxyJson("/sessions");
}
