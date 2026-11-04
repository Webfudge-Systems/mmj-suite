import { errors } from "@strapi/utils";
import { LOCATION_KINDS, STOCK_EDITOR_ROLES, type LocationKind } from "../../../utils/constants";
import { normaliseCode } from "../../../utils/stock";
import { branchIdsFor, canSeeCost, requireBranch } from "../../../utils/staff";
import { ITEM, LOCATION, idOf, notFound, orgWhere, requireRole, staffOf, text } from "../lib/common";
import { ITEM_POPULATE, serializeItem } from "../lib/serialize";

/** Which kinds may sit inside which. A tray lives in a showcase or counter; the rest stand alone. */
const PARENT_KINDS: Record<LocationKind, LocationKind[]> = {
  showcase: [],
  counter: [],
  safe: [],
  back_office: [],
  tray: ["showcase", "counter", "safe"],
};

function serialize(location: any, pieces = 0) {
  return {
    id: location.id,
    code: location.code,
    fullCode: location.fullCode,
    name: location.name ?? null,
    kind: location.kind,
    sortOrder: location.sortOrder ?? 0,
    isActive: location.isActive !== false,
    parentId: location.parent?.id ?? null,
    branch: location.branch ? { id: location.branch.id, code: location.branch.code, name: location.branch.name } : null,
    pieces,
  };
}

export default ({ strapi }: { strapi: any }) => ({
  /** Every location in a branch, flat, with the parent id and pieces in stock in each. */
  async list(ctx: any) {
    const staff = staffOf(ctx);
    const branch = await requireBranch(strapi, staff, ctx.query.branchId);
    const rows = await strapi.db.query(LOCATION).findMany({
      where: { ...orgWhere(staff), branch: { id: branch.id } },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      populate: { parent: { select: ["id"] }, branch: { select: ["id", "code", "name"] } },
    });
    const items = await strapi.db.query(ITEM).findMany({
      where: { ...orgWhere(staff), branch: { id: branch.id }, status: "in_stock", location: { id: { $notNull: true } } },
      select: ["id"],
      populate: { location: { select: ["id"] } },
    });
    const counts = new Map<number, number>();
    for (const item of items) counts.set(item.location.id, (counts.get(item.location.id) ?? 0) + 1);
    const untrayed = await strapi.db.query(ITEM).count({
      where: { ...orgWhere(staff), branch: { id: branch.id }, status: "in_stock", location: { id: { $null: true } } },
    });

    ctx.body = { data: rows.map((row: any) => serialize(row, counts.get(row.id) ?? 0)), meta: { untrayed } };
  },

  async get(ctx: any) {
    const staff = staffOf(ctx);
    const location = await strapi.db.query(LOCATION).findOne({
      where: { id: idOf(ctx.params.id), ...orgWhere(staff) },
      populate: { parent: { select: ["id", "fullCode"] }, branch: { select: ["id", "code", "name"] } },
    });
    if (!location) notFound("Location");
    if (!(await branchIdsFor(strapi, staff)).includes(location.branch.id)) throw new errors.ForbiddenError("This location is at a branch you do not work in.");

    const children = await strapi.db.query(LOCATION).findMany({ where: { parent: { id: location.id } }, select: ["id"] });
    const ids = [location.id, ...children.map((child: any) => child.id)];
    const items = await strapi.db.query(ITEM).findMany({
      where: { location: { id: { $in: ids } }, status: "in_stock" },
      orderBy: [{ slot: "asc" }, { tagNumber: "asc" }],
      populate: ITEM_POPULATE,
      limit: 1000,
    });
    ctx.body = {
      data: { ...serialize(location, items.length), items: items.map((item: any) => serializeItem(item, { cost: canSeeCost(staff) })) },
    };
  },

  /** Finds a location by its QR code (full code), so a scan of the tray label opens it. */
  async lookup(ctx: any) {
    const staff = staffOf(ctx);
    const code = text(ctx.query.code, 40);
    if (!code) throw new errors.ValidationError("Scan the tray label.");
    const location = await strapi.db.query(LOCATION).findOne({
      where: { fullCode: normaliseCode(code), ...orgWhere(staff) },
      populate: { parent: { select: ["id"] }, branch: { select: ["id", "code", "name"] } },
    });
    if (!location) notFound(`No location has the code ${code}. It`);
    ctx.body = { data: serialize(location) };
  },

  async save(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, STOCK_EDITOR_ROLES, "change locations");
    const body = ctx.request.body ?? {};
    const id = idOf(ctx.params.id);
    const existing = id
      ? await strapi.db.query(LOCATION).findOne({ where: { id, ...orgWhere(staff) }, populate: { branch: true, parent: true } })
      : null;
    if (id && !existing) notFound("Location");

    const branch = await requireBranch(strapi, staff, existing?.branch?.id ?? body.branchId);
    const kind = (existing?.kind ?? body.kind) as LocationKind;
    if (!LOCATION_KINDS.includes(kind)) throw new errors.ValidationError("Choose showcase, counter, tray, safe or back office.");
    const code = text(body.code ?? existing?.code, 12) ? normaliseCode(body.code ?? existing.code) : null;
    if (!code || !/^[A-Z0-9-]{1,12}$/.test(code)) throw new errors.ValidationError("Use a short code of letters and digits, like SC03 or T05.");

    let parent: any = null;
    const parentId = body.parentId !== undefined ? idOf(body.parentId) : existing?.parent?.id ?? null;
    if (parentId) {
      parent = await strapi.db.query(LOCATION).findOne({ where: { id: parentId, ...orgWhere(staff) }, populate: { branch: true } });
      if (!parent || parent.branch?.id !== branch.id) throw new errors.ValidationError("The parent must be in the same branch.");
      if (!PARENT_KINDS[kind].includes(parent.kind)) throw new errors.ValidationError(`A ${kind.replace("_", " ")} cannot sit inside a ${parent.kind}.`);
    } else if (kind === "tray") {
      throw new errors.ValidationError("Choose the showcase, counter or safe this tray sits in.");
    }

    const fullCode = [branch.code, parent?.code, code].filter(Boolean).join("-");
    const clash = await strapi.db.query(LOCATION).findOne({ where: { fullCode, ...(id ? { id: { $ne: id } } : {}) } });
    if (clash) throw new errors.ValidationError(`${fullCode} already exists.`);

    if (existing && body.isActive === false) {
      const pieces = await strapi.db.query(ITEM).count({ where: { location: { id: existing.id }, status: "in_stock" } });
      if (pieces) throw new errors.ValidationError(`Move the ${pieces} pieces out of ${existing.fullCode} before retiring it.`);
    }

    const data = {
      code,
      fullCode,
      kind,
      name: text(body.name, 60),
      sortOrder: Number.isInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : existing?.sortOrder ?? 0,
      isActive: body.isActive !== false,
      parent: parent?.documentId ?? null,
      branch: branch.documentId,
    };

    const saved = existing
      ? await strapi.documents(LOCATION).update({ documentId: existing.documentId, data })
      : await strapi.documents(LOCATION).create({ data: { ...data, organization: staff.organization.documentId } });

    // A showcase's code is part of its trays' codes, so renaming it renames them.
    if (existing && existing.code !== code) {
      const children = await strapi.db.query(LOCATION).findMany({ where: { parent: { id: existing.id } } });
      for (const child of children) {
        await strapi.documents(LOCATION).update({ documentId: child.documentId, data: { fullCode: [branch.code, code, child.code].join("-") } });
      }
    }

    const location = await strapi.db.query(LOCATION).findOne({
      where: { id: saved.id },
      populate: { parent: { select: ["id"] }, branch: { select: ["id", "code", "name"] } },
    });
    ctx.status = existing ? 200 : 201;
    ctx.body = { data: serialize(location) };
  },
});
