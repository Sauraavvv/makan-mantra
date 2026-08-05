"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

export type SessionUser = {
  name: string;
  email: string;
  role: string;
};

type SessionValue = {
  user: SessionUser | null;
  /** False only until the first read settles, so the header can stay quiet. */
  loaded: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue>({
  user: null,
  loaded: false,
  refresh: async () => {},
  signOut: async () => {},
});

export function useSession() {
  return useContext(SessionContext);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await res.json()) as { user: SessionUser | null };
      setUser(data.user ?? null);
    } catch {
      // Leave the last known state alone — a blip should not look like a sign-out.
    } finally {
      setLoaded(true);
    }
  }, []);

  // Signing in and out both land on a different route, so following navigation
  // keeps the header honest without polling.
  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  }, []);

  return (
    <SessionContext.Provider value={{ user, loaded, refresh, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}
