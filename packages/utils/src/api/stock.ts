import type { Metal, Purity } from "@webfudge/config";

/** Response shapes of the /api/stock endpoints. */

export type Pagination = { page: number; pageSize: number; pageCount: number; total: number };
export type Page<T> = { data: T[]; meta: { pagination: Pagination } };

export type MakingCharge = { type: "per_gram" | "percent" | "fixed"; value: number };

export type ItemStatus =
  | "in_stock"
  | "with_staff"
  | "reserved"
  | "sold"
  | "on_approval"
  | "at_karigar"
  | "in_transit"
  | "melted";

export type LocationKind = "showcase" | "counter" | "tray" | "safe" | "back_office";

export type BranchRef = { id: number; code: string; name: string };

export type Category = { id: number; name: string; code: string | null; slug: string };

export type Design = {
  id: number;
  code: string;
  name: string;
  metal: Metal;
  defaultPurity: Purity | null;
  occasion: string | null;
  description: string | null;
  making: MakingCharge | null;
  isOnline: boolean;
  isActive: boolean;
  category: { id: number; name: string; code: string | null } | null;
  collection: { id: number; name: string } | null;
  images: { id: number; url: string; thumbnailUrl: string; alternativeText: string | null }[];
  inStock?: number;
};

export type Supplier = {
  id: number;
  name: string;
  kind: "supplier" | "karigar";
  phone: string | null;
  gstin: string | null;
  city: string | null;
  notes: string | null;
  isActive: boolean;
};

export type LocationRef = { id: number; code: string; fullCode: string; name: string | null; kind: LocationKind };

export type StockLocation = LocationRef & {
  sortOrder: number;
  isActive: boolean;
  parentId: number | null;
  branch: BranchRef | null;
  pieces: number;
};

export type StockItem = {
  id: number;
  tagNumber: string;
  legacyTag: string | null;
  huid: string | null;
  metal: Metal;
  purity: Purity;
  grossWeight: number;
  stoneWeight: number;
  netWeight: number;
  making: MakingCharge | null;
  stoneValue: number;
  /** Present only for roles allowed to see cost. */
  costPrice?: number | null;
  status: ItemStatus;
  slot: string | null;
  notes: string | null;
  receivedAt: string | null;
  design: { id: number; code: string; name: string; category: { id: number; name: string; code: string | null } | null } | null;
  branch: BranchRef | null;
  location: LocationRef | null;
  supplier: { id: number; name: string; kind: string } | null;
  receipt: { id: number; number: string } | null;
};

export type Movement = {
  id: number;
  type: "received" | "imported" | "moved" | "edited" | "dispatched" | "arrived" | "audited";
  at: string;
  fromStatus: string | null;
  toStatus: string | null;
  reference: string | null;
  note: string | null;
  changes: Record<string, [unknown, unknown]> | null;
  fromLocation: LocationRef | null;
  toLocation: LocationRef | null;
  fromBranch: BranchRef | null;
  toBranch: BranchRef | null;
  by: string | null;
};

export type Receipt = {
  id: number;
  number: string;
  source: "purchase" | "karigar" | "opening_stock";
  billNumber: string | null;
  billDate: string | null;
  notes: string | null;
  createdAt: string;
  branch: BranchRef | null;
  supplier: { id: number; name: string; kind: string } | null;
  receivedBy: string | null;
  pieces?: number;
  items?: StockItem[];
};

export type TransferLine = { itemId: number; tagNumber: string; legacyTag: string | null; huid: string | null; receivedAt: string | null };

export type Transfer = {
  id: number;
  number: string;
  status: "in_transit" | "partly_received" | "received";
  note: string | null;
  dispatchedAt: string;
  completedAt: string | null;
  fromBranch: BranchRef | null;
  toBranch: BranchRef | null;
  dispatchedBy: string | null;
  receivedBy: string | null;
  pieces: number;
  received: number;
  lines: TransferLine[];
};

export type AuditScan = { id: number | null; code: string; tagNumber: string | null; locationId: number | null; at: string };

export type StockAudit = {
  id: number;
  status: "open" | "closed";
  startedAt: string;
  closedAt: string | null;
  branch: BranchRef | null;
  location: { id: number; fullCode: string; name: string | null; kind: LocationKind } | null;
  startedBy: string | null;
  closedBy: string | null;
  expectedCount: number;
  scannedCount: number;
  foundCount: number;
  recentScans: AuditScan[];
  result: { matched: number; missing: StockItem[]; misplaced: StockItem[]; unknown: string[] } | null;
};

export type StockSummary = {
  inStock: number;
  untrayed: number;
  withStaff: number;
  inTransit: number;
  receivedToday: number;
  incomingTransfers: number;
  lastAuditAt: string | null;
  byPurity: { purity: Purity; pieces: number; netWeight: number; grossWeight: number }[];
};

/** One scanned code's outcome when moving or receiving pieces. */
export type ScanResult = { code: string; ok: boolean; tagNumber?: string; message: string };

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  in_stock: "In stock",
  with_staff: "With staff",
  reserved: "Reserved",
  sold: "Sold",
  on_approval: "On approval",
  at_karigar: "At karigar",
  in_transit: "In transit",
  melted: "Melted",
};

export const LOCATION_KIND_LABELS: Record<LocationKind, string> = {
  showcase: "Showcase",
  counter: "Counter",
  tray: "Tray",
  safe: "Safe",
  back_office: "Back office",
};
