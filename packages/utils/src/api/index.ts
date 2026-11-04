import type { Metal, Purity, StaffRole } from "@webfudge/config";

export type RateLine = {
  purity: Purity;
  metal: Metal;
  label: string;
  ratePerGram: number;
  /** Move since the previous rate card, in rupees per gram. Null on the first card. */
  changePerGram: number | null;
};

export type RateCard = {
  id: number;
  effectiveFrom: string;
  note: string | null;
  setBy: string | null;
  rates: RateLine[];
};

export type Branch = {
  id: number;
  name: string;
  code: string;
  city: string | null;
};

export type StaffProfile = {
  id: number;
  username: string;
  email: string;
  fullName: string | null;
  staffRole: StaffRole;
  organization: { id: number; name: string; slug: string };
  branches: Branch[];
};

export type PublishRatesInput = {
  rates: { purity: Purity; ratePerGram: number }[];
  note?: string;
  confirmLargeChange?: boolean;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
  /** Send and receive the refresh cookie. Needed for the auth endpoints. */
  withCredentials?: boolean;
  /** Passed through to fetch, for Next.js caching options. */
  init?: RequestInit & { next?: { revalidate?: number; tags?: string[] } };
};

/** Strapi error bodies look like { error: { status, name, message, details } }. */
async function readError(response: Response): Promise<ApiError> {
  let message = `Request failed with status ${response.status}`;
  let details: unknown;
  try {
    const body = await response.json();
    if (body?.error?.message) message = body.error.message;
    details = body?.error?.details;
  } catch {
    // Not JSON. Keep the status message.
  }
  return new ApiError(message, response.status, details);
}

export async function apiRequest<T>(baseUrl: string, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api${path}`, {
    ...options.init,
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: options.withCredentials ? "include" : "same-origin",
    signal: options.signal ?? options.init?.signal,
  });

  if (!response.ok) throw await readError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Today's rate card. Public, so the website can call it without signing in. */
export async function fetchCurrentRates(
  baseUrl: string,
  init?: RequestOptions["init"],
): Promise<RateCard | null> {
  const { data } = await apiRequest<{ data: RateCard | null }>(baseUrl, "/rates/current", { init });
  return data;
}

export async function fetchRateHistory(baseUrl: string, token: string, limit = 30): Promise<RateCard[]> {
  const { data } = await apiRequest<{ data: RateCard[] }>(baseUrl, `/rates/history?limit=${limit}`, { token });
  return data;
}

export async function publishRates(baseUrl: string, token: string, input: PublishRatesInput): Promise<RateCard> {
  const { data } = await apiRequest<{ data: RateCard }>(baseUrl, "/rates", { method: "POST", body: input, token });
  return data;
}

export async function fetchStaffProfile(baseUrl: string, token: string): Promise<StaffProfile> {
  const { data } = await apiRequest<{ data: StaffProfile }>(baseUrl, "/staff/me", { token });
  return data;
}

/** Signs in with email or username. The refresh token is set as an httpOnly cookie by the backend. */
export async function signIn(baseUrl: string, identifier: string, password: string): Promise<string> {
  const { jwt } = await apiRequest<{ jwt: string }>(baseUrl, "/auth/local", {
    method: "POST",
    body: { identifier, password },
    withCredentials: true,
  });
  return jwt;
}

/** Swaps the refresh cookie for a new access token. Throws ApiError 401 when the session has ended. */
export async function refreshSession(baseUrl: string): Promise<string> {
  const { jwt } = await apiRequest<{ jwt: string }>(baseUrl, "/auth/refresh", {
    method: "POST",
    body: {},
    withCredentials: true,
  });
  return jwt;
}

export async function signOut(baseUrl: string, token: string): Promise<void> {
  await apiRequest(baseUrl, "/auth/logout", { method: "POST", body: {}, token, withCredentials: true });
}

export * from "./stock";
