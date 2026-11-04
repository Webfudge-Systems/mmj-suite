import { errors } from "@strapi/utils";
import { STOCK_EDITOR_ROLES } from "../../../utils/constants";
import { reserveSequence } from "../../../utils/sequence";
import { normaliseCode } from "../../../utils/stock";
import { branchIdsFor, requireBranch } from "../../../utils/staff";
import { BRANCH, ITEM, TRANSFER, idOf, notFound, orgWhere, paging, requireRole, staffOf, text } from "../lib/common";
import { findByCode, holdingLocation, recordMovement } from "../lib/items";

type Line = { itemId: number; tagNumber: string; legacyTag: string | null; huid: string | null; receivedAt: string | null };

const POPULATE = {
  fromBranch: { select: ["id", "code", "name"] },
  toBranch: { select: ["id", "code", "name"] },
  dispatchedBy: { select: ["id", "fullName", "username"] },
  receivedBy: { select: ["id", "fullName", "username"] },
};

const person = (user: any) => (user ? user.fullName || user.username : null);
const branchRef = (branch: any) => (branch ? { id: branch.id, code: branch.code, name: branch.name } : null);

function serialize(transfer: any) {
  const lines: Line[] = transfer.lines ?? [];
  return {
    id: transfer.id,
    number: transfer.number,
    status: transfer.status,
    note: transfer.note ?? null,
    dispatchedAt: transfer.dispatchedAt,
    completedAt: transfer.completedAt ?? null,
    fromBranch: branchRef(transfer.fromBranch),
    toBranch: branchRef(transfer.toBranch),
    dispatchedBy: person(transfer.dispatchedBy),
    receivedBy: person(transfer.receivedBy),
    pieces: lines.length,
    received: lines.filter((line) => line.receivedAt).length,
    lines,
  };
}

export default ({ strapi }: { strapi: any }) => ({
  async list(ctx: any) {
    const staff = staffOf(ctx);
    const { page, pageSize } = paging(ctx.query, 30);
    const branches = await branchIdsFor(strapi, staff);
    const where: any = { ...orgWhere(staff), $or: [{ fromBranch: { id: { $in: branches } } }, { toBranch: { id: { $in: branches } } }] };
    if (ctx.query.open === "true") where.status = { $in: ["in_transit", "partly_received"] };
    const result = await strapi.db.query(TRANSFER).findPage({ where, page, pageSize, orderBy: { createdAt: "desc" }, populate: POPULATE });
    ctx.body = { data: result.results.map(serialize), meta: { pagination: result.pagination } };
  },

  async get(ctx: any) {
    const staff = staffOf(ctx);
    const transfer = await strapi.db.query(TRANSFER).findOne({ where: { id: idOf(ctx.params.id), ...orgWhere(staff) }, populate: POPULATE });
    if (!transfer) notFound("Transfer");
    const branches = await branchIdsFor(strapi, staff);
    if (!branches.includes(transfer.fromBranch.id) && !branches.includes(transfer.toBranch.id)) {
      throw new errors.ForbiddenError("This transfer is between branches you do not work in.");
    }
    ctx.body = { data: serialize(transfer) };
  },

  /** Sends pieces to another branch. All pieces go, or none do. */
  async create(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, STOCK_EDITOR_ROLES, "transfer stock");
    const body = ctx.request.body ?? {};
    const from = await requireBranch(strapi, staff, body.fromBranchId);
    const toId = idOf(body.toBranchId);
    const to = toId ? await strapi.db.query(BRANCH).findOne({ where: { id: toId, ...orgWhere(staff) } }) : null;
    if (!to) throw new errors.ValidationError("Choose the branch to send to.");
    if (to.id === from.id) throw new errors.ValidationError("Choose a different branch to send to.");

    const codes: string[] = [...new Set<string>((Array.isArray(body.codes) ? body.codes : []).map((code: unknown) => normaliseCode(String(code ?? ""))).filter(Boolean))];
    if (!codes.length) throw new errors.ValidationError("Scan the pieces to send.");
    if (codes.length > 500) throw new errors.ValidationError("Send at most 500 pieces at a time.");

    const items: any[] = [];
    const problems: string[] = [];
    for (const code of codes) {
      const item = await findByCode(strapi, staff, code, { branch: { select: ["id", "name"] }, location: { select: ["id"] } });
      if (!item) problems.push(`${code}: no piece has this code.`);
      else if (item.branch?.id !== from.id) problems.push(`${item.tagNumber}: it is at ${item.branch?.name}.`);
      else if (item.status !== "in_stock") problems.push(`${item.tagNumber}: it is ${item.status.replace("_", " ")}.`);
      else if (items.some((existing) => existing.id === item.id)) continue;
      else items.push(item);
    }
    if (problems.length) throw new errors.ValidationError(`Nothing was sent. ${problems.join(" ")}`, { problems });

    const transfer = await strapi.db.transaction(async () => {
      const number = `TRF-${String(await reserveSequence(strapi, `transfer:${staff.organization.id}`)).padStart(6, "0")}`;
      const lines: Line[] = items.map((item) => ({
        itemId: item.id,
        tagNumber: item.tagNumber,
        legacyTag: item.legacyTag ?? null,
        huid: item.huid ?? null,
        receivedAt: null,
      }));
      const created = await strapi.documents(TRANSFER).create({
        data: {
          number,
          status: "in_transit",
          lines,
          note: text(body.note, 500),
          dispatchedAt: new Date().toISOString(),
          fromBranch: from.documentId,
          toBranch: to.documentId,
          dispatchedBy: staff.documentId,
          organization: staff.organization.documentId,
        },
      });
      for (const item of items) {
        await strapi.db.query(ITEM).update({ where: { id: item.id }, data: { status: "in_transit", location: null, slot: null } });
        await recordMovement(strapi, staff, {
          type: "dispatched",
          item: item.id,
          fromStatus: "in_stock",
          toStatus: "in_transit",
          fromLocation: item.location?.id ?? null,
          fromBranch: from.id,
          toBranch: to.id,
          reference: number,
        });
      }
      return created;
    });

    const saved = await strapi.db.query(TRANSFER).findOne({ where: { id: transfer.id }, populate: POPULATE });
    ctx.status = 201;
    ctx.body = { data: serialize(saved) };
  },

  /** Checks in pieces at the receiving branch as they are scanned. Each code stands alone. */
  async receive(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, STOCK_EDITOR_ROLES, "receive transfers");
    const transfer = await strapi.db.query(TRANSFER).findOne({ where: { id: idOf(ctx.params.id), ...orgWhere(staff) }, populate: POPULATE });
    if (!transfer) notFound("Transfer");
    const to = await requireBranch(strapi, staff, transfer.toBranch.id);
    if (transfer.status === "received") throw new errors.ValidationError(`${transfer.number} has been fully received.`);

    const body = ctx.request.body ?? {};
    const location = idOf(body.locationId) ? await holdingLocation(strapi, staff, idOf(body.locationId)!, to.id) : null;
    const codes: string[] = (Array.isArray(body.codes) ? body.codes : []).map((code: unknown) => normaliseCode(String(code ?? ""))).filter(Boolean);
    if (!codes.length) throw new errors.ValidationError("Scan the pieces that arrived.");

    const lines: Line[] = transfer.lines ?? [];
    const results = [];
    for (const code of codes) {
      const line = lines.find((entry) => entry.tagNumber === code || entry.legacyTag === code || entry.huid === code);
      if (!line) {
        results.push({ code, ok: false, message: `This piece is not on ${transfer.number}.` });
        continue;
      }
      if (line.receivedAt) {
        results.push({ code, ok: true, tagNumber: line.tagNumber, message: "Already received." });
        continue;
      }
      await strapi.db.transaction(async () => {
        await strapi.db.query(ITEM).update({
          where: { id: line.itemId },
          data: { status: "in_stock", branch: to.id, location: location?.id ?? null, slot: null },
        });
        await recordMovement(strapi, staff, {
          type: "arrived",
          item: line.itemId,
          fromStatus: "in_transit",
          toStatus: "in_stock",
          toLocation: location?.id ?? null,
          fromBranch: transfer.fromBranch.id,
          toBranch: to.id,
          reference: transfer.number,
        });
      });
      line.receivedAt = new Date().toISOString();
      results.push({ code, ok: true, tagNumber: line.tagNumber, message: location ? `Received into ${location.fullCode}.` : "Received. Put it in a tray." });
    }

    const done = lines.every((line) => line.receivedAt);
    await strapi.documents(TRANSFER).update({
      documentId: transfer.documentId,
      data: {
        lines,
        status: done ? "received" : lines.some((line) => line.receivedAt) ? "partly_received" : "in_transit",
        receivedBy: staff.documentId,
        ...(done ? { completedAt: new Date().toISOString() } : {}),
      },
    });

    const saved = await strapi.db.query(TRANSFER).findOne({ where: { id: transfer.id }, populate: POPULATE });
    ctx.body = { data: { transfer: serialize(saved), results } };
  },
});
