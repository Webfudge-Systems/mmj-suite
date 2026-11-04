import { errors } from "@strapi/utils";
import { CATALOGUE_EDITOR_ROLES, MAKING_TYPES, PURITY_CODES, type Metal } from "../../../utils/constants";
import { reserveSequence } from "../../../utils/sequence";
import { formatDesignCode, metalForPurity, normaliseCode } from "../../../utils/stock";
import {
  CATEGORY,
  COLLECTION,
  DESIGN,
  SUPPLIER,
  idOf,
  notFound,
  orgWhere,
  paging,
  requireRole,
  staffOf,
  text,
} from "../lib/common";
import { DESIGN_POPULATE, serializeDesign, serializeSupplier } from "../lib/serialize";

const METALS: Metal[] = ["gold", "silver", "platinum"];
const OCCASIONS = ["bridal", "festive", "daily", "gifting", "mens"];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseMaking(input: any, required: boolean) {
  if (input === undefined || input === null) {
    if (required) throw new errors.ValidationError("Enter the making charge.");
    return undefined;
  }
  const type = String(input.type ?? "");
  const value = Number(input.value);
  if (!MAKING_TYPES.includes(type as any)) throw new errors.ValidationError("Choose per gram, percent or fixed making.");
  if (!Number.isFinite(value) || value < 0) throw new errors.ValidationError("Making charge cannot be negative.");
  if (type === "percent" && value > 100) throw new errors.ValidationError("A making percentage above 100 looks like a typing slip.");
  return { type, value };
}

async function loadCategory(strapi: any, staff: any, id: unknown) {
  const categoryId = idOf(id);
  if (!categoryId) throw new errors.ValidationError("Choose a category.");
  const category = await strapi.db.query(CATEGORY).findOne({ where: { id: categoryId, ...orgWhere(staff) } });
  if (!category) throw new errors.ValidationError("That category does not exist.");
  return category;
}

export default ({ strapi }: { strapi: any }) => {
  const controller = {
  async listCategories(ctx: any) {
    const staff = staffOf(ctx);
    const rows = await strapi.db.query(CATEGORY).findMany({
      where: orgWhere(staff),
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    ctx.body = { data: rows.map((row: any) => ({ id: row.id, name: row.name, code: row.code ?? null, slug: row.slug })) };
  },

  async saveCategory(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, CATALOGUE_EDITOR_ROLES, "edit categories");
    const body = ctx.request.body ?? {};
    const name = text(body.name, 80);
    const code = text(body.code, 4) ? normaliseCode(body.code) : null;
    if (!name) throw new errors.ValidationError("Enter a category name.");
    if (!code || !/^[A-Z]{2,4}$/.test(code)) throw new errors.ValidationError("The code must be 2 to 4 letters, like NK.");

    const id = idOf(ctx.params.id);
    const clash = await strapi.db.query(CATEGORY).findOne({ where: { code, ...orgWhere(staff), ...(id ? { id: { $ne: id } } : {}) } });
    if (clash) throw new errors.ValidationError(`${clash.name} already uses the code ${code}.`);

    if (id) {
      const existing = await strapi.db.query(CATEGORY).findOne({ where: { id, ...orgWhere(staff) } });
      if (!existing) notFound("Category");
      await strapi.documents(CATEGORY).update({ documentId: existing.documentId, data: { name, code } });
    } else {
      let slug = slugify(name) || code.toLowerCase();
      if (await strapi.db.query(CATEGORY).findOne({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
      await strapi.documents(CATEGORY).create({
        data: { name, code, slug, sortOrder: 100, organization: staff.organization.documentId },
      });
    }
    return controller.listCategories(ctx);
  },

  async listCollections(ctx: any) {
    const staff = staffOf(ctx);
    const rows = await strapi.db.query(COLLECTION).findMany({ where: orgWhere(staff), orderBy: { name: "asc" } });
    ctx.body = { data: rows.map((row: any) => ({ id: row.id, name: row.name })) };
  },

  async listDesigns(ctx: any) {
    const staff = staffOf(ctx);
    const { page, pageSize } = paging(ctx.query, 40);
    const q = text(ctx.query.q, 80);
    const where: any = { ...orgWhere(staff) };
    if (idOf(ctx.query.categoryId)) where.category = { id: idOf(ctx.query.categoryId) };
    if (METALS.includes(ctx.query.metal)) where.metal = ctx.query.metal;
    if (ctx.query.active !== "all") where.isActive = { $ne: false };
    if (q) where.$or = [{ code: { $containsi: q } }, { name: { $containsi: q } }];

    const result = await strapi.db.query(DESIGN).findPage({
      where,
      page,
      pageSize,
      orderBy: { updatedAt: "desc" },
      populate: DESIGN_POPULATE,
    });

    // How many pieces of each design are in stock, for the catalogue list.
    const ids = result.results.map((design: any) => design.id);
    const counts = new Map<number, number>();
    if (ids.length) {
      const items = await strapi.db.query("api::item.item").findMany({
        where: { design: { id: { $in: ids } }, status: "in_stock", ...orgWhere(staff) },
        select: ["id"],
        populate: { design: { select: ["id"] } },
      });
      for (const item of items) counts.set(item.design.id, (counts.get(item.design.id) ?? 0) + 1);
    }

    ctx.body = {
      data: result.results.map((design: any) => ({ ...serializeDesign(design), inStock: counts.get(design.id) ?? 0 })),
      meta: { pagination: result.pagination },
    };
  },

  async getDesign(ctx: any) {
    const staff = staffOf(ctx);
    const design = await strapi.db.query(DESIGN).findOne({
      where: { id: idOf(ctx.params.id), ...orgWhere(staff) },
      populate: DESIGN_POPULATE,
    });
    if (!design) notFound("Design");
    ctx.body = { data: serializeDesign(design) };
  },

  async saveDesign(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, CATALOGUE_EDITOR_ROLES, "edit designs");
    const body = ctx.request.body ?? {};
    const id = idOf(ctx.params.id);
    const existing = id
      ? await strapi.db.query(DESIGN).findOne({ where: { id, ...orgWhere(staff) }, populate: { category: true } })
      : null;
    if (id && !existing) notFound("Design");

    const name = text(body.name, 120);
    if (!name) throw new errors.ValidationError("Enter the design name.");
    const metal = String(body.metal ?? existing?.metal ?? "");
    if (!METALS.includes(metal as Metal)) throw new errors.ValidationError("Choose gold, silver or platinum.");
    const defaultPurity = text(body.defaultPurity, 8);
    if (defaultPurity) {
      if (!PURITY_CODES.includes(defaultPurity)) throw new errors.ValidationError(`${defaultPurity} is not a purity the suite knows.`);
      if (metalForPurity(defaultPurity) !== metal) throw new errors.ValidationError(`${defaultPurity} is not a ${metal} purity.`);
    }
    const category = await loadCategory(strapi, staff, body.categoryId ?? existing?.category?.id);
    const occasion = OCCASIONS.includes(body.occasion) ? body.occasion : null;
    const makingCharge = parseMaking(body.making, !existing);

    let collection: any = null;
    if (idOf(body.collectionId)) {
      collection = await strapi.db.query(COLLECTION).findOne({ where: { id: idOf(body.collectionId), ...orgWhere(staff) } });
      if (!collection) throw new errors.ValidationError("That collection does not exist.");
    }

    let code = text(body.code, 32) ? normaliseCode(body.code) : existing?.code ?? null;
    if (!code) {
      if (!category.code) throw new errors.ValidationError(`Give the ${category.name} category a code first, or type a design number.`);
      code = formatDesignCode(category.code, await reserveSequence(strapi, `design:${staff.organization.id}:${category.code}`));
    }
    const clash = await strapi.db.query(DESIGN).findOne({ where: { code, ...orgWhere(staff), ...(id ? { id: { $ne: id } } : {}) } });
    if (clash) throw new errors.ValidationError(`Design number ${code} is already used by ${clash.name}.`);

    const imageIds = Array.isArray(body.imageIds) ? body.imageIds.map(idOf).filter(Boolean) : undefined;

    const data: any = {
      code,
      name,
      metal,
      defaultPurity,
      occasion,
      description: text(body.description, 4000),
      isOnline: body.isOnline === true,
      isActive: body.isActive !== false,
      category: category.documentId,
      collection: collection?.documentId ?? null,
      ...(makingCharge ? { making: makingCharge } : {}),
      ...(imageIds ? { images: imageIds } : {}),
    };

    const saved = existing
      ? await strapi.documents(DESIGN).update({ documentId: existing.documentId, data })
      : await strapi.documents(DESIGN).create({ data: { ...data, organization: staff.organization.documentId } });

    const design = await strapi.db.query(DESIGN).findOne({ where: { id: saved.id }, populate: DESIGN_POPULATE });
    ctx.status = existing ? 200 : 201;
    ctx.body = { data: serializeDesign(design) };
  },

  async listSuppliers(ctx: any) {
    const staff = staffOf(ctx);
    const where: any = { ...orgWhere(staff) };
    if (ctx.query.kind === "supplier" || ctx.query.kind === "karigar") where.kind = ctx.query.kind;
    if (ctx.query.active !== "all") where.isActive = { $ne: false };
    const rows = await strapi.db.query(SUPPLIER).findMany({ where, orderBy: { name: "asc" }, limit: 1000 });
    ctx.body = { data: rows.map(serializeSupplier) };
  },

  async saveSupplier(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, CATALOGUE_EDITOR_ROLES, "edit suppliers");
    const body = ctx.request.body ?? {};
    const name = text(body.name, 120);
    if (!name) throw new errors.ValidationError("Enter the name.");
    const kind = body.kind === "karigar" ? "karigar" : "supplier";
    const gstin = text(body.gstin, 15) ? normaliseCode(body.gstin) : null;
    if (gstin && !/^[0-9]{2}[A-Z0-9]{13}$/.test(gstin)) throw new errors.ValidationError("A GSTIN is 15 characters and starts with the state code.");

    const data = {
      name,
      kind,
      gstin,
      phone: text(body.phone, 20),
      city: text(body.city, 60),
      notes: text(body.notes, 1000),
      isActive: body.isActive !== false,
    };

    const id = idOf(ctx.params.id);
    let saved;
    if (id) {
      const existing = await strapi.db.query(SUPPLIER).findOne({ where: { id, ...orgWhere(staff) } });
      if (!existing) notFound("Supplier");
      saved = await strapi.documents(SUPPLIER).update({ documentId: existing.documentId, data });
    } else {
      saved = await strapi.documents(SUPPLIER).create({ data: { ...data, organization: staff.organization.documentId } });
    }
    ctx.status = id ? 200 : 201;
    ctx.body = { data: serializeSupplier(await strapi.db.query(SUPPLIER).findOne({ where: { id: saved.id } })) };
  },
  };
  return controller;
};
