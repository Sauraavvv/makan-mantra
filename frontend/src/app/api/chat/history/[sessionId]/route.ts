import { NextRequest } from "next/server";

import { proxyJson } from "@/lib/chat/backend";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ sessionId: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  const { sessionId } = await params;
  return proxyJson(`/history/${encodeURIComponent(sessionId)}`);
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const { sessionId } = await params;
  return proxyJson(`/history/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
}
