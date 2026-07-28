"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { logout as apiLogout } from "@/lib/api/auth";
import {
  clearSession,
  getAccessToken,
  getAdminEmail,
  hasSession,
} from "@/lib/auth-storage";

type AuthContextValue = {
  ready: boolean;
  authenticated: boolean;
  email: string | null;
  refresh: () => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const refresh = useCallback(() => {
    const ok = hasSession();
    setAuthenticated(ok);
    setEmail(getAdminEmail());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!ready) return;
    const isLogin = pathname.startsWith("/login");
    if (!authenticated && !isLogin) {
      router.replace("/login");
    } else if (authenticated && isLogin) {
      router.replace("/dashboard");
    }
  }, [authenticated, pathname, ready, router]);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      clearSession();
    }
    queryClient.clear();
    setAuthenticated(false);
    setEmail(null);
    router.replace("/login");
  }, [queryClient, router]);

  const value = useMemo(
    () => ({
      ready,
      authenticated: authenticated && Boolean(getAccessToken()),
      email,
      refresh,
      logout,
    }),
    [ready, authenticated, email, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
