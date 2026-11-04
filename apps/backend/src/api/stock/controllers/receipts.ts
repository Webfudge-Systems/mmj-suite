import { errors } from "@strapi/utils";
import { STOCK_EDITOR_ROLES } from "../../../utils/constants";
import { reserveSequence } from "../../../utils/sequence";
import { formatDesignCode, metalForPurity, normaliseCode, StockRuleError } from "../../../utils/stock";
import { canSeeCost, requireBranch, type Staff } from "../../../utils/staff";
import { CATEGORY, DESIGN, ITEM, LOCATION, RECEIPT, SUPPLIER, idOf, notFound, orgWhere, paging, requireRole, staffOf, text } from "../lib/common";
import { assertUniqueCodes, createPieces, parsePiece, type PieceInput } from "../lib/items";
import { ITEM_POPULATE, serializeItem } from "../lib/serialize";

const MAX_LINES = 500;
const SOURCES = ["purchase", "karigar", "opening_stock"];

function serializeReceipt(receipt: any, items?: any[], cost = false) {
  return {
    id: receipt.id,
    number: receipt.number,
    source: receipt.source,
    billNumber: receipt.billNumber ?? null,
    billDate: receipt.billDate ?? null,
    notes: receipt.notes ?? null,
    createdAt: receipt.createdAt,
    branch: receipt.branch ? { id: receipt.branch.id, code: receipt.branch.code, name: receipt.branch.name } : null,
    supplier: receipt.supplier ? { id: receipt.supplier.id, name: receipt.supplier.name, kind: receipt.supplier.kind } : null,
    receivedBy: receipt.receivedBy ? receipt.receivedBy.fullName || receipt.receivedBy.username : null,
    ...(items ? { items: items.map((item) => serializeItem(item, { cost })) } : {}),
  };
}

const RECEIPT_POPULATE = {
  branch: { select: ["id", "code", "name"] },
  supplier: { select: ["id", "name", "kind"] },
  receivedBy: { select: ["id", "fullName", "username"] },
};

async function newReceipt(strapi: any, staff: Staff, data: any) {
  const number = `GRN-${String(await reserveSequence(strapi, `receipt:${staff.organization.id}`)).padStart(6, "0")}`;
  const receipt = await strapi.documents(RECEIPT).create({
    data: { ...data, number, receivedBy: staff.documentId, organization: staff.organization.documentId },
  });
  return { id: receipt.id, documentId: receipt.documentId, number };
}

/** Turns StockRuleErrors from one line into a validation error that names the line. */
function parseLines(lines: any[]): PieceInput[] {
  return lines.map((line, index) => {
    try {
      return parsePiece(line);
    } catch (error) {
      if (error instanceof StockRuleError || error instanceof errors.ValidationError) {
        throw new errors.ValidationError(`Line ${index + 1}: ${(error as Error).message}`);
      }
      throw error;
    }
  });
}

export default ({ strapi }: { strapi: any }) => ({
  async list(ctx: any) {
    const staff = staffOf(ctx);
    const { page, pageSize } = paging(ctx.query, 30);
    const where: any = { ...orgWhere(staff) };
    if (idOf(ctx.query.branchId)) where.branch = { id: idOf(ctx.query.branchId) };
    const result = await strapi.db.query(RECEIPT).findPage({ where, page, pageSize, orderBy: { createdAt: "desc" }, populate: RECEIPT_POPULATE });

    const counts = new Map<number, number>();
    for (const receipt of result.results) {
      counts.set(receipt.id, await strapi.db.query(ITEM).count({ where: { receipt: { id: receipt.id } } }));
    }
    ctx.body = {
      data: result.results.map((receipt: any) => ({ ...serializeReceipt(receipt), pieces: counts.get(receipt.id) ?? 0 })),
      meta: { pagination: result.pagination },
    };
  },

  async get(ctx: any) {
    const staff = staffOf(ctx);
    const receipt = await strapi.db.query(RECEIPT).findOne({ where: { id: idOf(ctx.params.id), ...orgWhere(staff) }, populate: RECEIPT_POPULATE });
    if (!receipt) notFound("Receipt");
    const items = await strapi.db.query(ITEM).findMany({ where: { receipt: { id: receipt.id } }, orderBy: { id: "asc" }, populate: ITEM_POPULATE });
    ctx.body = { data: serializeReceipt(receipt, items, canSeeCost(staff)) };
  },

  /** Receives goods: one supplier bill or karigar delivery, many pieces. */
  async create(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, STOCK_EDITOR_ROLES, "receive stock");
    const body = ctx.request.body ?? {};
    const branch = await requireBranch(strapi, staff, body.branchId);
    const source = SOURCES.includes(body.source) ? body.source : "purchase";
    if (!Array.isArray(body.lines) || body.lines.length === 0) throw new errors.ValidationError("Add at least one piece.");
    if (body.lines.length > MAX_LINES) throw new errors.ValidationError(`Receive at most ${MAX_LINES} pieces at a time.`);

    let supplier: any = null;
    if (idOf(body.supplierId)) {
      supplier = await strapi.db.query(SUPPLIER).findOne({ where: { id: idOf(body.supplierId), ...orgWhere(staff) } });
      if (!supplier) throw new errors.ValidationError("That supplier does not exist.");
    } else if (source !== "opening_stock") {
      throw new errors.ValidationError(source === "karigar" ? "Choose the karigar." : "Choose the supplier.");
    }

    const pieces = parseLines(body.lines);
    if (!canSeeCost(staff) && pieces.some((piece) => piece.costPrice !== null)) {
      throw new errors.ForbiddenError("Your role cannot enter cost prices.");
    }
    await assertUniqueCodes(strapi, staff, pieces);

    const billDate = text(body.billDate, 10);
    if (billDate && !/^\d{4}-\d{2}-\d{2}$/.test(billDate)) throw new errors.ValidationError("Enter the bill date as a date.");

    const result = await strapi.db.transaction(async () => {
      const receipt = await newReceipt(strapi, staff, {
        source,
        billNumber: text(body.billNumber, 40),
        billDate,
        notes: text(body.notes, 1000),
        supplier: supplier?.documentId ?? null,
        branch: branch.documentId,
      });
      const created = await createPieces(strapi, staff, pieces, {
        branch,
        receipt,
        supplier,
        movementType: source === "opening_stock" ? "imported" : "received",
      });
      return { receipt, created };
    });

    ctx.status = 201;
    ctx.body = { data: { id: result.receipt.id, number: result.receipt.number, pieces: result.created } };
  },

  /**
   * Loads opening stock exported from the old software, in batches. Every row
   * of a batch is checked before anything is saved; a batch saves in full or
   * not at all. Designs and trays are matched by code, and missing designs are
   * created. The first batch starts a receipt; later batches pass its id.
   */
  async importRows(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, STOCK_EDITOR_ROLES, "import stock");
    const body = ctx.request.body ?? {};
    const branch = await requireBranch(strapi, staff, body.branchId);
    const rows: any[] = Array.isArray(body.rows) ? body.rows : [];
    if (!rows.length) throw new errors.ValidationError("The file has no rows.");
    if (rows.length > MAX_LINES) throw new errors.ValidationError(`Send at most ${MAX_LINES} rows per batch.`);
    const firstRow = Number(body.firstRow) || 1;

    const categories = await strapi.db.query(CATEGORY).findMany({ where: orgWhere(staff) });
    const categoryFor = (value: string) => {
      const wanted = value.trim().toLowerCase();
      return categories.find((category: any) => category.code?.toLowerCase() === wanted || category.name.toLowerCase() === wanted || category.slug === wanted);
    };

    const locationCodes = [...new Set(rows.map((row) => text(row.location, 40)).filter(Boolean).map((code) => normaliseCode(code!)))];
    const locations = locationCodes.length
      ? await strapi.db.query(LOCATION).findMany({
          where: { ...orgWhere(staff), branch: { id: branch.id }, $or: [{ fullCode: { $in: locationCodes } }, { code: { $in: locationCodes } }] },
        })
      : [];
    const locationFor = (code: string) =>
      locations.find((location: any) => location.fullCode === code) ?? locations.find((location: any) => location.code === code);

    const designCodes = [...new Set(rows.map((row) => text(row.designCode, 32)).filter(Boolean).map((code) => normaliseCode(code!)))];
    const existingDesigns = designCodes.length
      ? await strapi.db.query(DESIGN).findMany({ where: { ...orgWhere(staff), code: { $in: designCodes } } })
      : [];
    const designByCode = new Map<string, any>(existingDesigns.map((design: any) => [design.code, design]));

    const problems: { row: number; message: string }[] = [];
    const plans: { row: number; designCode: string | null; newDesign?: any; piece: any }[] = [];

    rows.forEach((row, index) => {
      const rowNumber = firstRow + index;
      try {
        const purity = String(row.purity ?? "").toUpperCase();
        const metal = metalForPurity(purity);
        const designCode = text(row.designCode, 32) ? normaliseCode(row.designCode) : null;
        let newDesign: any;
        if (!designCode || !designByCode.has(designCode)) {
          const category = text(row.category, 40) ? categoryFor(row.category) : null;
          if (!category) throw new StockRuleError(`category "${row.category ?? ""}" is not one of yours. Use a code like NK or a name like Necklaces.`);
          newDesign = { category, metal, name: text(row.designName, 120) ?? designCode ?? `${category.name} ${purity}` };
        }
        let locationId = null;
        if (text(row.location, 40)) {
          const location = locationFor(normaliseCode(row.location));
          if (!location) throw new StockRuleError(`tray ${row.location} does not exist at ${branch.name}. Create it in Locations first.`);
          locationId = location.id;
        }
        const making = row.makingValue === undefined || row.makingValue === "" ? undefined : { type: row.makingType || "per_gram", value: row.makingValue };
        const piece = parsePiece({ ...row, purity, designId: 1, locationId, making });
        plans.push({ row: rowNumber, designCode, newDesign, piece });
      } catch (error) {
        problems.push({ row: rowNumber, message: (error as Error).message });
      }
    });

    if (!problems.length) {
      try {
        await assertUniqueCodes(strapi, staff, plans.map((plan) => plan.piece));
      } catch (error) {
        problems.push({ row: 0, message: (error as Error).message });
      }
    }
    if (problems.length) {
      ctx.status = 422;
      ctx.body = { data: null, error: { status: 422, name: "ImportError", message: "Some rows need fixing. Nothing was saved.", details: { problems } } };
      return;
    }

    // A check run: the file is read and validated, nothing is written.
    if (body.dryRun === true) {
      ctx.body = { data: { ok: true, rows: plans.length, newDesigns: plans.filter((plan) => plan.newDesign).length } };
      return;
    }

    const result = await strapi.db.transaction(async () => {
      let receipt: any;
      if (idOf(body.receiptId)) {
        const existing = await strapi.db.query(RECEIPT).findOne({ where: { id: idOf(body.receiptId), source: "opening_stock", ...orgWhere(staff) } });
        if (!existing) throw new errors.ValidationError("That import receipt does not exist.");
        receipt = { id: existing.id, documentId: existing.documentId, number: existing.number };
      } else {
        receipt = await newReceipt(strapi, staff, {
          source: "opening_stock",
          notes: text(body.fileName, 200) ? `Imported from ${text(body.fileName, 200)}` : "Opening stock import",
          branch: branch.documentId,
        });
      }

      // Create designs the old software knew but the suite does not, once per code.
      const madeHere = new Map<string, any>();
      for (const plan of plans) {
        if (!plan.newDesign) {
          plan.piece.designId = designByCode.get(plan.designCode!).id;
          continue;
        }
        const key = plan.designCode ?? `${plan.newDesign.category.id}:${plan.newDesign.metal}:${plan.newDesign.name}`;
        let design = madeHere.get(key);
        if (!design) {
          const code =
            plan.designCode ??
            formatDesignCode(plan.newDesign.category.code ?? "XX", await reserveSequence(strapi, `design:${staff.organization.id}:${plan.newDesign.category.code ?? "XX"}`));
          design = await strapi.documents(DESIGN).create({
            data: {
              code,
              name: plan.newDesign.name,
              metal: plan.newDesign.metal,
              defaultPurity: plan.piece.purity,
              making: plan.piece.making ?? { type: "per_gram", value: 0 },
              category: plan.newDesign.category.documentId,
              isActive: true,
              organization: staff.organization.documentId,
            },
          });
          madeHere.set(key, design);
        }
        plan.piece.designId = design.id;
      }

      const created = await createPieces(strapi, staff, plans.map((plan) => plan.piece), {
        branch,
        receipt,
        supplier: null,
        movementType: "imported",
      });
      return { receipt, created, designsCreated: madeHere.size };
    });

    ctx.status = 201;
    ctx.body = {
      data: { receiptId: result.receipt.id, number: result.receipt.number, imported: result.created.length, designsCreated: result.designsCreated },
    };
  },
});
