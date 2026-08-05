import { NextResponse } from "next/server";
import { getLiveSession } from "@/lib/auth/session";

/**
 * Who the header should show.
 *
 * The session is read here rather than in the root layout on purpose: touching
 * cookies up there would opt every marketing page out of static rendering.
 */
export async function GET() {
  const session = await getLiveSession();

  return NextResponse.json(
    {
      user: session ? { name: session.name, email: session.email, role: session.role } : null,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
