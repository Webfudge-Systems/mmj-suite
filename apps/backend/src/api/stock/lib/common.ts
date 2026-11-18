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
  return { $or: [{ tagNumber: value }, { legacyTag: value }, { huid: value }, { rfid: value }] };
}

export function notFound(what: string): never {
  throw new errors.NotFoundError(`${what} not found.`);
}

export const num = (value: unknown) => (value === null || value === undefined ? null : Number(value));

/** Up to this many photos per piece. */
export const MAX_PHOTOS = 8;

/** Up to this many bill or challan files per receipt. */
export const MAX_ATTACHMENTS = 10;

/** Keeps the ids that are uploaded images or PDFs (bills, challans), in the order given. Throws when any id is not one. */
export async function documentIds(strapi: any, raw: unknown): Promise<number[]> {
  if (!Array.isArray(raw)) return [];
  const ids = [...new Set(raw.map(idOf).filter((id): id is number => id !== null))];
  if (ids.length > MAX_ATTACHMENTS) throw new errors.ValidationError(`Attach at most ${MAX_ATTACHMENTS} files to a receipt.`);
  if (!ids.length) return [];
  const files = await strapi.db.query("plugin::upload.file").findMany({ where: { id: { $in: ids } }, select: ["id", "mime"] });
  const allowed = new Set(
    files.filter((file: any) => String(file.mime ?? "").startsWith("image/") || String(file.mime ?? "") === "application/pdf").map((file: any) => file.id),
  );
  if (ids.some((id) => !allowed.has(id))) throw new errors.ValidationError("Attach bills as photos or PDF files. One of the files is missing or of another kind.");
  return ids;
}

/** Keeps the ids that are uploaded images, in the order given. Throws when any id is not one. */
export async function imageIds(strapi: any, raw: unknown): Promise<number[]> {
  if (!Array.isArray(raw)) return [];
  const ids = [...new Set(raw.map(idOf).filter((id): id is number => id !== null))];
  if (ids.length > MAX_PHOTOS) throw new errors.ValidationError(`Add at most ${MAX_PHOTOS} photos to a piece.`);
  if (!ids.length) return [];
  const files = await strapi.db.query("plugin::upload.file").findMany({ where: { id: { $in: ids } }, select: ["id", "mime"] });
  const images = new Set(files.filter((file: any) => String(file.mime ?? "").startsWith("image/")).map((file: any) => file.id));
  if (ids.some((id) => !images.has(id))) throw new errors.ValidationError("One of the photos is missing or is not an image. Upload it again.");
  return ids;
}
