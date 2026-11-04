import { errors } from "@strapi/utils";
import { normaliseCode } from "../../../utils/stock";
import { branchIdsFor, requireBranch } from "../../../utils/staff";
import { staffOf } from "../../stock/lib/common";
import { buildBill, serializeQuote } from "../lib/bill";
import { CUSTOMER, ESTIMATE, ESTIMATE_ROLES, branchRef, customerRef, nextNumber, person } from "../lib/common";
import { changePiece } from "../lib/pieces";

const ITEM = "api::item.item";

const POPULATE = {
  customer: true,
  salesperson: { select: ["id", "fullName", "username"] },
  branch: { select: ["id", "code", "name"] },
  invoice: { select: ["id", "number"] },
};

function serialize(estimate: any) {
  return {
    id: estimate.id,
    number: estimate.number,
    status: estimate.status,
    note: estimate.note ?? null,
    createdAt: estimate.createdAt,
    billedAt: estimate.billedAt ?? null,
    cancelledAt: estimate.cancelledAt ?? null,
    lines: estimate.lines ?? [],
    customer: customerRef(estimate.customer),
    salesperson: person(estimate.salesperson),
    branch: branchRef(estimate.branch),
    invoice: estimate.invoice ? { id: estimate.invoice.id, number: estimate.invoice.number } : null,
  };
}

/** Puts pieces back in the salesperson's hands when they leave an estimate unbilled. */
export async function releaseFromEstimate(strapi: any, staff: any, estimate: any, itemIds: number[]) {
  if (!itemIds.length) return;
  const items = await strapi.db.query(ITEM).findMany({ where: { id: { $in: itemIds }, status: "reserved" } });
  for (const item of items) {
    await changePiece(strapi, staff, item, { status: "with_staff", type: "released", reference: estimate.number });
  }
}

export default ({ strapi }: { strapi: any }) => ({
  /** Sends pieces to the billing counter. Used by the showroom tablets and the counter itself. */
  async create(ctx: any) {
    const staff = staffOf(ctx);
    if (!ESTIMATE_ROLES.includes(staff.staffRole)) throw new errors.ForbiddenError("Your role cannot create estimates.");
    const body = ctx.request.body ?? {};
    const branch = await requireBranch(strapi, staff, body.branchId);
    const org = { organization: { id: staff.organization.id } };

    const customer = body.customerId ? await strapi.db.query(CUSTOMER).findOne({ where: { id: Number(body.customerId), ...org } }) : null;
    if (body.customerId && !customer) throw new errors.ValidationError("That customer does not exist.");

    const wanted: string[] = (Array.isArray(body.codes) ? body.codes : []).map((code: unknown) => normaliseCode(String(code ?? ""))).filter(Boolean);
    const ids: number[] = (Array.isArray(body.itemIds) ? body.itemIds : []).map(Number).filter(Boolean);
    const items: any[] = [];
    for (const code of wanted) {
      const item = await strapi.db.query(ITEM).findOne({ where: { ...org, $or: [{ tagNumber: code }, { legacyTag: code }, { huid: code }] }, select: ["id"] });
      if (!item) throw new errors.ValidationError(`No piece matches ${code}.`);
      ids.push(item.id);
    }
    const unique = [...new Set(ids)];
    if (!unique.length) throw new errors.ValidationError("Choose at least one piece.");
    if (unique.length > 50) throw new errors.ValidationError("An estimate can hold at most 50 pieces.");

    const found = await strapi.db.query(ITEM).findMany({
      where: { id: { $in: unique }, ...org },
      populate: { branch: { select: ["id", "name"] }, heldBy: { select: ["id", "fullName", "username"] } },
    });
    for (const item of found) {
      if (item.branch?.id !== branch.id) throw new errors.ValidationError(`${item.tagNumber} is at ${item.branch?.name}.`);
      if (item.status === "with_staff" && item.heldBy && item.heldBy.id !== staff.id && staff.staffRole === "salesperson") {
        throw new errors.ValidationError(`${item.tagNumber} is with ${person(item.heldBy)}.`);
      }
      if (!["in_stock", "with_staff"].includes(item.status)) throw new errors.ValidationError(`${item.tagNumber} is ${item.status.replace("_", " ")}.`);
      items.push(item);
    }

    const estimate = await strapi.db.transaction(async () => {
      const number = await nextNumber(strapi, staff, "estimate", "EST");
      const created = await strapi.documents(ESTIMATE).create({
        data: {
          number,
          status: "open",
          lines: items.map((item) => ({ itemId: item.id, tagNumber: item.tagNumber })),
          note: typeof body.note === "string" ? body.note.trim().slice(0, 500) || null : null,
          customer: customer?.documentId ?? null,
          salesperson: staff.documentId,
          branch: branch.documentId,
          organization: staff.organization.documentId,
        },
      });
      for (const item of items) {
        await changePiece(strapi, staff, item, { status: "reserved", type: "reserved", heldBy: item.heldBy?.id ?? staff.id, reference: number });
      }
      return created;
    });

    const saved = await strapi.db.query(ESTIMATE).findOne({ where: { id: estimate.id }, populate: POPULATE });
    ctx.status = 201;
    ctx.body = { data: serialize(saved) };
  },

  /** The counter's queue, newest first. */
  async list(ctx: any) {
    const staff = staffOf(ctx);
    const branches = await branchIdsFor(strapi, staff);
    const branchId = Number(ctx.query.branchId);
    const where: any = {
      organization: { id: staff.organization.id },
      branch: { id: branches.includes(branchId) ? branchId : { $in: branches } },
    };
    if (["open", "billed", "cancelled"].includes(ctx.query.status)) where.status = ctx.query.status;
    if (ctx.query.mine === "true") where.salesperson = { id: staff.id };
    const rows = await strapi.db.query(ESTIMATE).findMany({ where, orderBy: { createdAt: "desc" }, limit: 100, populate: POPULATE });
    ctx.body = { data: rows.map(serialize) };
  },

  /** One estimate with today's prices. */
  async get(ctx: any) {
    const staff = staffOf(ctx);
    const estimate = await strapi.db.query(ESTIMATE).findOne({ where: { id: Number(ctx.params.id), organization: { id: staff.organization.id } }, populate: POPULATE });
    if (!estimate) throw new errors.NotFoundError("Estimate not found.");
    await requireBranch(strapi, staff, estimate.branch.id);
    let quote = null;
    if (estimate.status === "open") {
      try {
        quote = serializeQuote(await buildBill(strapi, staff, { branchId: estimate.branch.id, estimateId: estimate.id, customerId: estimate.customer?.id }, { strict: false }));
      } catch (error) {
        quote = { error: (error as Error).message };
      }
    }
    ctx.body = { data: { ...serialize(estimate), quote } };
  },

  /** Takes pieces off an estimate, or cancels it if none are left. The pieces stay with the salesperson. */
  async cancel(ctx: any) {
    const staff = staffOf(ctx);
    if (!ESTIMATE_ROLES.includes(staff.staffRole)) throw new errors.ForbiddenError("Your role cannot change estimates.");
    const estimate = await strapi.db.query(ESTIMATE).findOne({ where: { id: Number(ctx.params.id), organization: { id: staff.organization.id } }, populate: POPULATE });
    if (!estimate) throw new errors.NotFoundError("Estimate not found.");
    await requireBranch(strapi, staff, estimate.branch.id);
    if (estimate.status !== "open") throw new errors.ValidationError(`Estimate ${estimate.number} is already ${estimate.status}.`);

    const remove: number[] = Array.isArray(ctx.request.body?.itemIds) ? ctx.request.body.itemIds.map(Number) : [];
    const lines: { itemId: number; tagNumber: string }[] = estimate.lines ?? [];
    const leaving = remove.length ? lines.filter((line) => remove.includes(line.itemId)) : lines;
    const staying = lines.filter((line) => !leaving.includes(line));

    await strapi.db.transaction(async () => {
      await releaseFromEstimate(strapi, staff, estimate, leaving.map((line) => line.itemId));
      await strapi.db.query(ESTIMATE).update({
        where: { id: estimate.id },
        data: staying.length ? { lines: staying } : { lines, status: "cancelled", cancelledAt: new Date().toISOString() },
      });
    });
    const saved = await strapi.db.query(ESTIMATE).findOne({ where: { id: estimate.id }, populate: POPULATE });
    ctx.body = { data: serialize(saved) };
  },
});
