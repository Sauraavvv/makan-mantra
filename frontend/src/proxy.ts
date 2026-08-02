import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE = "mm_session";
const ADMIN_COOKIE = "mm_admin";

const PUBLIC_PATHS = ["/login", "/register", "/verify-email"];

/** Reachable without an admin session — otherwise nobody could ever sign in. */
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/setup"];

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

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (await isValid(req.cookies.get(COOKIE)?.value)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
