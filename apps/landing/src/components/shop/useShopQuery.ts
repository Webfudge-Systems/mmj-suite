"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Filters live in the URL so a filtered grid can be shared, bookmarked and
 * rendered on the server. This hook is the only place that rewrites them.
 */
export function useShopQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const push = useCallback(
    (next: URLSearchParams) => {
      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  /** Setting a facet always returns to page one, otherwise you land on an empty page. */
  const set = useCallback(
    (key: string, value?: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page");
      push(next);
    },
    [params, push],
  );

  /** Clicking the active option a second time removes it. */
  const toggle = useCallback(
    (key: string, value: string) => {
      set(key, params.get(key) === value ? null : value);
    },
    [params, set],
  );

  const clear = useCallback(() => {
    const next = new URLSearchParams();
    const sort = params.get("sort");
    const query = params.get("q");
    if (sort) next.set("sort", sort);
    if (query) next.set("q", query);
    push(next);
  }, [params, push]);

  const hrefWith = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      next.set(key, value);
      const query = next.toString();
      return query ? `${pathname}?${query}` : pathname;
    },
    [params, pathname],
  );

  return { get: (key: string) => params.get(key), set, toggle, clear, hrefWith };
}
