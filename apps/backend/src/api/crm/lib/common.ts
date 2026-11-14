import { errors } from "@strapi/utils";
import type { StaffRole } from "../../../utils/constants";
import type { Staff } from "../../../utils/staff";

export const ENQUIRY = "api::enquiry.enquiry";
export const SCHEME_PLAN = "api::scheme-plan.scheme-plan";
export const SCHEME_ACCOUNT = "api::scheme-account.scheme-account";
export const SCHEME_PAYMENT = "api::scheme-payment.scheme-payment";

/** Anyone at the counter or on the floor can follow up enquiries and look up customers. */
export const FRONT_ROLES: StaffRole[] = ["owner", "branch_manager", "cashier", "salesperson"];
/** Taking money for schemes, and redeeming points or schemes, is counter work. */
export const MONEY_ROLES: StaffRole[] = ["owner", "branch_manager", "cashier"];
/** Plans, loyalty rules and point corrections. */
export const MANAGER_ROLES: StaffRole[] = ["owner", "branch_manager"];

export function requireRole(staff: Staff, roles: StaffRole[], action: string) {
  if (!roles.includes(staff.staffRole)) throw new errors.ForbiddenError(`Your role cannot ${action}.`);
}

export const org = (staff: Staff) => ({ organization: { id: staff.organization.id } });

export const text = (value: unknown, max: number) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null);

export const isoDate = (value: unknown) => (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null);

export const money = (value: unknown) => Math.round(Number(value) * 100) / 100;

export function person(user: any): string | null {
  return user ? user.fullName || user.username : null;
}

/** Days from today (India) until the next yearly occurrence of a date, 0 when it is today. */
export function daysUntilNext(date: string, today: string): number {
  const [, month, day] = date.split("-").map(Number);
  const [year, todayMonth, todayDay] = today.split("-").map(Number);
  const base = Date.UTC(year, todayMonth - 1, todayDay);
  let next = Date.UTC(year, month - 1, day);
  if (next < base) next = Date.UTC(year + 1, month - 1, day);
  return Math.round((next - base) / 86400000);
}

/** Whole months between two YYYY-MM-DD dates, counting a month once its day has come round. */
export function monthsBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  let months = (ty - fy) * 12 + (tm - fm);
  if (td < fd) months -= 1;
  return Math.max(0, months);
}

/** A WhatsApp link that opens a chat with this Indian number and a message ready to send. */
export function whatsappLink(phone: string, message: string) {
  const digits = String(phone ?? "").replace(/\D/g, "").slice(-10);
  return `https://wa.me/91${digits}?text=${encodeURIComponent(message)}`;
}
