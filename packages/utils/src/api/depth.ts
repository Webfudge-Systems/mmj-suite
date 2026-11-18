import type { ImageRef } from "./stock";
import type { Payment } from "./sales";

export type LogEntry = { at: string; by: string | null; text: string };

/* Karigar job work */

/**
 * One handover to a karigar. Metal lines carry purity and weights; stone lines
 * carry a name, a count and a weight in carats or grams. Older lines have no kind
 * and are metal.
 */
export type MetalIssue = {
  at: string;
  by: string | null;
  kind?: "metal" | "stone";
  purity?: string;
  grossWeight?: number;
  fineWeight?: number;
  name?: string;
  pieces?: number;
  weight?: number;
  unit?: "ct" | "g";
  note: string | null;
};

/** A line being typed into a "give to karigar" form, before it is saved. */
export type IssueDraft =
  | { kind: "metal"; purity: string; grossWeight: number; note?: string }
  | { kind: "stone"; name: string; pieces: number; weight: number; unit: "ct" | "g"; note?: string };

export type KarigarMetal = "gold" | "silver" | "platinum";

export type MetalAccount = {
  metal: KarigarMetal;
  issuedGross: number;
  issuedFine: number;
  receivedPieces: number;
  receivedNet: number;
  receivedFine: number;
  wastageAllowed: number;
  balanceFine: number;
};

export type JobWork = {
  id: number;
  number: string;
  status: "open" | "closed";
  description: string | null;
  dueOn: string | null;
  wastagePercent: number;
  labourCharge: number | null;
  issues: MetalIssue[];
  log: LogEntry[];
  closedAt: string | null;
  karigar: { id: number; name: string; phone: string | null } | null;
  branch: { id: number; name: string; code: string } | null;
  by: string | null;
  createdAt: string;
  totals?: { metal?: KarigarMetal; issuedFine: number; receivedFine: number; receivedPieces: number; balanceFine: number };
};

export type JobWorkAccount = {
  /** The metal the headline figures are in: gold whenever gold is involved. */
  metal: KarigarMetal;
  issuedGross: number;
  issuedFine: number;
  receivedPieces: number;
  receivedNet: number;
  receivedFine: number;
  wastageAllowed: number;
  /** Fine metal still with the karigar; negative when the shop owes the karigar. */
  balanceFine: number;
  /** One fine account per metal handled in the job. */
  byMetal: MetalAccount[];
  stonesGiven: { name: string; unit: string; pieces: number; weight: number }[];
  /** Stone weight set in the pieces that came back, in grams. */
  stoneWeightBack: number;
  receipts: { id: number; number: string; createdAt: string }[];
  pieces: { id: number; tagNumber: string; purity: string; grossWeight: number; netWeight: number; fineWeight: number; status: string; design: { id: number; code: string; name: string } | null; receipt: string | null }[];
};

export type JobWorkDetail = JobWork & { account: JobWorkAccount };

/* Approvals */

export type ApprovalLine = {
  itemId: number;
  tagNumber: string;
  design: string | null;
  purity: string;
  grossWeight: number;
  netWeight: number;
  returnedAt: string | null;
  state: "out" | "returned" | "billed";
};

export type ApprovalMemo = {
  id: number;
  number: string;
  status: "open" | "closed";
  party: { name: string; phone: string | null };
  customer: { id: number; name: string; phone: string } | null;
  dueBackOn: string | null;
  note: string | null;
  lines: ApprovalLine[];
  counts: { total: number; out: number; returned: number; billed: number };
  netWeightOut: number;
  log: LogEntry[];
  closedAt: string | null;
  branch: { id: number; name: string; code: string } | null;
  by: string | null;
  createdAt: string;
};

/* Repairs and custom orders */

export type OrderKind = "repair" | "custom";
export type OrderStatus = "received" | "in_work" | "ready" | "delivered" | "cancelled";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Received",
  in_work: "With the karigar",
  ready: "Ready to collect",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export type ServiceOrder = {
  id: number;
  number: string;
  kind: OrderKind;
  status: OrderStatus;
  description: string;
  itemDescription: string | null;
  purity: string | null;
  weightIn: number | null;
  weightOut: number | null;
  estimate: number | null;
  charge: number | null;
  paidTotal: number;
  balanceDue: number | null;
  payments: (Payment & { at: string; by: string | null })[];
  dueOn: string | null;
  deliveredAt: string | null;
  log: LogEntry[];
  photos: ImageRef[];
  customer: { id: number; name: string; phone: string } | null;
  karigar: { id: number; name: string } | null;
  booking: { id: number; number: string; balance: number } | null;
  branch: { id: number; name: string; code: string } | null;
  by: string | null;
  whatsapp: string | null;
  createdAt: string;
};

/* Reports */

export type SalesReport = {
  from: string;
  to: string;
  group: "day" | "month";
  totals: { invoices: number; pieces: number; taxable: number; cgst: number; sgst: number; total: number; oldGoldTaken: number; oldGoldBought: number };
  periods: { period: string; invoices: number; pieces: number; taxable: number; cgst: number; sgst: number; total: number; oldGold: number }[];
  paymentModes: Record<string, number>;
  purities: { purity: string; pieces: number; netWeight: number; fineWeight: number; value: number }[];
  staff: { name: string; invoices: number; pieces: number; total: number }[];
};

export type StockReport = {
  rateCard: { effectiveFrom: string } | null;
  totals: { pieces: number; netWeight: number; metalValue: number; cost?: number };
  purities: { purity: string; pieces: number; grossWeight: number; netWeight: number; fineWeight: number; ratePerGram: number; metalValue: number; cost?: number }[];
  categories: { category: string; pieces: number; netWeight: number; metalValue: number }[];
  statuses: Record<string, number>;
};

export type AgeingReport = {
  buckets: { key: string; label: string; pieces: number; netWeight: number }[];
  oldest: { id: number; tagNumber: string; design: string | null; category: string | null; purity: string; netWeight: number; location: string | null; status: string; days: number }[];
};

export type LiabilitiesReport = {
  rows: { key: string; label: string; count: number; amount: number }[];
  total: number;
  rateLockedGrams: number;
};
