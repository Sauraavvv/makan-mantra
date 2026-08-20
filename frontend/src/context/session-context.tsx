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

import { claimGuestActivity } from "@/lib/guest-activity";

export type SessionUser = {
  name: string;
  email: string;
  role: string;
  profileImageUrl: string;
  phone: string;
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
      const nextUser = data.user ?? null;

      // Before the account is announced, not after: everything downstream reads
      // its history the moment `user` appears, and a claim that landed later
      // would leave those reads a step behind what the account now holds. It is
      // a no-op with nothing stored, which is every load but the first after a
      // sign-in.
      if (nextUser) await claimGuestActivity();

      setUser(nextUser);
    } catch {
      // Leave the last known state alone — a blip should not look like a sign-out.
    } finally {
      setLoaded(true);
    }
  }, []);

  // Signing in and out both land on a different route, so following navigation
  // keeps the header honest without polling.
  useEffect(() => {
    const timeout = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timeout);
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
