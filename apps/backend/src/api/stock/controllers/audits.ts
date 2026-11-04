import { errors } from "@strapi/utils";
import { STOCK_EDITOR_ROLES } from "../../../utils/constants";
import { compareAudit, normaliseCode, type AuditExpected, type AuditScan } from "../../../utils/stock";
import { branchIdsFor, requireBranch } from "../../../utils/staff";
import { AUDIT, ITEM, LOCATION, idOf, notFound, orgWhere, paging, requireRole, staffOf } from "../lib/common";
import { findByCode } from "../lib/items";
import { ITEM_POPULATE, serializeItem } from "../lib/serialize";

type StoredScan = AuditScan & { at: string; tagNumber: string | null };

const POPULATE = {
  branch: { select: ["id", "code", "name"] },
  location: { select: ["id", "code", "fullCode", "name", "kind"] },
  startedBy: { select: ["id", "fullName", "username"] },
  closedBy: { select: ["id", "fullName", "username"] },
};

const person = (user: any) => (user ? user.fullName || user.username : null);

function serialize(audit: any) {
  const expected: AuditExpected[] = audit.expected ?? [];
  const scans: StoredScan[] = audit.scans ?? [];
  const scannedIds = new Set(scans.filter((scan) => scan.id !== null).map((scan) => scan.id));
  return {
    id: audit.id,
    status: audit.status,
    startedAt: audit.startedAt,
    closedAt: audit.closedAt ?? null,
    branch: audit.branch ? { id: audit.branch.id, code: audit.branch.code, name: audit.branch.name } : null,
    location: audit.location ? { id: audit.location.id, fullCode: audit.location.fullCode, name: audit.location.name ?? null, kind: audit.location.kind } : null,
    startedBy: person(audit.startedBy),
    closedBy: person(audit.closedBy),
    expectedCount: expected.length,
    scannedCount: scannedIds.size,
    foundCount: expected.filter((entry) => scannedIds.has(entry.id)).length,
    recentScans: scans.slice(-20).reverse(),
    result: audit.result ?? null,
  };
}

/** The ids of a location and every location inside it. */
async function scopeIds(strapi: any, locationId: number): Promise<number[]> {
  const children = await strapi.db.query(LOCATION).findMany({ where: { parent: { id: locationId } }, select: ["id"] });
  return [locationId, ...children.map((child: any) => child.id)];
}

export default ({ strapi }: { strapi: any }) => ({
  async list(ctx: any) {
    const staff = staffOf(ctx);
    const { page, pageSize } = paging(ctx.query, 30);
    const branches = await branchIdsFor(strapi, staff);
    const result = await strapi.db.query(AUDIT).findPage({
      where: { ...orgWhere(staff), branch: { id: { $in: branches } } },
      page,
      pageSize,
      orderBy: { startedAt: "desc" },
      populate: POPULATE,
    });
    ctx.body = { data: result.results.map(serialize), meta: { pagination: result.pagination } };
  },

  async get(ctx: any) {
    const staff = staffOf(ctx);
    const audit = await strapi.db.query(AUDIT).findOne({ where: { id: idOf(ctx.params.id), ...orgWhere(staff) }, populate: POPULATE });
    if (!audit) notFound("Audit");
    await requireBranch(strapi, staff, audit.branch.id);
    ctx.body = { data: serialize(audit) };
  },

  /** Starts a count of a whole branch, or of one showcase (with its trays) or tray. */
  async create(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, STOCK_EDITOR_ROLES, "audit stock");
    const body = ctx.request.body ?? {};
    const branch = await requireBranch(strapi, staff, body.branchId);

    let location: any = null;
    const where: any = { ...orgWhere(staff), branch: { id: branch.id }, status: "in_stock" };
    if (idOf(body.locationId)) {
      location = await strapi.db.query(LOCATION).findOne({ where: { id: idOf(body.locationId), ...orgWhere(staff) }, populate: { branch: true } });
      if (!location || location.branch?.id !== branch.id) throw new errors.ValidationError("Choose a location in this branch.");
      where.location = { id: { $in: await scopeIds(strapi, location.id) } };
    }

    const open = await strapi.db.query(AUDIT).findOne({
      where: { ...orgWhere(staff), branch: { id: branch.id }, status: "open", location: location ? { id: location.id } : { id: { $null: true } } },
    });
    if (open) throw new errors.ValidationError("A count of this area is already open. Finish it first.", { auditId: open.id });

    const items = await strapi.db.query(ITEM).findMany({ where, select: ["id", "tagNumber"], populate: { location: { select: ["id"] } } });
    const expected: AuditExpected[] = items.map((item: any) => ({ id: item.id, tagNumber: item.tagNumber, locationId: item.location?.id ?? null }));

    const audit = await strapi.documents(AUDIT).create({
      data: {
        status: "open",
        expected,
        scans: [],
        startedAt: new Date().toISOString(),
        branch: branch.documentId,
        location: location?.documentId ?? null,
        startedBy: staff.documentId,
        organization: staff.organization.documentId,
      },
    });
    const saved = await strapi.db.query(AUDIT).findOne({ where: { id: audit.id }, populate: POPULATE });
    ctx.status = 201;
    ctx.body = { data: serialize(saved) };
  },

  /** Records one scan and says straight away whether the piece belongs here. */
  async scan(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, STOCK_EDITOR_ROLES, "audit stock");
    const audit = await strapi.db.query(AUDIT).findOne({ where: { id: idOf(ctx.params.id), ...orgWhere(staff) }, populate: POPULATE });
    if (!audit) notFound("Audit");
    await requireBranch(strapi, staff, audit.branch.id);
    if (audit.status !== "open") throw new errors.ValidationError("This count is closed.");

    const code = normaliseCode(String(ctx.request.body?.code ?? ""));
    if (!code) throw new errors.ValidationError("Scan a tag.");
    const scans: StoredScan[] = audit.scans ?? [];
    const expected: AuditExpected[] = audit.expected ?? [];
    const item = await findByCode(strapi, staff, code, { branch: { select: ["id", "name"] }, location: { select: ["id", "fullCode"] } });

    let verdict: "expected" | "duplicate" | "elsewhere" | "unknown";
    let message: string;
    if (!item) {
      verdict = "unknown";
      message = "No piece in the system has this code.";
    } else if (scans.some((scan) => scan.id === item.id)) {
      verdict = "duplicate";
      message = "Already counted.";
    } else if (expected.some((entry) => entry.id === item.id)) {
      verdict = "expected";
      message = "Counted.";
    } else {
      verdict = "elsewhere";
      message =
        item.branch?.id !== audit.branch.id
          ? `The system has this piece at ${item.branch?.name}.`
          : item.status !== "in_stock"
            ? `The system has this piece as ${item.status.replace("_", " ")}.`
            : `The system has this piece in ${item.location?.fullCode ?? "no tray"}.`;
    }

    if (verdict !== "duplicate") {
      scans.push({ id: item?.id ?? null, code, tagNumber: item?.tagNumber ?? null, locationId: item?.location?.id ?? null, at: new Date().toISOString() });
      await strapi.db.query(AUDIT).update({ where: { id: audit.id }, data: { scans } });
    }

    const saved = await strapi.db.query(AUDIT).findOne({ where: { id: audit.id }, populate: POPULATE });
    ctx.body = { data: { verdict, message, tagNumber: item?.tagNumber ?? null, audit: serialize(saved) } };
  },

  /** Closes the count and stores the comparison. Nothing in stock is changed automatically. */
  async close(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, STOCK_EDITOR_ROLES, "audit stock");
    const audit = await strapi.db.query(AUDIT).findOne({ where: { id: idOf(ctx.params.id), ...orgWhere(staff) }, populate: POPULATE });
    if (!audit) notFound("Audit");
    await requireBranch(strapi, staff, audit.branch.id);
    if (audit.status !== "open") throw new errors.ValidationError("This count is already closed.");

    const comparison = compareAudit(audit.expected ?? [], audit.scans ?? []);
    const detail = async (ids: number[]) =>
      ids.length
        ? (await strapi.db.query(ITEM).findMany({ where: { id: { $in: ids } }, populate: ITEM_POPULATE })).map((item: any) => serializeItem(item, { cost: false }))
        : [];

    const result = {
      matched: comparison.matched.length,
      missing: await detail(comparison.missing),
      misplaced: await detail(comparison.misplaced),
      unknown: comparison.unknown,
    };

    await strapi.documents(AUDIT).update({
      documentId: audit.documentId,
      data: { status: "closed", result, closedAt: new Date().toISOString(), closedBy: staff.documentId },
    });
    const saved = await strapi.db.query(AUDIT).findOne({ where: { id: audit.id }, populate: POPULATE });
    ctx.body = { data: serialize(saved) };
  },
});
