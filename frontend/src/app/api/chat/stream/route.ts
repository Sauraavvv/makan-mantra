import { NextRequest } from "next/server";

import { backendHeaders, backendUrl, NO_STORE } from "@/lib/chat/backend";

export const runtime = "nodejs";
// Server-sent events must not be collected into a single buffered response.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let upstream: Response;
  try {
    upstream = await fetch(backendUrl("/stream"), {
      method: "POST",
      headers: await backendHeaders(),
      body: await request.text(),
      cache: "no-store",
    });
  } catch {
    return Response.json(
      { detail: "The assistant is unavailable right now." },
      { status: 503, headers: NO_STORE },
    );
  }

  if (!upstream.ok || !upstream.body) {
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { "content-type": "application/json", ...NO_STORE },
    });
  }

  // Hand the stream straight through; re-reading it here would defeat the point.
  return new Response(upstream.body, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
