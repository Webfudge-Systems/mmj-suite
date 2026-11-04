"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@webfudge/auth/components";
import { ApiError, apiRequest } from "@webfudge/utils/api";
import { API_URL } from "./env";

type Method = "GET" | "POST" | "PUT";

/** Calls the backend as the signed-in staff member, renewing the session once if it has expired. */
export function useApi() {
  const { withToken } = useAuth();
  return useMemo(() => {
    const send = <T,>(method: Method, path: string, body?: unknown) =>
      withToken((token) => apiRequest<T>(API_URL, path, { method, body, token }));
    return {
      get: <T,>(path: string) => send<T>("GET", path),
      post: <T,>(path: string, body: unknown) => send<T>("POST", path, body ?? {}),
      put: <T,>(path: string, body: unknown) => send<T>("PUT", path, body),
    };
  }, [withToken]);
}

export function errorMessage(error: unknown, fallback = "Something went wrong. Check the connection and try again."): string {
  return error instanceof ApiError ? error.message : fallback;
}

/**
 * Loads `path` and reloads it when the path changes or `reload` is called.
 * Pass null to wait (for example until a branch is chosen).
 */
export function useResource<T>(path: string | null) {
  const api = useApi();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (path === null) return;
    let active = true;
    api
      .get<T>(path)
      .then((next) => {
        if (!active) return;
        setData(next);
        setError(null);
      })
      .catch((cause) => {
        if (active) setError(errorMessage(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, path, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return { data, error, loading: loading && data === null, reload, setData };
}
