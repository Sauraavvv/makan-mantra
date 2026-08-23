import { NextRequest, NextResponse } from "next/server";

import { backendUrl, NO_STORE, serviceHeaders } from "@/lib/chat/backend";
import { sendSampleMatchesEmail, type SampleMatch } from "@/lib/auth/email";

export const runtime = "nodejs";

/**
 * Sends a finished chat search to an inbox.
 *
 * The body carries the address and the search, never the listings: those are
 * fetched back from the chat service, which generates them from the same slots
 * it generated the on-screen ones from. Letting the browser post the contents
 * would make this an open relay — any address, any text, our branding on it.
 */
export async function POST(request: NextRequest) {
  const { to, slots } = (await request.json().catch(() => ({}))) as {
    to?: string;
    slots?: Record<string, unknown>;
  };

  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400, headers: NO_STORE });
  }

  try {
    const upstream = await fetch(backendUrl("/matches"), {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ slots: slots ?? {} }),
      cache: "no-store",
    });
    if (!upstream.ok) throw new Error("matches unavailable");

    const { summary, matches } = (await upstream.json()) as {
      summary: string;
      matches: SampleMatch[];
    };
    if (!matches?.length) throw new Error("nothing to send");

    await sendSampleMatchesEmail(to, summary, matches);
    return NextResponse.json({ sent: true }, { headers: NO_STORE });
  } catch {
    // The assistant has already told the visitor it was sent, so this is
    // logged as a failure here rather than contradicting it on screen.
    return NextResponse.json({ error: "Could not send that email" }, { status: 502, headers: NO_STORE });
  }
}
