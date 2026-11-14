import { errors } from "@strapi/utils";
import { defaultOrganizationSlug } from "../../../utils/constants";
import { rateLimiter } from "../../../utils/secrets";
import { priceOf } from "../../floor/controllers/floor";
import { latestRateCard } from "../../sales/lib/bill";
import { rules } from "../../sales/lib/common";
import { createEnquiry, serializeEnquiry } from "../../crm/controllers/enquiries";

const ORGANIZATION = "api::organization.organization";
const DESIGN = "api::design.design";
const ITEM = "api::item.item";

/** Pieces a website visitor can buy or reserve: on a tray or in a salesperson's hand. */
const FOR_SALE = ["in_stock", "with_staff"];
const NEW_FOR_DAYS = 45;

/** Website enquiries: at most five per address every ten minutes. */
const enquiryLimit = rateLimiter(5, 10 * 60 * 1000);

/** Uploaded files are served by the API; give the website a full address. */
function absolute(url: string | null | undefined) {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  const base = (process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 1337}`).replace(/\/$/, "");
  return `${base}${url}`;
}

function slugOf(design: any) {
  const name = String(design.name ?? "piece")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${name}-${String(design.code).toLowerCase()}`;
}

async function shop(strapi: any) {
  const organization = await strapi.db.query(ORGANIZATION).findOne({ where: { slug: defaultOrganizationSlug() } });
  if (!organization) throw new errors.NotFoundError("The shop is not set up yet.");
  const pseudoStaff = { organization } as any;
  const card = await latestRateCard(strapi, organization.id);
  return { organization, card, hallmark: rules(pseudoStaff).hallmarkCharge };
}

const DESIGN_POPULATE = {
  making: true,
  images: true,
  category: { select: ["id", "name", "slug", "code"] },
  collection: { select: ["id", "name", "slug"] },
};

const PIECE_POPULATE = { making: true, photos: true, design: { select: ["id"] }, branch: { select: ["id", "name"] } };

/** One design as the website shows it, priced from its pieces in stock. Never includes cost or HUIDs. */
function product(design: any, pieces: any[], context: { card: any; hallmark: number; sold: number }, withPieces = false) {
  const priced = pieces
    .map((piece) => ({ piece, pricing: context.card ? priceOf(piece, context.card, context.hallmark) : null }))
    .sort((a, b) => (a.pricing?.price ?? Infinity) - (b.pricing?.price ?? Infinity));
  const lead = priced[0];
  const prices = priced.map((entry) => entry.pricing?.price).filter((value): value is number => typeof value === "number");
  const weights = pieces.map((piece) => Number(piece.grossWeight));
  const images = [
    ...(design.images ?? []).map((image: any) => absolute(image.url)),
    ...pieces.flatMap((piece) => (piece.photos ?? []).map((photo: any) => absolute(photo.url))),
  ].filter((url, index, all): url is string => !!url && all.indexOf(url) === index);
  const createdAt = String(design.createdAt ?? "");
  return {
    id: design.id,
    slug: slugOf(design),
    code: design.code,
    name: design.name,
    description: design.description ?? null,
    metal: design.metal,
    purity: lead?.piece.purity ?? design.defaultPurity ?? null,
    category: design.category ? { name: design.category.name, slug: design.category.slug } : null,
    collection: design.collection ? { name: design.collection.name, slug: design.collection.slug } : null,
    occasion: design.occasion ?? null,
    images,
    inStock: pieces.length,
    priceFrom: prices.length ? Math.min(...prices) : null,
    priceTo: prices.length ? Math.max(...prices) : null,
    grossWeight: lead ? Number(lead.piece.grossWeight) : null,
    netWeight: lead ? Number(lead.piece.netWeight) : null,
    stoneWeight: lead ? Number(lead.piece.stoneWeight ?? 0) : null,
    weightFrom: weights.length ? Math.min(...weights) : null,
    weightTo: weights.length ? Math.max(...weights) : null,
    hallmarked: pieces.some((piece) => !!piece.huid),
    breakup: lead?.pricing
      ? {
          ratePerGram: lead.pricing.ratePerGram,
          metalValue: lead.pricing.metalValue,
          makingCharge: lead.pricing.makingCharge,
          stoneValue: lead.pricing.stoneValue,
          hallmark: lead.pricing.otherCharges,
          gst: lead.pricing.gst,
          total: lead.pricing.price,
        }
      : null,
    making: lead?.piece.making ? { type: lead.piece.making.type, value: Number(lead.piece.making.value) } : design.making ? { type: design.making.type, value: Number(design.making.value) } : null,
    sold: context.sold,
    isNew: createdAt ? Date.now() - Date.parse(createdAt) < NEW_FOR_DAYS * 86400000 : false,
    releasedAt: createdAt || null,
    ...(withPieces
      ? {
          pieces: priced.map(({ piece, pricing }) => ({
            tag: piece.tagNumber,
            purity: piece.purity,
            grossWeight: Number(piece.grossWeight),
            netWeight: Number(piece.netWeight),
            price: pricing?.price ?? null,
            photo: absolute(piece.photos?.[0]?.url),
            branch: piece.branch?.name ?? null,
          })),
        }
      : {}),
  };
}

async function load(strapi: any, organizationId: number, designWhere: Record<string, unknown> = {}) {
  const designs = await strapi.db.query(DESIGN).findMany({
    where: { organization: { id: organizationId }, isOnline: true, isActive: { $ne: false }, ...designWhere },
    populate: DESIGN_POPULATE,
    limit: 2000,
  });
  const ids = designs.map((design: any) => design.id);
  const [pieces, sold] = ids.length
    ? await Promise.all([
        strapi.db.query(ITEM).findMany({ where: { design: { id: { $in: ids } }, status: { $in: FOR_SALE } }, populate: PIECE_POPULATE, limit: 20000 }),
        strapi.db.query(ITEM).findMany({ where: { design: { id: { $in: ids } }, status: "sold" }, select: ["id"], populate: { design: { select: ["id"] } }, limit: 50000 }),
      ])
    : [[], []];
  const byDesign = new Map<number, any[]>();
  for (const piece of pieces) {
    const list = byDesign.get(piece.design?.id) ?? [];
    list.push(piece);
    byDesign.set(piece.design?.id, list);
  }
  const soldBy = new Map<number, number>();
  for (const piece of sold) soldBy.set(piece.design?.id, (soldBy.get(piece.design?.id) ?? 0) + 1);
  return { designs, byDesign, soldBy };
}

export default ({ strapi }: { strapi: any }) => ({
  /** Every design the shop has put online, with live prices. Cached briefly by the website. */
  async products(ctx: any) {
    const { organization, card, hallmark } = await shop(strapi);
    const { designs, byDesign, soldBy } = await load(strapi, organization.id);
    ctx.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    ctx.body = {
      data: designs.map((design: any) => product(design, byDesign.get(design.id) ?? [], { card, hallmark, sold: soldBy.get(design.id) ?? 0 })),
      meta: { rateCard: card ? { effectiveFrom: card.effectiveFrom } : null },
    };
  },

  /** One online design with each piece in stock, looked up by the slug the website uses. */
  async product(ctx: any) {
    const slug = String(ctx.params.slug ?? "").toLowerCase();
    const code = slug.split("-").slice(-2).join("-");
    const { organization, card, hallmark } = await shop(strapi);
    // Design numbers look like ER-0001 or DEMO-01; the slug ends with the number.
    const candidates = await strapi.db.query(DESIGN).findMany({
      where: { organization: { id: organization.id }, isOnline: true, isActive: { $ne: false }, code: { $containsi: code } },
      select: ["id", "code", "name"],
      limit: 20,
    });
    const match = candidates.find((design: any) => slugOf(design) === slug);
    if (!match) throw new errors.NotFoundError("This piece is not on the website.");
    const { designs, byDesign, soldBy } = await load(strapi, organization.id, { id: match.id });
    const design = designs[0];
    ctx.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    ctx.body = { data: product(design, byDesign.get(design.id) ?? [], { card, hallmark, sold: soldBy.get(design.id) ?? 0 }, true) };
  },

  /**
   * A visitor asks to reserve or enquire about pieces. Lands in the CRM as a new
   * enquiry for the team to call back. Nothing is charged online.
   */
  async enquire(ctx: any) {
    const body = ctx.request.body ?? {};
    // Bots fill every field, people never see this one.
    if (typeof body.website === "string" && body.website.trim()) {
      ctx.status = 201;
      ctx.body = { data: { number: "ENQ-000000" } };
      return;
    }
    if (!enquiryLimit(ctx.request.ip ?? "unknown")) throw new errors.RateLimitError("Too many requests. Please call the shop or try again in a few minutes.");
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    const phone = String(body.phone ?? "").replace(/\D/g, "").slice(-10);
    if (!name) throw new errors.ValidationError("Please enter your name.");
    if (phone.length !== 10) throw new errors.ValidationError("Please enter a 10-digit mobile number so we can call you back.");
    const items = (Array.isArray(body.items) ? body.items : []).slice(0, 20).map((item: any) => ({
      code: typeof item?.code === "string" ? item.code.slice(0, 32) : undefined,
      name: String(item?.name ?? "Piece").slice(0, 120),
      price: Number.isFinite(Number(item?.price)) ? Number(item.price) : null,
      quantity: Math.min(Math.max(Number(item?.quantity) || 1, 1), 10),
      url: typeof item?.url === "string" ? item.url.slice(0, 300) : null,
    }));
    const visitOn = typeof body.visitOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.visitOn) ? body.visitOn : null;
    const { organization } = await shop(strapi);
    const enquiry = await createEnquiry(strapi, organization, {
      name,
      phone,
      email: typeof body.email === "string" && body.email.includes("@") ? body.email.trim().slice(0, 120) : null,
      message: typeof body.message === "string" ? body.message.trim().slice(0, 2000) || null : null,
      source: "website",
      items,
      visitOn,
    });
    ctx.status = 201;
    ctx.body = { data: { number: serializeEnquiry(enquiry).number } };
  },
});
