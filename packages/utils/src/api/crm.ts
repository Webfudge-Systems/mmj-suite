import type { Customer, Payment } from "./sales";

export type EnquiryStatus = "new" | "contacted" | "visit_booked" | "won" | "lost";
export type EnquirySource = "website" | "walk_in" | "phone" | "whatsapp" | "referral" | "other";

export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  visit_booked: "Visit booked",
  won: "Won",
  lost: "Lost",
};

export const ENQUIRY_SOURCE_LABELS: Record<EnquirySource, string> = {
  website: "Website",
  walk_in: "Walk-in",
  phone: "Phone",
  whatsapp: "WhatsApp",
  referral: "Referral",
  other: "Other",
};

export type Enquiry = {
  id: number;
  number: string;
  name: string;
  phone: string | null;
  email: string | null;
  message: string | null;
  source: EnquirySource;
  status: EnquiryStatus;
  items: { code?: string; name: string; price?: number | null; quantity?: number; url?: string | null }[];
  log: { at: string; by: string | null; text: string }[];
  followUpOn: string | null;
  visitOn: string | null;
  lostReason: string | null;
  customer: { id: number; name: string; phone: string } | null;
  assignedTo: { id: number; name: string | null } | null;
  branch: { id: number; name: string } | null;
  whatsapp: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BonusType = "instalment" | "percent" | "none";

export type SchemePlan = {
  id: number;
  name: string;
  months: number;
  minInstalment: number;
  bonusType: BonusType;
  bonusValue: number;
  graceDays: number;
  terms: string | null;
  isActive: boolean;
};

export type SchemeStatus = "active" | "matured" | "redeemed" | "closed";

export const SCHEME_STATUS_LABELS: Record<SchemeStatus, string> = {
  active: "Paying",
  matured: "Matured",
  redeemed: "Redeemed",
  closed: "Closed early",
};

export type SchemeAccount = {
  id: number;
  number: string;
  status: SchemeStatus;
  plan: { id: number; name: string } | null;
  customer: { id: number; name: string; phone: string } | null;
  monthlyAmount: number;
  months: number;
  bonusType: BonusType;
  bonusValue: number;
  startDate: string;
  paidTotal: number;
  instalmentsPaid: number;
  /** What the shop adds if every instalment is paid. */
  bonusOnMaturity: number;
  /** The bonus actually given when redeemed. */
  bonusAmount: number | null;
  expected: number;
  behind: number;
  nextInstalment: number | null;
  nextDueOn: string | null;
  redeemedAt: string | null;
  redeemedAs: string | null;
  booking: { id: number; number: string; balance: number } | null;
  branch: { id: number; name: string; code: string } | null;
  by: string | null;
  note: string | null;
  createdAt: string;
  advanceNumber?: string;
};

export type SchemePayment = { id: number; number: string; instalmentNo: number; amount: number; payments: Payment[]; by: string | null; createdAt: string };

export type SchemeAccountDetail = SchemeAccount & { payments: SchemePayment[] };

export type LoyaltyKind = "earn" | "reverse" | "redeem" | "adjust";

export const LOYALTY_KIND_LABELS: Record<LoyaltyKind, string> = {
  earn: "Earned",
  reverse: "Taken back",
  redeem: "Redeemed",
  adjust: "Corrected",
};

export type LoyaltyEntry = {
  id: number;
  kind: LoyaltyKind;
  points: number;
  balance: number;
  reference: string | null;
  note: string | null;
  by: string | null;
  createdAt: string;
  customer?: { id: number; name: string; phone: string } | null;
};

export type LoyaltyRules = { enabled: boolean; rupeesPerPoint: number; pointValue: number; minRedeem: number };

export type CustomerProfile = Customer & {
  summary: { bills: number; spent: number; pieces: number; firstBillAt: string | null; lastBillAt: string | null; pointsValue: number };
  whatsapp: string;
  invoices: { id: number; number: string; invoiceDate: string; total: number; status: "paid" | "cancelled"; pieces: number }[];
  advances: { id: number; number: string; status: string; amount: number; balance: number; note: string | null; validUntil: string | null; createdAt: string }[];
  creditNotes: { id: number; number: string; balance: number }[];
  loyalty: LoyaltyEntry[];
  schemes: SchemeAccount[];
  enquiries: Enquiry[];
};

export type ReminderKind = "birthday" | "anniversary" | "scheme_due" | "follow_up";

export type Reminder = {
  kind: ReminderKind;
  date: string;
  inDays: number;
  title: string;
  detail: string;
  customer: { id: number; name: string; phone: string } | null;
  enquiryId?: number;
  schemeId?: number;
  whatsapp: string | null;
};

export type CrmDashboard = {
  customers: { total: number; newThisMonth: number };
  enquiries: { open: number; new: number; wonThisMonth: number };
  schemes: { active: number; matured: number; behind: number; held: number; collectedThisMonth: number };
  loyalty: { enabled: boolean; pointsOutstanding: number; valueOutstanding: number; members: number };
  upcoming: Reminder[];
};

export type AudienceSegment =
  | "all"
  | "opted_in"
  | "scheme_members"
  | "recent_buyers"
  | "lapsed"
  | "big_spenders"
  | "birthday_month"
  | "anniversary_month"
  | "never_bought";

export type AudienceRow = {
  id: number;
  name: string;
  phone: string;
  city: string | null;
  spent: number;
  lastBillAt: string | null;
  points: number;
  marketingOptIn: boolean;
  whatsapp: string;
};
