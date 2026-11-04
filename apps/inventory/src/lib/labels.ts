import type { Receipt, Transfer } from "@webfudge/utils/api";

export const SOURCE_LABELS: Record<Receipt["source"], string> = {
  purchase: "Supplier bill",
  karigar: "Karigar delivery",
  opening_stock: "Opening stock",
};

export const TRANSFER_STATUS: Record<Transfer["status"], { label: string; tone: "navy" | "warn" | "ok" }> = {
  in_transit: { label: "In transit", tone: "navy" },
  partly_received: { label: "Partly received", tone: "warn" },
  received: { label: "Received", tone: "ok" },
};

/** "1 piece", "3 pieces". */
export const pieces = (count: number) => `${count} ${count === 1 ? "piece" : "pieces"}`;
