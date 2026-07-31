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
import { login as apiLogin, signup as apiSignup, resetPassword as apiResetPassword, fetchMe, updateMe } from "../api/auth";
import { impersonateUser } from "../api/admin";
import { User } from "../api/types";
import { registerForPushNotificationsAsync } from "../lib/pushNotifications";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isImpersonating: boolean;
  // True for the single session right after a successful signup (not on
  // login, and not on resuming a stored token) — lets the Dashboard show a
  // one-time "set up your farm now, or later" prompt instead of silently
  // dropping a brand-new org owner into an empty dashboard.
  justSignedUp: boolean;
  dismissWelcome: () => void;
  login: (email: string, password: string) => Promise<void>;
  resetPassword: (newPassword: string, firebaseIdToken: string) => Promise<void>;
  signup: (
    organizationName: string,
    name: string,
    email: string,
    password: string,
    phone: string,
    firebaseIdToken: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (input: { name?: string; email?: string; phone?: string; firebaseIdToken?: string }) => Promise<void>;
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
  const [justSignedUp, setJustSignedUp] = useState(false);

  const dismissWelcome = useCallback(() => setJustSignedUp(false), []);

  const logout = useCallback(async () => {
    await clearToken();
    await clearAdminToken();
    setIsImpersonating(false);
    setJustSignedUp(false);
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
        // A genuine 401 already triggers clearToken()/onUnauthorized via the
        // apiClient response interceptor. Anything else here (rate limit,
        // network blip) is transient — leave the stored token alone so the
        // user isn't permanently logged out over a hiccup; they just see
        // Login for this load and a retry (refresh) picks the token back up.
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

  const resetPassword = useCallback(async (newPassword: string, firebaseIdToken: string) => {
    const res = await apiResetPassword({ newPassword, firebaseIdToken });
    await setToken(res.token);
    setUser(res.user);
  }, []);

  const signup = useCallback(
    async (organizationName: string, name: string, email: string, password: string, phone: string, firebaseIdToken: string) => {
      const res = await apiSignup({ organizationName, name, email, password, phone, firebaseIdToken });
      await setToken(res.token);
      setUser(res.user);
      setJustSignedUp(true);
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

  const updateProfile = useCallback(async (input: { name?: string; email?: string; phone?: string; firebaseIdToken?: string }) => {
    const updated = await updateMe(input);
    setUser(updated);
  }, []);

  const hasPermission = useCallback((key: string) => user?.permissions.includes(key) ?? false, [user]);

  useEffect(() => {
    if (user) void registerForPushNotificationsAsync();
  }, [user?.id]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isImpersonating,
      justSignedUp,
      dismissWelcome,
      login,
      resetPassword,
      signup,
      logout,
      updateProfile,
      hasPermission,
      impersonate,
      stopImpersonating,
    }),
    [
      user,
      isLoading,
      isImpersonating,
      justSignedUp,
      dismissWelcome,
      login,
      resetPassword,
      signup,
      logout,
      updateProfile,
      hasPermission,
      impersonate,
      stopImpersonating,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
