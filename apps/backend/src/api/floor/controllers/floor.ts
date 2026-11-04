import { errors } from "@strapi/utils";
import { priceLine, roundBill } from "../../../utils/pricing";
import { normaliseCode } from "../../../utils/stock";
import { requireBranch, type Staff } from "../../../utils/staff";
import { DESIGN_POPULATE, serializeDesign } from "../../stock/lib/serialize";
import { staffOf } from "../../stock/lib/common";
import { latestRateCard } from "../../sales/lib/bill";
import { person, rules } from "../../sales/lib/common";
import { changePiece } from "../../sales/lib/pieces";

const ITEM = "api::item.item";
const DESIGN = "api::design.design";

/** Pieces a customer can see on the tablet: in a tray, in someone's hand, or on an estimate. */
const ON_FLOOR = ["in_stock", "with_staff", "reserved"];

type Card = NonNullable<Awaited<ReturnType<typeof latestRateCard>>>;

/** Today's price of one piece, as the counter would bill it before any discount. Never includes cost. */
function priceOf(item: any, card: Card, hallmark: number) {
  const rate = card.rates.find((line: { purity: string }) => line.purity === item.purity)?.ratePerGram;
  if (!rate || !item.making) return null;
  const line = priceLine({
    netWeight: Number(item.netWeight),
    ratePerGram: rate,
    making: { type: item.making.type, value: Number(item.making.value) },
    stoneValue: Number(item.stoneValue ?? 0),
    otherCharges: item.huid ? hallmark : 0,
  });
  return { ...line, ratePerGram: rate, price: roundBill(line.total).rounded };
}

function piece(item: any, card: Card | null, hallmark: number) {
  return {
    id: item.id,
    tagNumber: item.tagNumber,
    huid: item.huid ?? null,
    purity: item.purity,
    grossWeight: Number(item.grossWeight),
    stoneWeight: Number(item.stoneWeight ?? 0),
    netWeight: Number(item.netWeight),
    status: item.status,
    location: item.location ? { id: item.location.id, fullCode: item.location.fullCode, code: item.location.code, name: item.location.name ?? null, parent: item.location.parent?.code ?? null } : null,
    slot: item.slot ?? null,
    heldBy: item.heldBy ? { id: item.heldBy.id, name: person(item.heldBy) } : null,
    heldSince: item.heldSince ?? null,
    pricing: card ? priceOf(item, card, hallmark) : null,
  };
}

const PIECE_POPULATE = {
  making: true,
  location: { select: ["id", "code", "fullCode", "name"], populate: { parent: { select: ["id", "code"] } } },
  heldBy: { select: ["id", "fullName", "username"] },
};

async function loadPiece(strapi: any, staff: Staff, body: any) {
  const org = { organization: { id: staff.organization.id } };
  const where = body?.itemId
    ? { id: Number(body.itemId), ...org }
    : { ...org, $or: [{ tagNumber: normaliseCode(String(body?.code ?? "")) }, { legacyTag: normaliseCode(String(body?.code ?? "")) }, { huid: normaliseCode(String(body?.code ?? "")) }] };
  const item = await strapi.db.query(ITEM).findOne({ where, populate: { ...PIECE_POPULATE, branch: { select: ["id", "name"] } } });
  if (!item) throw new errors.NotFoundError("No piece matches that tag.");
  await requireBranch(strapi, staff, item.branch.id);
  return item;
}

export default ({ strapi }: { strapi: any }) => ({
  /**
   * Designs with pieces on the floor, for the tablet's browse screen. Filters
   * on today's prices and weights, so they are worked out here per piece.
   */
  async designs(ctx: any) {
    const staff = staffOf(ctx);
    const branch = await requireBranch(strapi, staff, ctx.query.branchId);
    const card = await latestRateCard(strapi, staff.organization.id);
    const hallmark = rules(staff).hallmarkCharge;
    const q = typeof ctx.query.q === "string" ? ctx.query.q.trim() : "";
    const number = (value: unknown) => (value === undefined || value === "" ? null : Number(value));
    const [minWeight, maxWeight, minPrice, maxPrice] = [ctx.query.minWeight, ctx.query.maxWeight, ctx.query.minPrice, ctx.query.maxPrice].map(number);
    const everywhere = ctx.query.scope === "all";

    const where: any = { organization: { id: staff.organization.id }, status: { $in: ON_FLOOR } };
    if (!everywhere) where.branch = { id: branch.id };
    if (["gold", "silver", "platinum"].includes(ctx.query.metal)) where.metal = ctx.query.metal;
    if (typeof ctx.query.purity === "string" && ctx.query.purity) where.purity = ctx.query.purity.toUpperCase();
    if (Number(ctx.query.categoryId)) where.design = { category: { id: Number(ctx.query.categoryId) } };
    if (["bridal", "festive", "daily", "gifting", "mens"].includes(ctx.query.occasion)) where.design = { ...(where.design ?? {}), occasion: ctx.query.occasion };
    if (q) {
      where.$or = [{ design: { name: { $containsi: q } } }, { design: { code: { $containsi: q } } }, { tagNumber: { $containsi: normaliseCode(q) } }];
    }

    const items = await strapi.db.query(ITEM).findMany({
      where,
      select: ["id", "purity", "netWeight", "grossWeight", "stoneValue", "huid", "status", "receivedAt"],
      populate: { making: true, design: { select: ["id"] }, branch: { select: ["id"] } },
    });

    const groups = new Map<number, { here: number; elsewhere: number; minPrice: number; maxPrice: number; minWeight: number; maxWeight: number; newest: string }>();
    for (const item of items) {
      if (!item.design) continue;
      const weight = Number(item.grossWeight);
      if (minWeight !== null && weight < minWeight) continue;
      if (maxWeight !== null && weight > maxWeight) continue;
      const price = card ? priceOf(item, card, hallmark)?.price ?? null : null;
      if ((minPrice !== null || maxPrice !== null) && price === null) continue;
      if (minPrice !== null && price! < minPrice) continue;
      if (maxPrice !== null && price! > maxPrice) continue;
      const group = groups.get(item.design.id) ?? { here: 0, elsewhere: 0, minPrice: Infinity, maxPrice: 0, minWeight: Infinity, maxWeight: 0, newest: "" };
      if (item.branch?.id === branch.id) group.here += 1;
      else group.elsewhere += 1;
      if (price !== null) {
        group.minPrice = Math.min(group.minPrice, price);
        group.maxPrice = Math.max(group.maxPrice, price);
      }
      group.minWeight = Math.min(group.minWeight, weight);
      group.maxWeight = Math.max(group.maxWeight, weight);
      if ((item.receivedAt ?? "") > group.newest) group.newest = item.receivedAt ?? "";
      groups.set(item.design.id, group);
    }

    const sort = ctx.query.sort === "price_asc" || ctx.query.sort === "price_desc" ? ctx.query.sort : "newest";
    const ordered = [...groups.entries()].sort(([, a], [, b]) =>
      sort === "price_asc" ? a.minPrice - b.minPrice : sort === "price_desc" ? b.maxPrice - a.maxPrice : b.newest.localeCompare(a.newest),
    );
    const page = Math.max(Number(ctx.query.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(ctx.query.pageSize) || 24, 1), 60);
    const slice = ordered.slice((page - 1) * pageSize, page * pageSize);
    const designs = slice.length
      ? await strapi.db.query(DESIGN).findMany({ where: { id: { $in: slice.map(([id]) => id) } }, populate: DESIGN_POPULATE })
      : [];
    const byId = new Map(designs.map((design: any) => [design.id, design]));

    ctx.body = {
      data: slice
        .filter(([id]) => byId.has(id))
        .map(([id, group]) => {
          const design = serializeDesign(byId.get(id));
          return {
            id: design.id,
            code: design.code,
            name: design.name,
            metal: design.metal,
            category: design.category,
            occasion: design.occasion,
            image: design.images[0] ?? null,
            here: group.here,
            elsewhere: group.elsewhere,
            priceFrom: Number.isFinite(group.minPrice) ? group.minPrice : null,
            priceTo: group.maxPrice || null,
            weightFrom: group.minWeight,
            weightTo: group.maxWeight,
          };
        }),
      meta: {
        pagination: { page, pageSize, total: ordered.length, pageCount: Math.max(1, Math.ceil(ordered.length / pageSize)) },
        rateCard: card ? { id: card.id, effectiveFrom: card.effectiveFrom } : null,
      },
    };
  },

  /** A design with every piece at this branch, where each one is, and its price today. */
  async design(ctx: any) {
    const staff = staffOf(ctx);
    const branch = await requireBranch(strapi, staff, ctx.query.branchId);
    const design = await strapi.db.query(DESIGN).findOne({ where: { id: Number(ctx.params.id), organization: { id: staff.organization.id } }, populate: DESIGN_POPULATE });
    if (!design) throw new errors.NotFoundError("Design not found.");
    const card = await latestRateCard(strapi, staff.organization.id);
    const hallmark = rules(staff).hallmarkCharge;

    const here = await strapi.db.query(ITEM).findMany({
      where: { design: { id: design.id }, branch: { id: branch.id }, status: { $in: ON_FLOOR } },
      orderBy: { grossWeight: "asc" },
      populate: PIECE_POPULATE,
    });
    const elsewhere = await strapi.db.query(ITEM).findMany({
      where: { design: { id: design.id }, branch: { id: { $ne: branch.id } }, status: { $in: ["in_stock"] }, organization: { id: staff.organization.id } },
      select: ["id", "grossWeight"],
      populate: { branch: { select: ["id", "name", "code"] } },
    });
    const other = new Map<number, { branch: { id: number; name: string; code: string }; pieces: number }>();
    for (const item of elsewhere) {
      const entry = other.get(item.branch.id) ?? { branch: { id: item.branch.id, name: item.branch.name, code: item.branch.code }, pieces: 0 };
      entry.pieces += 1;
      other.set(item.branch.id, entry);
    }

    ctx.body = {
      data: {
        ...serializeDesign(design),
        pieces: here.map((item: any) => piece(item, card, hallmark)),
        otherBranches: [...other.values()],
        rateCard: card ? { id: card.id, effectiveFrom: card.effectiveFrom } : null,
      },
    };
  },

  /** Marks a piece as out of its tray and in this salesperson's hands. */
  async pick(ctx: any) {
    const staff = staffOf(ctx);
    const item = await loadPiece(strapi, staff, ctx.request.body);
    if (item.status === "with_staff" && item.heldBy?.id === staff.id) {
      ctx.body = { data: piece(item, null, 0) };
      return;
    }
    if (item.status === "with_staff") throw new errors.ValidationError(`${item.tagNumber} is already with ${person(item.heldBy)}.`);
    if (item.status === "reserved") throw new errors.ValidationError(`${item.tagNumber} is on an estimate at the counter.`);
    if (item.status !== "in_stock") throw new errors.ValidationError(`${item.tagNumber} is ${item.status.replace("_", " ")}.`);
    await strapi.db.transaction(() => changePiece(strapi, staff, item, { status: "with_staff", type: "picked", heldBy: staff.id }));
    const saved = await strapi.db.query(ITEM).findOne({ where: { id: item.id }, populate: PIECE_POPULATE });
    ctx.body = { data: piece(saved, null, 0) };
  },

  /** Puts a piece back in its tray. Anyone can, since whoever is holding it does the putting back. */
  async putBack(ctx: any) {
    const staff = staffOf(ctx);
    const item = await loadPiece(strapi, staff, ctx.request.body);
    if (item.status === "in_stock") {
      ctx.body = { data: piece(item, null, 0) };
      return;
    }
    if (item.status === "reserved") throw new errors.ValidationError(`${item.tagNumber} is on an estimate. Take it off the estimate first.`);
    if (item.status !== "with_staff") throw new errors.ValidationError(`${item.tagNumber} is ${item.status.replace("_", " ")}.`);
    await strapi.db.transaction(() =>
      changePiece(strapi, staff, item, { status: "in_stock", type: "put_back", heldBy: null, note: item.heldBy && item.heldBy.id !== staff.id ? `Held by ${person(item.heldBy)}` : null }),
    );
    const saved = await strapi.db.query(ITEM).findOne({ where: { id: item.id }, populate: PIECE_POPULATE });
    ctx.body = { data: piece(saved, null, 0) };
  },

  /** Pieces this salesperson is holding or has on an open estimate. */
  async held(ctx: any) {
    const staff = staffOf(ctx);
    const card = await latestRateCard(strapi, staff.organization.id);
    const items = await strapi.db.query(ITEM).findMany({
      where: { heldBy: { id: staff.id }, status: { $in: ["with_staff", "reserved"] } },
      orderBy: { heldSince: "asc" },
      populate: { ...PIECE_POPULATE, design: { select: ["id", "code", "name"] } },
    });
    ctx.body = {
      data: items.map((item: any) => ({ ...piece(item, card, rules(staff).hallmarkCharge), design: item.design ? { id: item.design.id, code: item.design.code, name: item.design.name } : null })),
    };
  },
});
