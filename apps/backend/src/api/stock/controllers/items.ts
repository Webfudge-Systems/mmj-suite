import { errors } from "@strapi/utils";
import { ITEM_STATUSES, STOCK_EDITOR_ROLES } from "../../../utils/constants";
import { metalForPurity, netWeight, normaliseCode, normaliseHuid, StockRuleError, toNumber } from "../../../utils/stock";
import { branchIdsFor, canSeeCost } from "../../../utils/staff";
import { parseMaking } from "./catalogue";
import { AUDIT, DESIGN, ITEM, MOVEMENT, TRANSFER, codeWhere, idOf, notFound, orgWhere, paging, requireRole, staffOf, text } from "../lib/common";
import { findByCode, holdingLocation, recordMovement } from "../lib/items";
import { ITEM_POPULATE, MOVEMENT_POPULATE, serializeItem, serializeMovement } from "../lib/serialize";

/** Statuses in which a piece's details may still be corrected. */
const EDITABLE = ["in_stock", "with_staff", "reserved", "on_approval", "at_karigar"];

export default ({ strapi }: { strapi: any }) => ({
  async list(ctx: any) {
    const staff = staffOf(ctx);
    const { page, pageSize } = paging(ctx.query, 50);
    const where: any = { ...orgWhere(staff) };
    const branches = await branchIdsFor(strapi, staff);
    const branchId = idOf(ctx.query.branchId);
    where.branch = { id: branchId && branches.includes(branchId) ? branchId : { $in: branches } };

    if (ITEM_STATUSES.includes(ctx.query.status)) where.status = ctx.query.status;
    else if (ctx.query.status !== "all") where.status = { $notIn: ["sold", "melted"] };
    if (["gold", "silver", "platinum"].includes(ctx.query.metal)) where.metal = ctx.query.metal;
    if (text(ctx.query.purity, 8)) where.purity = String(ctx.query.purity).toUpperCase();
    if (idOf(ctx.query.designId)) where.design = { id: idOf(ctx.query.designId) };
    if (idOf(ctx.query.categoryId)) where.design = { ...(where.design ?? {}), category: { id: idOf(ctx.query.categoryId) } };
    if (idOf(ctx.query.locationId)) where.location = { id: idOf(ctx.query.locationId) };
    if (ctx.query.untrayed === "true") {
      where.location = { id: { $null: true } };
      where.status = "in_stock";
    }
    const q = text(ctx.query.q, 64);
    if (q) {
      const code = normaliseCode(q);
      where.$or = [
        { tagNumber: { $containsi: code } },
        { legacyTag: { $containsi: code } },
        { huid: code },
        { design: { code: { $containsi: q } } },
        { design: { name: { $containsi: q } } },
      ];
    }

    const result = await strapi.db.query(ITEM).findPage({ where, page, pageSize, orderBy: { id: "desc" }, populate: ITEM_POPULATE });
    const cost = canSeeCost(staff);
    ctx.body = { data: result.results.map((item: any) => serializeItem(item, { cost })), meta: { pagination: result.pagination } };
  },

  async get(ctx: any) {
    const staff = staffOf(ctx);
    const item = await strapi.db.query(ITEM).findOne({ where: { id: idOf(ctx.params.id), ...orgWhere(staff) }, populate: ITEM_POPULATE });
    if (!item) notFound("Piece");
    const movements = await strapi.db.query(MOVEMENT).findMany({
      where: { item: { id: item.id } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      populate: MOVEMENT_POPULATE,
      limit: 200,
    });
    ctx.body = { data: { ...serializeItem(item, { cost: canSeeCost(staff) }), movements: movements.map(serializeMovement) } };
  },

  /** Finds a piece by tag number, old tag or HUID, in any branch of the organization. */
  async lookup(ctx: any) {
    const staff = staffOf(ctx);
    const code = text(ctx.query.code, 64);
    if (!code) throw new errors.ValidationError("Scan or type a tag number.");
    const item = await strapi.db.query(ITEM).findOne({ where: { ...codeWhere(code), ...orgWhere(staff) }, populate: ITEM_POPULATE });
    if (!item) notFound(`No piece matches ${code}. It`);
    ctx.body = { data: serializeItem(item, { cost: canSeeCost(staff) }) };
  },

  /** Corrects a piece's details. Every change is written to the ledger with before and after values. */
  async update(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, STOCK_EDITOR_ROLES, "edit pieces");
    const item = await strapi.db.query(ITEM).findOne({
      where: { id: idOf(ctx.params.id), ...orgWhere(staff) },
      populate: { making: true, design: { select: ["id", "code", "metal"] }, branch: { select: ["id"] } },
    });
    if (!item) notFound("Piece");
    if (!(await branchIdsFor(strapi, staff)).includes(item.branch.id)) throw new errors.ForbiddenError("This piece is at a branch you do not work in.");
    if (!EDITABLE.includes(item.status)) throw new errors.ValidationError(`A ${item.status.replace("_", " ")} piece cannot be edited.`);

    const body = ctx.request.body ?? {};
    const data: any = {};
    const changes: Record<string, [unknown, unknown]> = {};
    const set = (field: string, before: unknown, after: unknown) => {
      if (after === undefined) return;
      const same = typeof before === "object" ? JSON.stringify(before) === JSON.stringify(after) : String(before ?? "") === String(after ?? "");
      if (same) return;
      data[field] = after;
      changes[field] = [before ?? null, after ?? null];
    };

    try {
      if (body.purity !== undefined) {
        const purity = String(body.purity).toUpperCase();
        if (metalForPurity(purity) !== item.metal) throw new StockRuleError(`${purity} is not a ${item.metal} purity.`);
        set("purity", item.purity, purity);
      }
      const gross = body.grossWeight !== undefined ? toNumber(body.grossWeight, NaN) : Number(item.grossWeight);
      const stone = body.stoneWeight !== undefined ? toNumber(body.stoneWeight, NaN) : Number(item.stoneWeight ?? 0);
      if (body.grossWeight !== undefined || body.stoneWeight !== undefined) {
        const net = netWeight(gross, stone);
        set("grossWeight", Number(item.grossWeight), gross);
        set("stoneWeight", Number(item.stoneWeight ?? 0), stone);
        set("netWeight", Number(item.netWeight), net);
      }
      if (body.huid !== undefined) {
        const huid = normaliseHuid(body.huid);
        if (huid && huid !== item.huid) {
          const taken = await strapi.db.query(ITEM).findOne({ where: { huid, id: { $ne: item.id }, status: { $ne: "melted" }, ...orgWhere(staff) } });
          if (taken) throw new StockRuleError(`HUID ${huid} is already on piece ${taken.tagNumber}.`);
        }
        set("huid", item.huid, huid);
      }
      if (body.legacyTag !== undefined) set("legacyTag", item.legacyTag, text(body.legacyTag, 64) ? normaliseCode(body.legacyTag) : null);
      if (body.stoneValue !== undefined) {
        const value = toNumber(body.stoneValue, NaN);
        if (!Number.isFinite(value) || value < 0) throw new StockRuleError("Stone value cannot be negative.");
        set("stoneValue", Number(item.stoneValue ?? 0), value);
      }
      if (body.costPrice !== undefined) {
        if (!canSeeCost(staff)) throw new errors.ForbiddenError("Your role cannot change cost prices.");
        const value = body.costPrice === null || body.costPrice === "" ? null : toNumber(body.costPrice, NaN);
        if (value !== null && (!Number.isFinite(value) || value < 0)) throw new StockRuleError("Cost cannot be negative.");
        set("costPrice", item.costPrice === null ? null : Number(item.costPrice), value);
      }
      if (body.making !== undefined) {
        const making = parseMaking(body.making, true);
        set("making", item.making ? { type: item.making.type, value: Number(item.making.value) } : null, making);
      }
      if (body.notes !== undefined) set("notes", item.notes, text(body.notes, 1000));
      if (body.designId !== undefined && idOf(body.designId) !== item.design?.id) {
        const design = await strapi.db.query(DESIGN).findOne({ where: { id: idOf(body.designId), ...orgWhere(staff) } });
        if (!design) throw new StockRuleError("That design does not exist.");
        if (design.metal !== item.metal) throw new StockRuleError(`${design.code} is a ${design.metal} design.`);
        data.design = design.documentId;
        changes.design = [item.design?.code ?? null, design.code];
      }
    } catch (error) {
      if (error instanceof StockRuleError) throw new errors.ValidationError(error.message);
      throw error;
    }

    if (Object.keys(changes).length) {
      const reason = text(body.reason, 300);
      await strapi.db.transaction(async () => {
        await strapi.documents(ITEM).update({ documentId: item.documentId, data });
        await recordMovement(strapi, staff, { type: "edited", item: item.id, changes, note: reason });
      });
    }

    const updated = await strapi.db.query(ITEM).findOne({ where: { id: item.id }, populate: ITEM_POPULATE });
    ctx.body = { data: serializeItem(updated, { cost: canSeeCost(staff) }) };
  },

  /**
   * Puts scanned pieces into a tray. Each code succeeds or fails on its own,
   * so one bad scan never blocks the rest of the tray.
   */
  async move(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, STOCK_EDITOR_ROLES, "move stock");
    const body = ctx.request.body ?? {};
    const locationId = idOf(body.locationId);
    if (!locationId) throw new errors.ValidationError("Scan or choose the tray first.");
    const codes: string[] = (Array.isArray(body.codes) ? body.codes : []).map((code: unknown) => String(code ?? "")).filter((code: string) => code.trim());
    if (!codes.length) throw new errors.ValidationError("Scan at least one piece.");
    if (codes.length > 500) throw new errors.ValidationError("Move at most 500 pieces at a time.");

    const anyLocation = await strapi.db.query("api::location.location").findOne({
      where: { id: locationId, ...orgWhere(staff) },
      populate: { branch: { select: ["id"] } },
    });
    if (!anyLocation) throw new errors.ValidationError("That location does not exist.");
    if (!(await branchIdsFor(strapi, staff)).includes(anyLocation.branch?.id)) throw new errors.ForbiddenError("That tray is at a branch you do not work in.");
    const location = await holdingLocation(strapi, staff, locationId, anyLocation.branch.id);
    const slot = text(body.slot, 8) ? normaliseCode(body.slot) : null;

    const results = [];
    for (const code of codes) {
      const item = await findByCode(strapi, staff, code, { branch: { select: ["id", "name"] }, location: { select: ["id", "fullCode"] } });
      if (!item) {
        results.push({ code, ok: false, message: "No piece has this code." });
        continue;
      }
      if (item.branch?.id !== anyLocation.branch.id) {
        results.push({ code, ok: false, tagNumber: item.tagNumber, message: `This piece is at ${item.branch?.name}. Transfer it first.` });
        continue;
      }
      if (!["in_stock", "with_staff"].includes(item.status)) {
        results.push({ code, ok: false, tagNumber: item.tagNumber, message: `This piece is ${item.status.replace("_", " ")}.` });
        continue;
      }
      if (item.location?.id === location.id && item.status === "in_stock" && (item.slot ?? null) === slot) {
        results.push({ code, ok: true, tagNumber: item.tagNumber, message: "Already here." });
        continue;
      }
      await strapi.db.transaction(async () => {
        await strapi.db.query(ITEM).update({ where: { id: item.id }, data: { location: location.id, slot, status: "in_stock" } });
        await recordMovement(strapi, staff, {
          type: "moved",
          item: item.id,
          fromStatus: item.status,
          toStatus: "in_stock",
          fromLocation: item.location?.id ?? null,
          toLocation: location.id,
        });
      });
      results.push({ code, ok: true, tagNumber: item.tagNumber, message: item.location ? `Moved from ${item.location.fullCode}.` : "Placed." });
    }

    ctx.body = { data: { location: { id: location.id, fullCode: location.fullCode }, results } };
  },

  /** Counts for the Back Office dashboard. */
  async summary(ctx: any) {
    const staff = staffOf(ctx);
    const branches = await branchIdsFor(strapi, staff);
    const branchId = idOf(ctx.query.branchId);
    const scope = { ...orgWhere(staff), branch: { id: branchId && branches.includes(branchId) ? branchId : { $in: branches } } };
    const count = (where: any) => strapi.db.query(ITEM).count({ where: { ...scope, ...where } });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [inStock, untrayed, withStaff, inTransit, receivedToday] = await Promise.all([
      count({ status: "in_stock" }),
      count({ status: "in_stock", location: { id: { $null: true } } }),
      count({ status: "with_staff" }),
      count({ status: "in_transit" }),
      count({ receivedAt: { $gte: startOfDay.toISOString() } }),
    ]);

    // Weight in stock by purity. Read only the columns needed.
    const rows = await strapi.db.query(ITEM).findMany({ where: { ...scope, status: "in_stock" }, select: ["id", "purity", "netWeight", "grossWeight"] });
    const byPurity = new Map<string, { pieces: number; netWeight: number; grossWeight: number }>();
    for (const row of rows) {
      const entry = byPurity.get(row.purity) ?? { pieces: 0, netWeight: 0, grossWeight: 0 };
      entry.pieces += 1;
      entry.netWeight += Number(row.netWeight);
      entry.grossWeight += Number(row.grossWeight);
      byPurity.set(row.purity, entry);
    }

    const incoming = await strapi.db.query(TRANSFER).count({
      where: { ...orgWhere(staff), toBranch: { id: { $in: branches } }, status: { $in: ["in_transit", "partly_received"] } },
    });
    const lastAudit = await strapi.db.query(AUDIT).findOne({
      where: { ...orgWhere(staff), status: "closed", branch: { id: { $in: branches } } },
      orderBy: { closedAt: "desc" },
      select: ["id", "closedAt"],
    });

    ctx.body = {
      data: {
        inStock,
        untrayed,
        withStaff,
        inTransit,
        receivedToday,
        incomingTransfers: incoming,
        lastAuditAt: lastAudit?.closedAt ?? null,
        byPurity: [...byPurity.entries()].map(([purity, entry]) => ({
          purity,
          pieces: entry.pieces,
          netWeight: Math.round(entry.netWeight * 1000) / 1000,
          grossWeight: Math.round(entry.grossWeight * 1000) / 1000,
        })),
      },
    };
  },
});
