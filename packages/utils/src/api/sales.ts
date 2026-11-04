import type { Purity } from "@webfudge/config";
import type { BranchRef } from "./stock";

/** Response shapes of the /api/sales and /api/floor endpoints. */

export type PaymentMode = "cash" | "upi" | "card" | "bank_transfer" | "cheque";
export type Payment = { mode: PaymentMode; amount: number; reference: string | null };

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  bank_transfer: "Bank transfer",
  cheque: "Cheque",
};

export type Customer = {
  id: number;
  name: string;
  phone: string;
  altPhone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  pan: string | null;
  gstin: string | null;
  notes: string | null;
  createdAt: string;
};

export type CustomerRef = { id: number; name: string; phone: string; pan: string | null };

export type CustomerDetail = Customer & {
  invoices: { id: number; number: string; invoiceDate: string; total: number; status: "paid" | "cancelled" }[];
  advances: { id: number; number: string; balance: number; lockedPurity: Purity | null; lockedRate: number | null; lockedWeightLeft: number | null; validUntil: string | null }[];
  creditNotes: { id: number; number: string; balance: number }[];
};

export type EstimateLine = { itemId: number; tagNumber: string };

export type BillLine = {
  itemId: number;
  tagNumber: string;
  huid: string | null;
  hsn: string;
  description: string;
  designCode: string | null;
  category: string | null;
  metal: string;
  purity: Purity;
  grossWeight: number;
  stoneWeight: number;
  netWeight: number;
  ratePerGram: number;
  todayRate: number;
  lockedGrams: number;
  making: { type: "per_gram" | "percent" | "fixed"; value: number };
  metalValue: number;
  makingCharge: number;
  makingDiscount: number;
  stoneValue: number;
  otherCharges: number;
  taxableValue: number;
  gst: number;
  total: number;
  returnedAt?: string | null;
  creditNoteNumber?: string | null;
};

export type OldGoldLine = {
  description: string;
  metal: "gold" | "silver";
  grossWeight: number;
  lessWeight: number;
  fineness: number;
  pureRate: number;
  deductionPercent: number;
  netWeight: number;
  fineWeight: number;
  value: number;
};

export type Quote = {
  customer: CustomerRef | null;
  estimate: { id: number; number: string } | null;
  rateCard: { id: number; effectiveFrom: string };
  lines: BillLine[];
  taxableValue: number;
  gst: number;
  cgst: number;
  sgst: number;
  roundOff: number;
  total: number;
  oldGold: { lines: OldGoldLine[]; value: number };
  creditNotes: { id: number; number: string; used: number }[];
  creditNoteUsed: number;
  advances: { id: number; number: string; used: number; lockedGrams: number }[];
  advanceUsed: number;
  amountDue: number;
  panRequired: boolean;
  panMissing: boolean;
  cashAllowed: number;
  discountLimitPercent: number;
  warnings: string[];
};

export type Estimate = {
  id: number;
  number: string;
  status: "open" | "billed" | "cancelled";
  note: string | null;
  createdAt: string;
  billedAt: string | null;
  cancelledAt: string | null;
  lines: EstimateLine[];
  customer: CustomerRef | null;
  salesperson: string | null;
  branch: BranchRef | null;
  invoice: { id: number; number: string } | null;
  quote?: Quote | { error: string } | null;
};

export type InvoiceSummary = {
  id: number;
  number: string;
  status: "paid" | "cancelled";
  invoiceDate: string;
  customer: { id: number; name: string; phone: string; address: string | null; pan: string | null; gstin: string | null };
  total: number;
  amountDue: number;
  pieces: number;
  branch: BranchRef | null;
  salesperson: string | null;
  cashier: string | null;
};

export type Invoice = InvoiceSummary & {
  lines: BillLine[];
  rates: { rateCardId: number; effectiveFrom: string; lines: { purity: Purity; ratePerGram: number }[] };
  taxableValue: number;
  cgst: number;
  sgst: number;
  roundOff: number;
  oldGoldValue: number;
  oldGold: { number: string; lines: OldGoldLine[] } | null;
  advanceUsed: number;
  creditNoteUsed: number;
  payments: Payment[];
  notes: string | null;
  amountInWords: string;
  estimate: { id: number; number: string } | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  seller: { name: string; tradeName: string; gstin: string | null; phone: string | null; email: string | null; address: string | null };
};

export type Advance = {
  id: number;
  number: string;
  status: "open" | "used" | "refunded";
  amount: number;
  balance: number;
  payments: Payment[];
  lockedPurity: Purity | null;
  lockedRate: number | null;
  lockedWeight: number | null;
  lockedWeightUsed: number;
  note: string | null;
  validUntil: string | null;
  createdAt: string;
  customer: CustomerRef | null;
  by: string | null;
  branch: BranchRef | null;
};

export type CreditNote = {
  id: number;
  number: string;
  status: "open" | "used" | "refunded";
  amount: number;
  balance: number;
  lines: { kind: string; tagNumber?: string; description?: string; paid?: number; amount: number; invoice?: string }[];
  deductionPercent: number;
  reason: string | null;
  createdAt: string;
  customer: CustomerRef | null;
  by: string | null;
  branch: BranchRef | null;
  invoice: { id: number; number: string } | null;
};

export type OldGoldRecord = {
  id: number;
  number: string;
  kind: "exchange" | "purchase";
  lines: OldGoldLine[];
  totalValue: number;
  payouts: Payment[];
  idProof: string | null;
  createdAt: string;
  customer: CustomerRef | null;
  by: string | null;
  branch: BranchRef | null;
  invoice: { id: number; number: string } | null;
};

export type DaySummary = {
  date: string;
  branch: BranchRef;
  openingCash: number;
  in: Partial<Record<PaymentMode, number>>;
  out: Partial<Record<PaymentMode, number>>;
  expectedCash: number;
  counts: { invoices: number; salesTotal: number; oldGoldTaken: number; oldGoldBought: number; advances: number; cancelled: number };
  closed: { countedCash: number; difference: number; notes: string | null; closedBy: string | null; at: string } | null;
};

/* Showroom floor */

export type PiecePricing = {
  ratePerGram: number;
  metalValue: number;
  makingCharge: number;
  stoneValue: number;
  otherCharges: number;
  taxableValue: number;
  gst: number;
  total: number;
  price: number;
};

export type FloorPiece = {
  id: number;
  tagNumber: string;
  huid: string | null;
  purity: Purity;
  grossWeight: number;
  stoneWeight: number;
  netWeight: number;
  status: "in_stock" | "with_staff" | "reserved";
  location: { id: number; fullCode: string; code: string; name: string | null; parent: string | null } | null;
  slot: string | null;
  heldBy: { id: number; name: string | null } | null;
  heldSince: string | null;
  pricing: PiecePricing | null;
  design?: { id: number; code: string; name: string } | null;
};

export type FloorDesign = {
  id: number;
  code: string;
  name: string;
  metal: string;
  category: { id: number; name: string; code: string | null } | null;
  occasion: string | null;
  image: { id: number; url: string; thumbnailUrl: string } | null;
  here: number;
  elsewhere: number;
  priceFrom: number | null;
  priceTo: number | null;
  weightFrom: number;
  weightTo: number;
};

export type DeviceInfo = { id: number; name: string; branch: BranchRef; organization?: string };

export type Tablet = {
  id: number;
  name: string;
  isActive: boolean;
  paired: boolean;
  pairingExpiresAt: string | null;
  lastSeenAt: string | null;
  addedBy: string | null;
  branch: BranchRef | null;
  pairingCode?: string;
};

export type TeamMember = {
  id: number;
  name: string;
  email: string;
  staffRole: string;
  blocked: boolean;
  hasPin: boolean;
  branches: { id: number; name: string; code: string }[];
};
