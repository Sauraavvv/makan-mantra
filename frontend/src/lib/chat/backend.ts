import { getLiveSession } from "@/lib/auth/session";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const INTERNAL_TOKEN = process.env.CHAT_INTERNAL_TOKEN || "";

export const NO_STORE = { "cache-control": "no-store" } as const;

/**
 * Identity is resolved here and nowhere else.
 *
 * The `mm_session` cookie stays on this side; the chat service is handed a user
 * id plus a shared token and trusts it. That trade only holds while the token
 * never reaches the browser, so it is read from the server environment and is
 * deliberately not prefixed with NEXT_PUBLIC_.
 */
export async function backendHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const session = await getLiveSession();

  if (session?.userId) {
    headers["X-MM-User-Id"] = session.userId;
    headers["X-MM-Internal-Token"] = INTERNAL_TOKEN;
  }

  return headers;
}

export function backendUrl(path: string) {
  return `${API}/chat${path}`;
}

/** Proxies a JSON call, passing the upstream status through unchanged. */
export async function proxyJson(path: string, init: RequestInit = {}) {
  try {
    const res = await fetch(backendUrl(path), {
      ...init,
      headers: await backendHeaders(),
      cache: "no-store",
    });
    return new Response((await res.text()) || "{}", {
      status: res.status,
      headers: { "content-type": "application/json", ...NO_STORE },
    });
  } catch {
    // A chat service that is down should not read as a broken site.
    return Response.json(
      { detail: "The assistant is unavailable right now." },
      { status: 503, headers: NO_STORE },
    );
  }
}
