"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { StaffRole } from "@webfudge/config";
import { ApiError, fetchStaffProfile, signIn, signOut, type StaffProfile } from "@webfudge/utils/api";
import { ACCESS_TOKEN_RENEW_MS, refreshAccessToken } from "../services";

type Status = "loading" | "signed_out" | "signed_in";

type AuthContextValue = {
  status: Status;
  staff: StaffProfile | null;
  apiUrl: string;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Runs a request with a valid access token, renewing it once if it has expired. */
  withToken: <T>(request: (token: string) => Promise<T>) => Promise<T>;
  hasRole: (...roles: StaffRole[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ apiUrl, children }: { apiUrl: string; children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const token = useRef<string | null>(null);

  const clear = useCallback(() => {
    token.current = null;
    setStaff(null);
    setStatus("signed_out");
  }, []);

  /** Loads the staff profile for a token. A signed-in user who is not staff is signed out again. */
  const adopt = useCallback(
    async (accessToken: string) => {
      token.current = accessToken;
      try {
        const profile = await fetchStaffProfile(apiUrl, accessToken);
        setStaff(profile);
        setStatus("signed_in");
      } catch (error) {
        await signOut(apiUrl, accessToken).catch(() => undefined);
        clear();
        throw error;
      }
    },
    [apiUrl, clear],
  );

  useEffect(() => {
    let cancelled = false;
    refreshAccessToken(apiUrl)
      .then((accessToken) => {
        if (cancelled) return;
        if (accessToken) return adopt(accessToken);
        clear();
      })
      .catch(() => !cancelled && clear());
    return () => {
      cancelled = true;
    };
  }, [apiUrl, adopt, clear]);

  useEffect(() => {
    if (status !== "signed_in") return;
    const timer = window.setInterval(async () => {
      const next = await refreshAccessToken(apiUrl).catch(() => null);
      if (next) token.current = next;
      else clear();
    }, ACCESS_TOKEN_RENEW_MS);
    return () => window.clearInterval(timer);
  }, [apiUrl, status, clear]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      staff,
      apiUrl,
      async signIn(identifier, password) {
        const accessToken = await signIn(apiUrl, identifier, password);
        await adopt(accessToken);
      },
      async signOut() {
        if (token.current) await signOut(apiUrl, token.current).catch(() => undefined);
        clear();
      },
      async withToken(request) {
        if (!token.current) throw new ApiError("You are signed out.", 401);
        try {
          return await request(token.current);
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 401) throw error;
          const next = await refreshAccessToken(apiUrl);
          if (!next) {
            clear();
            throw error;
          }
          token.current = next;
          return request(next);
        }
      },
      hasRole(...roles) {
        return !!staff && roles.includes(staff.staffRole);
      },
    }),
    [status, staff, apiUrl, adopt, clear],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
