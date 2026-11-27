import { errors } from "@strapi/utils";
import { STOCK_EDITOR_ROLES } from "../../../utils/constants";
import { reserveSequence } from "../../../utils/sequence";
import { normaliseCode } from "../../../utils/stock";
import { branchIdsFor, requireBranch } from "../../../utils/staff";
import { BRANCH, ITEM, TRANSFER, idOf, notFound, orgWhere, paging, requireRole, staffOf, text } from "../lib/common";
import { findByCode, holdingLocation, recordMovement } from "../lib/items";
import { serializeImage } from "../lib/serialize";

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

/** Adds each line's design, purity, weights, tray and photo, for the transfer's own page. */
async function withPieces(strapi: any, transfer: ReturnType<typeof serialize>) {
  const ids = transfer.lines.map((line) => line.itemId);
  if (!ids.length) return transfer;
  const items = await strapi.db.query(ITEM).findMany({
    where: { id: { $in: ids } },
    select: ["id", "purity", "grossWeight", "netWeight", "status"],
    populate: { photos: true, design: { select: ["id", "code", "name"], populate: { images: true } }, location: { select: ["id", "fullCode"] } },
  });
  const byId = new Map<number, any>(items.map((item: any) => [item.id, item]));
  return {
    ...transfer,
    lines: transfer.lines.map((line) => {
      const item = byId.get(line.itemId);
      if (!item) return line;
      const photo = item.photos?.[0] ?? null;
      const designImage = item.design?.images?.[0] ?? null;
      return {
        ...line,
        design: item.design ? { id: item.design.id, code: item.design.code, name: item.design.name } : null,
        purity: item.purity,
        grossWeight: Number(item.grossWeight),
        netWeight: Number(item.netWeight),
        status: item.status,
        location: item.location?.fullCode ?? null,
        photo: photo ? serializeImage(photo) : null,
        designImage: designImage ? serializeImage(designImage) : null,
      };
    }),
  };
}

export default ({ strapi }: { strapi: any }) => ({
  /**
   * Transfers to and from the staff's branches. With branchId, `direction` picks
   * "out" (sent from it) or "in" (sent to it); `status` is a state or "open";
   * `q` matches the transfer number; `summary=true` adds the cards' totals.
   */
  async list(ctx: any) {
    const staff = staffOf(ctx);
    const { page, pageSize } = paging(ctx.query, 30);
    const branches = await branchIdsFor(strapi, staff);
    const branchId = idOf(ctx.query.branchId);
    const here = branchId && branches.includes(branchId) ? branchId : null;
    const scope: any = { ...orgWhere(staff), $or: [{ fromBranch: { id: { $in: branches } } }, { toBranch: { id: { $in: branches } } }] };
    const where: any = { ...scope };
    const and: any[] = [];
    if (here && ctx.query.direction === "out") and.push({ fromBranch: { id: here } });
    else if (here && ctx.query.direction === "in") and.push({ toBranch: { id: here } });
    if (ctx.query.open === "true" || ctx.query.status === "open") where.status = { $in: ["in_transit", "partly_received"] };
    else if (["in_transit", "partly_received", "received"].includes(ctx.query.status)) where.status = ctx.query.status;
    const q = typeof ctx.query.q === "string" ? ctx.query.q.trim() : "";
    if (q) and.push({ $or: [{ number: { $containsi: q } }, { note: { $containsi: q } }] });
    if (and.length) where.$and = and;
    const result = await strapi.db.query(TRANSFER).findPage({ where, page, pageSize, orderBy: { createdAt: "desc" }, populate: POPULATE });
    const meta: any = { pagination: result.pagination };

    if (ctx.query.summary === "true") {
      const open = { $in: ["in_transit", "partly_received"] };
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const count = (extra: any) => strapi.db.query(TRANSFER).count({ where: { ...scope, ...extra } });
      const sentMonth = await strapi.db.query(TRANSFER).findMany({
        where: { ...scope, ...(here ? { fromBranch: { id: here } } : {}), dispatchedAt: { $gte: monthStart.toISOString() } },
        select: ["lines"],
      });
      const onTheWay = await strapi.db.query(TRANSFER).findMany({ where: { ...scope, status: open }, select: ["lines"] });
      meta.summary = {
        open: await count({ status: open }),
        arrivingHere: here ? await count({ status: open, toBranch: { id: here } }) : 0,
        leftHere: here ? await count({ status: open, fromBranch: { id: here } }) : 0,
        piecesOnTheWay: onTheWay.reduce((sum: number, row: any) => sum + (row.lines ?? []).filter((line: Line) => !line.receivedAt).length, 0),
        sentThisMonth: sentMonth.length,
        piecesSentThisMonth: sentMonth.reduce((sum: number, row: any) => sum + (row.lines ?? []).length, 0),
      };
    }
    ctx.body = { data: result.results.map(serialize), meta };
  },

  async get(ctx: any) {
    const staff = staffOf(ctx);
    const transfer = await strapi.db.query(TRANSFER).findOne({ where: { id: idOf(ctx.params.id), ...orgWhere(staff) }, populate: POPULATE });
    if (!transfer) notFound("Transfer");
    const branches = await branchIdsFor(strapi, staff);
    if (!branches.includes(transfer.fromBranch.id) && !branches.includes(transfer.toBranch.id)) {
      throw new errors.ForbiddenError("This transfer is between branches you do not work in.");
    }
    ctx.body = { data: await withPieces(strapi, serialize(transfer)) };
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
    ctx.body = { data: { transfer: await withPieces(strapi, serialize(saved)), results } };
  },
});
