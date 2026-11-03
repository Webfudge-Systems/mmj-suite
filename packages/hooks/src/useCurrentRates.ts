"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchCurrentRates, type RateCard } from "@webfudge/utils/api";

type Options = {
  /** How often to check for a new rate card, in milliseconds. */
  refreshMs?: number;
  /** Server-rendered card to show before the first fetch. */
  initial?: RateCard | null;
};

/**
 * Today's rate card from the backend. Refreshes on an interval and whenever the
 * window regains focus, so a rate published in the Back Office reaches every
 * open screen within a minute.
 */
export function useCurrentRates(apiUrl: string, { refreshMs = 60_000, initial = null }: Options = {}) {
  const [card, setCard] = useState<RateCard | null>(initial);
  const [loading, setLoading] = useState(initial === null);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  const refresh = useCallback(() => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;

    return fetchCurrentRates(apiUrl, { signal: current.signal, cache: "no-store" })
      .then((next) => {
        setCard(next);
        setError(null);
      })
      .catch((cause: Error) => {
        if (cause.name !== "AbortError") setError(cause.message);
      })
      .finally(() => {
        if (controller.current === current) setLoading(false);
      });
  }, [apiUrl]);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, refreshMs);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      controller.current?.abort();
    };
  }, [refresh, refreshMs]);

  return { card, loading, error, refresh };
}
