import { ApiError, refreshSession } from "@webfudge/utils/api";

/**
 * The backend rotates the refresh cookie on every use, so two refreshes in
 * flight at once would leave one of them holding a dead token. All callers in
 * the page share one refresh request.
 */
let inFlight: Promise<string | null> | null = null;

/** A fresh access token, or null when there is no signed-in session. */
export function refreshAccessToken(apiUrl: string): Promise<string | null> {
  if (!inFlight) {
    inFlight = refreshSession(apiUrl)
      .catch((error) => {
        if (error instanceof ApiError && (error.status === 400 || error.status === 401)) return null;
        throw error;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

/** Access tokens last ten minutes; renew a little before that. */
export const ACCESS_TOKEN_RENEW_MS = 8 * 60 * 1000;
