import { errors } from "@strapi/utils";
import { requireBranch } from "../../../utils/staff";
import { staffOf } from "../../stock/lib/common";
import { codeWhere } from "../../stock/lib/common";
import { changePiece } from "../../sales/lib/pieces";
import { CUSTOMER, nextNumber, normalisePhone } from "../../sales/lib/common";
import { APPROVAL, STOCK_ROLES, isoDate, logEntry, org, person, requireRole, text } from "../lib/common";

const ITEM = "api::item.item";
/** Pieces that can go out on approval: in a tray or the safe, not held or reserved. */
const SENDABLE = ["in_stock"];

const POPULATE = {
  customer: { select: ["id", "name", "phone"] },
  branch: { select: ["id", "name", "code"] },
  by: { select: ["id", "fullName", "username"] },
};

type Line = { itemId: number; tagNumber: string; design: string | null; purity: string; grossWeight: number; netWeight: number; returnedAt: string | null };

/** Each line's state now: still out, back in stock, or billed to the customer. */
async function withState(strapi: any, approval: any) {
  const lines: Line[] = Array.isArray(approval.lines) ? approval.lines : [];
  const items = lines.length ? await strapi.db.query(ITEM).findMany({ where: { id: { $in: lines.map((line) => line.itemId) } }, select: ["id", "status"] }) : [];
  const status = new Map(items.map((item: any) => [item.id, item.status]));
  return lines.map((line) => {
    const now = status.get(line.itemId);
    const state = now === "on_approval" ? "out" : now === "sold" ? "billed" : "returned";
    return { ...line, state };
  });
}

function serialize(approval: any, lines: Awaited<ReturnType<typeof withState>>) {
  const out = lines.filter((line) => line.state === "out");
  return {
    id: approval.id,
    number: approval.number,
    status: approval.status,
    party: approval.customer ? { name: approval.customer.name, phone: approval.customer.phone } : { name: approval.partyName ?? "—", phone: approval.partyPhone ?? null },
    customer: approval.customer ? { id: approval.customer.id, name: approval.customer.name, phone: approval.customer.phone } : null,
    dueBackOn: approval.dueBackOn ?? null,
    note: approval.note ?? null,
    lines,
    counts: { total: lines.length, out: out.length, returned: lines.filter((line) => line.state === "returned").length, billed: lines.filter((line) => line.state === "billed").length },
    netWeightOut: Math.round(out.reduce((sum, line) => sum + line.netWeight, 0) * 1000) / 1000,
    log: Array.isArray(approval.log) ? approval.log : [],
    closedAt: approval.closedAt ?? null,
    branch: approval.branch ? { id: approval.branch.id, name: approval.branch.name, code: approval.branch.code } : null,
    by: person(approval.by),
    createdAt: approval.createdAt,
  };
}

async function load(strapi: any, staff: any, id: unknown) {
  const approval = await strapi.db.query(APPROVAL).findOne({ where: { id: Number(id), ...org(staff) }, populate: POPULATE });
  if (!approval) throw new errors.NotFoundError("Approval not found.");
  return approval;
}

/** Closes the memo on its own once nothing is still out. */
async function closeIfDone(strapi: any, staff: any, approval: any) {
  const lines = await withState(strapi, approval);
  if (approval.status === "open" && lines.every((line) => line.state !== "out")) {
    await strapi.db.query(APPROVAL).update({
      where: { id: approval.id },
      data: { status: "closed", closedAt: new Date().toISOString(), log: [...(approval.log ?? []), logEntry(staff, "Every piece is back or billed; memo closed")] },
    });
  }
}

export default ({ strapi }: { strapi: any }) => ({
  async list(ctx: any) {
    const staff = staffOf(ctx);
    const where: any = { ...org(staff) };
    if (ctx.query.status === "open" || ctx.query.status === "closed") where.status = ctx.query.status;
    const approvals = await strapi.db.query(APPROVAL).findMany({ where, orderBy: { createdAt: "desc" }, populate: POPULATE, limit: 300 });
    const data = [];
    for (const approval of approvals) data.push(serialize(approval, await withState(strapi, approval)));
    ctx.body = { data };
  },

  async get(ctx: any) {
    const staff = staffOf(ctx);
    const approval = await load(strapi, staff, ctx.params.id);
    // Pieces billed at the counter since the last look may have closed the memo.
    await closeIfDone(strapi, staff, approval);
    const fresh = await load(strapi, staff, approval.id);
    ctx.body = { data: serialize(fresh, await withState(strapi, fresh)) };
  },

  /** Sends pieces out on approval memo. They leave the floor until they come back or are billed. */
  async create(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, STOCK_ROLES, "send pieces on approval");
    const body = ctx.request.body ?? {};
    const branch = await requireBranch(strapi, staff, body.branchId);
    const customer = Number(body.customerId) ? await strapi.db.query(CUSTOMER).findOne({ where: { id: Number(body.customerId), ...org(staff) } }) : null;
    const partyName = customer ? null : text(body.partyName, 120);
    if (!customer && !partyName) throw new errors.ValidationError("Choose the customer, or enter the dealer's name.");
    const codes: string[] = (Array.isArray(body.codes) ? body.codes : []).map((code: unknown) => String(code).trim()).filter(Boolean);
    if (!codes.length) throw new errors.ValidationError("Scan the pieces going out.");
    if (codes.length > 100) throw new errors.ValidationError("Send at most 100 pieces on one memo.");

    const items: any[] = [];
    for (const code of codes) {
      const item = await strapi.db.query(ITEM).findOne({ where: { ...codeWhere(code), ...org(staff) }, populate: { branch: { select: ["id"] }, design: { select: ["id", "code", "name"] }, location: { select: ["id"] } } });
      if (!item) throw new errors.ValidationError(`No piece matches ${code}.`);
      if (item.branch?.id !== branch.id) throw new errors.ValidationError(`${item.tagNumber} is at another branch.`);
      if (!SENDABLE.includes(item.status)) throw new errors.ValidationError(`${item.tagNumber} is ${String(item.status).replace("_", " ")}, so it cannot go on approval.`);
      if (!items.some((existing) => existing.id === item.id)) items.push(item);
    }

    const number = await nextNumber(strapi, staff, "approval", "APR");
    const lines: Line[] = items.map((item) => ({
      itemId: item.id,
      tagNumber: item.tagNumber,
      design: item.design ? `${item.design.name} (${item.design.code})` : null,
      purity: item.purity,
      grossWeight: Number(item.grossWeight),
      netWeight: Number(item.netWeight),
      returnedAt: null,
    }));
    const created = await strapi.db.transaction(async () => {
      for (const item of items) await changePiece(strapi, staff, item, { status: "on_approval", type: "approval_out", reference: number });
      return strapi.documents(APPROVAL).create({
        data: {
          number,
          status: "open",
          partyName,
          partyPhone: customer ? null : normalisePhone(body.partyPhone),
          dueBackOn: isoDate(body.dueBackOn),
          lines,
          note: text(body.note, 1000),
          log: [logEntry(staff, `${lines.length} ${lines.length === 1 ? "piece" : "pieces"} sent out`)],
          customer: customer?.documentId ?? null,
          by: staff.documentId,
          branch: branch.documentId,
          organization: staff.organization.documentId,
        },
      });
    });
    ctx.status = 201;
    const fresh = await load(strapi, staff, created.id);
    ctx.body = { data: serialize(fresh, await withState(strapi, fresh)) };
  },

  /** Takes pieces back into stock. They return to the tray they came from. */
  async returnItems(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, STOCK_ROLES, "take pieces back from approval");
    const approval = await load(strapi, staff, ctx.params.id);
    const lines = await withState(strapi, approval);
    const codes: string[] = (Array.isArray(ctx.request.body?.codes) ? ctx.request.body.codes : []).map((code: unknown) => String(code).trim().toUpperCase());
    const wanted = lines.filter((line) => line.state === "out" && (codes.length === 0 || codes.includes(line.tagNumber)));
    if (!wanted.length) throw new errors.ValidationError(codes.length ? "None of those pieces are out on this memo." : "Nothing is still out on this memo.");

    const now = new Date().toISOString();
    await strapi.db.transaction(async () => {
      for (const line of wanted) {
        const item = await strapi.db.query(ITEM).findOne({ where: { id: line.itemId } });
        await changePiece(strapi, staff, item, { status: "in_stock", type: "approval_back", reference: approval.number });
      }
      const returned = new Set(wanted.map((line) => line.itemId));
      await strapi.db.query(APPROVAL).update({
        where: { id: approval.id },
        data: {
          lines: (approval.lines as Line[]).map((line) => (returned.has(line.itemId) ? { ...line, returnedAt: now } : line)),
          log: [...(approval.log ?? []), logEntry(staff, `${wanted.length} back: ${wanted.map((line) => line.tagNumber).join(", ")}`)],
        },
      });
    });
    await closeIfDone(strapi, staff, await load(strapi, staff, approval.id));
    const fresh = await load(strapi, staff, approval.id);
    ctx.body = { data: serialize(fresh, await withState(strapi, fresh)) };
  },
});
