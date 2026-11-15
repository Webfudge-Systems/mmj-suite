import { errors } from "@strapi/utils";
import type { StaffRole } from "../../../utils/constants";
import type { Staff } from "../../../utils/staff";

export const JOB_WORK = "api::job-work.job-work";
export const APPROVAL = "api::approval.approval";
export const SERVICE_ORDER = "api::service-order.service-order";

/** Stock keepers and managers send metal and pieces out. */
export const STOCK_ROLES: StaffRole[] = ["owner", "branch_manager", "stock_keeper"];
/** Settling a karigar's account is a manager's call. */
export const MANAGER_ROLES: StaffRole[] = ["owner", "branch_manager"];
/** Taking in repairs and custom orders happens at the counter. */
export const COUNTER_ROLES: StaffRole[] = ["owner", "branch_manager", "cashier", "salesperson"];
/** Taking money is for the counter. */
export const MONEY_ROLES: StaffRole[] = ["owner", "branch_manager", "cashier"];
/** Who may read the business reports. */
export const REPORT_ROLES: StaffRole[] = ["owner", "branch_manager", "accountant"];

/**
 * Parts per thousand of pure metal for each purity, as hallmarked in India.
 * 24 karat is taken as 995, the common bullion grade. The CA or karigar may
 * agree a different touch; the job's wastage allowance absorbs the difference.
 */
export const FINENESS: Record<string, number> = {
  "24KT": 995,
  "22KT": 916,
  "18KT": 750,
  "14KT": 585,
  "950PT": 950,
  "999": 999,
  "925": 925,
};

/** Fine (pure) weight in grams, to the milligram. */
export function fineWeight(purity: string, grams: number) {
  const parts = FINENESS[purity];
  if (!parts) throw new errors.ValidationError(`${purity} is not a purity the suite knows.`);
  return Math.round(grams * parts) / 1000;
}

export const round3 = (value: number) => Math.round(value * 1000) / 1000;
export const money = (value: unknown) => Math.round(Number(value) * 100) / 100;
export const text = (value: unknown, max: number) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null);
export const isoDate = (value: unknown) => (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null);
export const org = (staff: Staff) => ({ organization: { id: staff.organization.id } });

export function requireRole(staff: Staff, roles: StaffRole[], action: string) {
  if (!roles.includes(staff.staffRole)) throw new errors.ForbiddenError(`Your role cannot ${action}.`);
}

export function person(user: any): string | null {
  return user ? user.fullName || user.username : null;
}

export function logEntry(staff: Staff, text: string) {
  return { at: new Date().toISOString(), by: staff.fullName || staff.username, text };
}
