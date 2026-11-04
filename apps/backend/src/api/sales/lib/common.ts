import { errors } from "@strapi/utils";
import { reserveSequence } from "../../../utils/sequence";
import { setting, type Staff } from "../../../utils/staff";
import type { StaffRole } from "../../../utils/constants";

export const CUSTOMER = "api::customer.customer";
export const ESTIMATE = "api::estimate.estimate";
export const INVOICE = "api::invoice.invoice";
export const OLD_GOLD = "api::old-gold.old-gold";
export const BOOKING = "api::booking.booking";
export const CREDIT_NOTE = "api::credit-note.credit-note";
export const DAY_CLOSE = "api::day-close.day-close";
export const DEVICE = "api::device.device";
export const RATE_CARD = "api::rate-card.rate-card";

/** Who works the billing counter. */
export const COUNTER_ROLES: StaffRole[] = ["owner", "branch_manager", "cashier"];
/** Who can put pieces on an estimate. */
export const ESTIMATE_ROLES: StaffRole[] = ["owner", "branch_manager", "cashier", "salesperson"];
/** Who can cancel invoices, refund advances and override return deductions. */
export const MANAGER_ROLES: StaffRole[] = ["owner", "branch_manager"];

export const PAYMENT_MODES = ["cash", "upi", "card", "bank_transfer", "cheque"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];
export type Payment = { mode: PaymentMode; amount: number; reference: string | null };

const TIME_ZONE = "Asia/Kolkata";

/** Today's date in India as YYYY-MM-DD, whatever the server's own time zone. */
export function indiaDate(at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

/** Start and end of an India calendar day, as UTC instants. */
export function indiaDayRange(date: string): { start: string; end: string } {
  const start = new Date(`${date}T00:00:00+05:30`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function nextNumber(strapi: any, staff: Staff, kind: string, prefix: string): Promise<string> {
  const value = await reserveSequence(strapi, `${kind}:${staff.organization.id}`);
  return `${prefix}-${String(value).padStart(6, "0")}`;
}

/** Shop rules the CA should confirm. Each can be overridden in the organization settings. */
export function rules(staff: Staff) {
  return {
    /** Cash accepted from one person in one day must stay below this (Income-tax Act). */
    cashReceiptLimit: Number(setting(staff, "cashReceiptLimit", 200000)),
    /** PAN is needed when a customer's purchases in a day reach this. */
    panThreshold: Number(setting(staff, "panThreshold", 200000)),
    /** Cash paid out to one person for old gold or refunds above this needs a bank transfer. */
    cashPayoutLimit: Number(setting(staff, "cashPayoutLimit", 10000)),
    hallmarkCharge: Number(setting(staff, "hallmarkChargePerPiece", 45)),
    oldGoldDeductionPercent: Number(setting(staff, "oldGoldDeductionPercent", 2)),
    returnDeductionPercent: Number(setting(staff, "returnDeductionPercent", 0)),
    requireTodayRate: setting<boolean>(staff, "requireTodayRate", true) !== false,
    /** Largest making-charge discount each role may give, as a percentage of making. */
    discountLimit: (role: StaffRole): number => {
      if (role === "owner") return 100;
      const limits = setting<Record<string, number>>(staff, "discountLimits", { branch_manager: 50, cashier: 10, salesperson: 0 });
      return Number(limits[role] ?? 0);
    },
  };
}

/** Parses money payments from the counter. Amounts are rounded to the paisa. */
export function parsePayments(raw: unknown, { allowEmpty = false } = {}): Payment[] {
  const list = Array.isArray(raw) ? raw : [];
  const payments = list
    .map((entry: any) => ({
      mode: String(entry?.mode ?? "") as PaymentMode,
      amount: Math.round(Number(entry?.amount) * 100) / 100,
      reference: typeof entry?.reference === "string" && entry.reference.trim() ? entry.reference.trim().slice(0, 60) : null,
    }))
    .filter((payment) => payment.amount !== 0);
  for (const payment of payments) {
    if (!PAYMENT_MODES.includes(payment.mode)) throw new errors.ValidationError(`${payment.mode || "A payment"} is not a payment method the counter takes.`);
    if (!Number.isFinite(payment.amount) || payment.amount < 0) throw new errors.ValidationError("Payment amounts must be above zero.");
    if (payment.mode !== "cash" && !payment.reference && payment.mode !== "upi") {
      // Card slips, cheques and bank transfers are traced by their reference.
      throw new errors.ValidationError(`Enter the reference for the ${payment.mode.replace("_", " ")} payment.`);
    }
  }
  if (!allowEmpty && !payments.length) throw new errors.ValidationError("Enter how the customer is paying.");
  return payments;
}

export const sumPaise = (values: number[]) => values.reduce((sum, value) => sum + Math.round(value * 100), 0);
export const sumRupees = (values: number[]) => sumPaise(values) / 100;

/** Cash taken from this customer today across invoices and advances, for the cash limit. */
export async function cashTakenToday(strapi: any, staff: Staff, customerId: number): Promise<number> {
  const { start, end } = indiaDayRange(indiaDate());
  const window = { customer: { id: customerId }, createdAt: { $gte: start, $lt: end }, organization: { id: staff.organization.id } };
  const invoices = await strapi.db.query(INVOICE).findMany({ where: { ...window, status: "paid" }, select: ["id", "payments"] });
  const bookings = await strapi.db.query(BOOKING).findMany({ where: window, select: ["id", "payments"] });
  const cash = [...invoices, ...bookings].flatMap((record: any) => (record.payments ?? []).filter((payment: Payment) => payment.mode === "cash").map((payment: Payment) => payment.amount));
  return sumRupees(cash);
}

export function person(user: any): string | null {
  return user ? user.fullName || user.username : null;
}

export function branchRef(branch: any) {
  return branch ? { id: branch.id, code: branch.code, name: branch.name } : null;
}

export function customerRef(customer: any) {
  return customer ? { id: customer.id, name: customer.name, phone: customer.phone, pan: customer.pan ?? null } : null;
}

/** Indian mobile numbers: keep the last ten digits. */
export function normalisePhone(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

export function normalisePan(value: unknown): string | null {
  const pan = String(value ?? "").trim().toUpperCase();
  if (!pan) return null;
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) throw new errors.ValidationError("A PAN is 10 characters, like ABCDE1234F.");
  return pan;
}
