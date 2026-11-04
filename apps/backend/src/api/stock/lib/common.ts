import { errors } from "@strapi/utils";
import { normaliseCode } from "../../../utils/stock";
import type { StaffRole } from "../../../utils/constants";
import type { Staff } from "../../../utils/staff";

export const ITEM = "api::item.item";
export const DESIGN = "api::design.design";
export const LOCATION = "api::location.location";
export const SUPPLIER = "api::supplier.supplier";
export const CATEGORY = "api::category.category";
export const COLLECTION = "api::collection.collection";
export const RECEIPT = "api::stock-receipt.stock-receipt";
export const MOVEMENT = "api::stock-movement.stock-movement";
export const TRANSFER = "api::transfer.transfer";
export const AUDIT = "api::stock-audit.stock-audit";
export const BRANCH = "api::branch.branch";

export function staffOf(ctx: any): Staff {
  return ctx.state.staff as Staff;
}

export function requireRole(staff: Staff, roles: StaffRole[], action: string) {
  if (!roles.includes(staff.staffRole)) {
    throw new errors.ForbiddenError(`Your role cannot ${action}.`);
  }
}

export function orgWhere(staff: Staff) {
  return { organization: { id: staff.organization.id } };
}

export function paging(query: Record<string, unknown>, defaultSize = 50) {
  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize) || defaultSize, 1), 200);
  return { page, pageSize };
}

export function text(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed === "" ? null : trimmed;
}

export function idOf(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function requireId(value: unknown, label: string): number {
  const id = idOf(value);
  if (!id) throw new errors.ValidationError(`Choose ${label}.`);
  return id;
}

/** Where-clause matching a scanned or typed code against tag number, old tag or HUID. */
export function codeWhere(code: string) {
  const value = normaliseCode(code);
  return { $or: [{ tagNumber: value }, { legacyTag: value }, { huid: value }] };
}

export function notFound(what: string): never {
  throw new errors.NotFoundError(`${what} not found.`);
}

export const num = (value: unknown) => (value === null || value === undefined ? null : Number(value));
