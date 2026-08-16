import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const ADMIN_COOKIE = "mm_admin";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Reachable without an admin session — otherwise nobody could ever sign in. */
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/setup"];

/**
 * Short on purpose: it bounds how long a page stays wrongly gone (or wrongly
 * live) after an admin retires or restores it. The list is tiny and the call is
 * one small request, so a low ceiling costs very little.
 */
const GONE_TTL_MS = 30 * 1000;

/**
 * Best-effort cache of the retired slugs. Proxy may run in fresh isolates, so a
 * miss only costs one extra fetch — it never changes the answer.
 */
let goneSlugs: { at: number; slugs: Set<string> } | null = null;

async function retiredSlugs(): Promise<Set<string>> {
  if (goneSlugs && Date.now() - goneSlugs.at < GONE_TTL_MS) {
    return goneSlugs.slugs;
  }

  try {
    // Next patches fetch — without this the response itself would be cached,
    // and the TTL above would keep handing back the same stale list.
    const res = await fetch(`${API}/gone-slugs`, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));

    const data = (await res.json()) as { slugs?: string[] };
    goneSlugs = { at: Date.now(), slugs: new Set(data.slugs ?? []) };
  } catch {
    // Keep serving the previous list rather than resurrecting dead URLs.
    goneSlugs = { at: Date.now(), slugs: goneSlugs?.slugs ?? new Set() };
  }

  return goneSlugs.slugs;
}

async function isValid(token: string | undefined, kind?: string) {
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return kind ? payload.kind === kind : true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admins carry their own cookie, so /admin never consults the site session.
  if (pathname.startsWith("/admin")) {
    if (PUBLIC_ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }

    if (await isValid(req.cookies.get(ADMIN_COOKIE)?.value, "admin")) {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  /**
   * The dashboard is no longer gated here. A signed-out visitor has two pages
   * in it worth reading — the searches and views their own device recorded —
   * and bouncing them to /login took those away along with everything else.
   *
   * What replaces this is not weaker, only later: every dashboard page reads
   * the session itself and returns a placeholder instead of fetching an
   * account's data, and `DashboardGuestGate` puts the sign-in ask over the
   * pages that are not theirs to read. A new page under /dashboard must do the
   * same — there is no longer a redirect here to catch one that forgets.
   */
  if (pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  // A deactivated location page must answer 410 at its own URL — a redirect
  // would leave the original URL indexed. Status codes are only settable here,
  // before the page renders, so the Gone UI is fetched and passed through.
  const slug = pathname.slice(1);
  if (slug && slug !== "gone" && !slug.includes("/") && (await retiredSlugs()).has(slug)) {
    const page = await fetch(new URL("/gone", req.url));

    return new NextResponse(await page.text(), {
      status: 410,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "x-robots-tag": "noindex",
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Everything except API routes, Next internals, metadata files and static
     * assets — marketing slugs have to be checked for retired location pages.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:webp|png|jpg|jpeg|gif|svg|ico|css|js|txt|xml)$).*)",
  ],
};
