import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getToken,
  setToken,
  clearToken,
  getAdminToken,
  setAdminToken,
  clearAdminToken,
  setOnUnauthorized,
} from "../api/client";
import { login as apiLogin, signup as apiSignup, fetchMe } from "../api/auth";
import { impersonateUser } from "../api/admin";
import { User } from "../api/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isImpersonating: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    organizationName: string,
    name: string,
    email: string,
    password: string,
    phone: string,
    firebaseIdToken: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (key: string) => boolean;
  impersonate: (userId: string) => Promise<void>;
  stopImpersonating: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const logout = useCallback(async () => {
    await clearToken();
    await clearAdminToken();
    setIsImpersonating(false);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setOnUnauthorized(() => setUser(null));

    (async () => {
      const token = await getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await fetchMe();
        setUser(me);
        setIsImpersonating(!!(await getAdminToken()));
      } catch {
        await clearToken();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin({ email, password });
    await setToken(res.token);
    setUser(res.user);
  }, []);

  const signup = useCallback(
    async (organizationName: string, name: string, email: string, password: string, phone: string, firebaseIdToken: string) => {
      const res = await apiSignup({ organizationName, name, email, password, phone, firebaseIdToken });
      await setToken(res.token);
      setUser(res.user);
    },
    []
  );

  const impersonate = useCallback(
    async (userId: string) => {
      const currentToken = await getToken();
      const impersonationToken = await impersonateUser(userId);
      if (currentToken) await setAdminToken(currentToken);
      await setToken(impersonationToken);
      queryClient.clear();
      const me = await fetchMe();
      setUser(me);
      setIsImpersonating(true);
    },
    [queryClient]
  );

  const stopImpersonating = useCallback(async () => {
    const adminToken = await getAdminToken();
    if (!adminToken) return;
    await setToken(adminToken);
    await clearAdminToken();
    queryClient.clear();
    const me = await fetchMe();
    setUser(me);
    setIsImpersonating(false);
  }, [queryClient]);

  const hasPermission = useCallback((key: string) => user?.permissions.includes(key) ?? false, [user]);

  const value = useMemo(
    () => ({ user, isLoading, isImpersonating, login, signup, logout, hasPermission, impersonate, stopImpersonating }),
    [user, isLoading, isImpersonating, login, signup, logout, hasPermission, impersonate, stopImpersonating]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
