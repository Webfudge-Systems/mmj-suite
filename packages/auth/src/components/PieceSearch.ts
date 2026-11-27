"use client";

import type { ScanSuggestion } from "@webfudge/ui";
import { ITEM_STATUS_LABELS, type ItemStatus, type StockItem } from "@webfudge/utils/api";
import { formatWeight } from "@webfudge/utils/formatters";
import { useAuth } from "./AuthProvider";
import { useApi } from "./data";

type Options = {
  /** Only pieces at this branch. Nothing is suggested without one. */
  branchId: number | null | undefined;
  /** Only pieces in this state, such as "in_stock". Leave out for every unsold piece. */
  status?: ItemStatus;
  /** Greys a piece out, with the reason on the right; or adds a note to one that can be chosen. */
  check?: (item: StockItem) => { disabled?: boolean; aside?: string } | undefined;
};

/**
 * Suggestions for ScanInput's `onSearch`: pieces whose tag, old tag, HUID or design name match
 * what is typed, with a thumbnail, design, purity, net weight and tray. A scanned tag plus Enter
 * still goes straight to `onScan`.
 */
export function usePieceSearch({ branchId, status, check }: Options) {
  const api = useApi();
  const { apiUrl } = useAuth();
  const media = (url: string) => (/^https?:\/\//.test(url) ? url : `${apiUrl}${url}`);

  return async function findPieces(query: string): Promise<ScanSuggestion[]> {
    if (!branchId) return [];
    const params = new URLSearchParams({ branchId: String(branchId), pageSize: "8", q: query });
    if (status) params.set("status", status);
    const { data } = await api.get<{ data: StockItem[] }>(`/stock/items?${params}`);
    return data.map((item) => {
      const photo = item.photos?.[0] ?? item.design?.image ?? null;
      const verdict = check?.(item);
      const wrongState = status !== undefined && item.status !== status;
      return {
        code: item.tagNumber,
        title: item.tagNumber,
        detail: [item.design?.name, item.purity, formatWeight(item.netWeight), item.location?.fullCode].filter(Boolean).join(" · "),
        aside: verdict?.aside ?? (wrongState ? ITEM_STATUS_LABELS[item.status] : undefined),
        imageUrl: photo ? media(photo.thumbnailUrl) : null,
        disabled: verdict?.disabled || wrongState,
      };
    });
  };
}
