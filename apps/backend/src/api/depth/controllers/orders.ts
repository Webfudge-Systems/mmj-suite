import { errors } from "@strapi/utils";
import { toPaise, toRupees } from "../../../utils/pricing";
import { requireBranch } from "../../../utils/staff";
import { imageIds, staffOf } from "../../stock/lib/common";
import { serializeImage } from "../../stock/lib/serialize";
import { CUSTOMER, cashTakenToday, nextNumber, parsePayments, rules, sumPaise } from "../../sales/lib/common";
import { COUNTER_ROLES, MONEY_ROLES, SERVICE_ORDER, isoDate, logEntry, money, org, person, requireRole, round3, text } from "../lib/common";

const SUPPLIER = "api::supplier.supplier";
const BOOKING = "api::booking.booking";
const STATUSES = ["received", "in_work", "ready", "delivered", "cancelled"] as const;
const STATUS_WORDS: Record<string, string> = { received: "Received", in_work: "With the karigar", ready: "Ready to collect", delivered: "Delivered", cancelled: "Cancelled" };

const POPULATE = {
  photos: true,
  customer: { select: ["id", "name", "phone"] },
  karigar: { select: ["id", "name", "phone"] },
  booking: { select: ["id", "number", "balance"] },
  branch: { select: ["id", "name", "code"] },
  by: { select: ["id", "fullName", "username"] },
};

type Paid = { mode: string; amount: number; reference: string | null; at: string; by: string | null };

function serialize(order: any) {
  const payments: Paid[] = Array.isArray(order.payments) ? order.payments : [];
  const paid = Number(order.paidTotal ?? 0);
  const charge = order.charge === null || order.charge === undefined ? null : Number(order.charge);
  const first = order.customer?.name?.replace(/^Demo\s*[–-]\s*/, "").split(" ")[0] ?? "";
  return {
    id: order.id,
    number: order.number,
    kind: order.kind,
    status: order.status,
    description: order.description,
    itemDescription: order.itemDescription ?? null,
    purity: order.purity ?? null,
    weightIn: order.weightIn === null || order.weightIn === undefined ? null : Number(order.weightIn),
    weightOut: order.weightOut === null || order.weightOut === undefined ? null : Number(order.weightOut),
    estimate: order.estimate === null || order.estimate === undefined ? null : Number(order.estimate),
    charge,
    paidTotal: paid,
    balanceDue: charge === null ? null : Math.max(0, toRupees(toPaise(charge) - toPaise(paid))),
    payments,
    dueOn: order.dueOn ?? null,
    deliveredAt: order.deliveredAt ?? null,
    log: Array.isArray(order.log) ? order.log : [],
    photos: (order.photos ?? []).map(serializeImage),
    customer: order.customer ? { id: order.customer.id, name: order.customer.name, phone: order.customer.phone } : null,
    karigar: order.karigar ? { id: order.karigar.id, name: order.karigar.name } : null,
    booking: order.booking ? { id: order.booking.id, number: order.booking.number, balance: Number(order.booking.balance) } : null,
    branch: order.branch ? { id: order.branch.id, name: order.branch.name, code: order.branch.code } : null,
    by: person(order.by),
    whatsapp:
      order.customer && order.status === "ready"
        ? `https://wa.me/91${String(order.customer.phone).replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(
            `Namaste ${first}, your ${order.kind === "repair" ? "repair" : "order"} ${order.number} is ready to collect at Mukund Maid Jewellers.${charge !== null && charge > paid ? ` Balance due: ₹${toRupees(toPaise(charge) - toPaise(paid))}.` : ""}`,
          )}`
        : null,
    createdAt: order.createdAt,
  };
}

async function load(strapi: any, staff: any, id: unknown) {
  const order = await strapi.db.query(SERVICE_ORDER).findOne({ where: { id: Number(id), ...org(staff) }, populate: POPULATE });
  if (!order) throw new errors.NotFoundError("Order not found.");
  return order;
}

/** Checks payments against the daily cash limit and stamps them with who took them and when. */
async function takePayments(strapi: any, staff: any, customerId: number, raw: unknown): Promise<{ list: Paid[]; total: number }> {
  const payments = parsePayments(raw, { allowEmpty: true });
  if (!payments.length) return { list: [], total: 0 };
  if (!MONEY_ROLES.includes(staff.staffRole)) throw new errors.ForbiddenError("Only the counter can take money.");
  const cash = toRupees(sumPaise(payments.filter((payment) => payment.mode === "cash").map((payment) => payment.amount)));
  const cashLeft = Math.max(0, toRupees(toPaise(rules(staff).cashReceiptLimit) - 1 - toPaise(await cashTakenToday(strapi, staff, customerId))));
  if (cash > cashLeft) throw new errors.ValidationError(`At most ₹${cashLeft} more can be taken in cash from this customer today.`, { code: "CASH_LIMIT" });
  const at = new Date().toISOString();
  const by = staff.fullName || staff.username;
  return { list: payments.map((payment) => ({ ...payment, at, by })), total: toRupees(sumPaise(payments.map((payment) => payment.amount))) };
}

export default ({ strapi }: { strapi: any }) => ({
  async list(ctx: any) {
    const staff = staffOf(ctx);
    const where: any = { ...org(staff) };
    if (ctx.query.kind === "repair" || ctx.query.kind === "custom") where.kind = ctx.query.kind;
    if (STATUSES.includes(ctx.query.status)) where.status = ctx.query.status;
    else if (ctx.query.status === "open") where.status = { $in: ["received", "in_work", "ready"] };
    const q = text(ctx.query.q, 60);
    if (q) where.$or = [{ number: { $containsi: q } }, { customer: { name: { $containsi: q } } }, { customer: { phone: { $contains: q.replace(/\D/g, "") || q } } }];
    if (Number(ctx.query.customerId)) where.customer = { id: Number(ctx.query.customerId) };
    const orders = await strapi.db.query(SERVICE_ORDER).findMany({ where, orderBy: { createdAt: "desc" }, populate: POPULATE, limit: 300 });
    ctx.body = { data: orders.map(serialize) };
  },

  async get(ctx: any) {
    const staff = staffOf(ctx);
    ctx.body = { data: serialize(await load(strapi, staff, ctx.params.id)) };
  },

  /** Takes in a repair or a custom order, with an advance if the customer pays one. */
  async create(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, COUNTER_ROLES, "take repairs and orders");
    const body = ctx.request.body ?? {};
    const kind = body.kind === "custom" ? "custom" : "repair";
    const branch = await requireBranch(strapi, staff, body.branchId);
    const customer = await strapi.db.query(CUSTOMER).findOne({ where: { id: Number(body.customerId), ...org(staff) } });
    if (!customer) throw new errors.ValidationError("Choose the customer.");
    const description = text(body.description, 2000);
    if (!description) throw new errors.ValidationError(kind === "repair" ? "Describe the repair." : "Describe the piece to be made.");
    const weightIn = body.weightIn === undefined || body.weightIn === "" ? null : round3(Number(body.weightIn));
    if (weightIn !== null && !(weightIn > 0)) throw new errors.ValidationError("Enter the weight taken in, or leave it empty.");
    const karigar = Number(body.karigarId) ? await strapi.db.query(SUPPLIER).findOne({ where: { id: Number(body.karigarId), ...org(staff) } }) : null;
    const booking = Number(body.bookingId) ? await strapi.db.query(BOOKING).findOne({ where: { id: Number(body.bookingId), ...org(staff), customer: { id: customer.id } } }) : null;
    const photos = await imageIds(strapi, body.photoIds);
    const { list, total } = await takePayments(strapi, staff, customer.id, body.payments);

    const created = await strapi.documents(SERVICE_ORDER).create({
      data: {
        number: await nextNumber(strapi, staff, kind === "repair" ? "repair" : "custom-order", kind === "repair" ? "REP" : "ORD"),
        kind,
        status: "received",
        description,
        itemDescription: text(body.itemDescription, 200),
        purity: text(body.purity, 8)?.toUpperCase() ?? null,
        weightIn,
        estimate: body.estimate === undefined || body.estimate === "" ? null : money(body.estimate),
        payments: list,
        paidTotal: total,
        dueOn: isoDate(body.dueOn),
        log: [logEntry(staff, `Taken in${weightIn ? `, ${weightIn} g` : ""}${total ? `; ₹${total} advance` : ""}`)],
        ...(photos.length ? { photos } : {}),
        customer: customer.documentId,
        karigar: karigar?.documentId ?? null,
        booking: booking?.documentId ?? null,
        by: staff.documentId,
        branch: branch.documentId,
        organization: staff.organization.documentId,
      },
    });
    ctx.status = 201;
    ctx.body = { data: serialize(await load(strapi, staff, created.id)) };
  },

  /** Moves the order along (to the karigar, ready, cancelled) and records notes and the final charge. */
  async update(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, COUNTER_ROLES, "update repairs and orders");
    const order = await load(strapi, staff, ctx.params.id);
    if (order.status === "delivered" || order.status === "cancelled") throw new errors.ValidationError(`${order.number} is ${order.status}.`);
    const body = ctx.request.body ?? {};
    const data: any = {};
    const notes: string[] = [];
    if (body.status !== undefined && body.status !== order.status) {
      if (!["received", "in_work", "ready", "cancelled"].includes(body.status)) throw new errors.ValidationError("Use Deliver to hand the order over.");
      if (body.status === "cancelled" && !text(body.note, 500)) throw new errors.ValidationError("Write why the order is cancelled.");
      data.status = body.status;
      notes.push(STATUS_WORDS[body.status]);
    }
    if (body.karigarId !== undefined) {
      const karigar = body.karigarId ? await strapi.db.query(SUPPLIER).findOne({ where: { id: Number(body.karigarId), ...org(staff) } }) : null;
      data.karigar = karigar?.id ?? null;
      notes.push(karigar ? `Karigar: ${karigar.name}` : "Karigar cleared");
    }
    if (body.dueOn !== undefined) {
      data.dueOn = isoDate(body.dueOn);
      if (data.dueOn) notes.push(`Promised for ${data.dueOn}`);
    }
    if (body.estimate !== undefined) data.estimate = body.estimate === "" || body.estimate === null ? null : money(body.estimate);
    if (body.charge !== undefined) {
      data.charge = body.charge === "" || body.charge === null ? null : money(body.charge);
      if (data.charge !== null) notes.push(`Charge ₹${data.charge}`);
    }
    if (body.weightOut !== undefined) {
      data.weightOut = body.weightOut === "" || body.weightOut === null ? null : round3(Number(body.weightOut));
      if (data.weightOut) notes.push(`Weight out ${data.weightOut} g`);
    }
    if (body.photoIds !== undefined) data.photos = await imageIds(strapi, body.photoIds);
    const note = text(body.note, 1000);
    if (note) notes.push(note);
    if (notes.length) data.log = [...(order.log ?? []), logEntry(staff, notes.join(". "))];
    await strapi.db.query(SERVICE_ORDER).update({ where: { id: order.id }, data });
    ctx.body = { data: serialize(await load(strapi, staff, order.id)) };
  },

  /** Money received against the order: an advance, or a part payment. Counted in the day close. */
  async pay(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, MONEY_ROLES, "take money for orders");
    const order = await load(strapi, staff, ctx.params.id);
    if (order.status === "cancelled") throw new errors.ValidationError(`${order.number} is cancelled.`);
    const { list, total } = await takePayments(strapi, staff, order.customer.id, ctx.request.body?.payments);
    if (!total) throw new errors.ValidationError("Enter the amount received.");
    await strapi.db.query(SERVICE_ORDER).update({
      where: { id: order.id },
      data: {
        payments: [...(order.payments ?? []), ...list],
        paidTotal: toRupees(toPaise(order.paidTotal ?? 0) + toPaise(total)),
        log: [...(order.log ?? []), logEntry(staff, `₹${total} received`)],
      },
    });
    ctx.status = 201;
    ctx.body = { data: serialize(await load(strapi, staff, order.id)) };
  },

  /**
   * Hands the order to the customer and collects what is left. A custom piece is
   * billed at the POS like any piece; the repair charge is settled here.
   */
  async deliver(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, MONEY_ROLES, "deliver orders");
    const order = await load(strapi, staff, ctx.params.id);
    if (order.status === "delivered" || order.status === "cancelled") throw new errors.ValidationError(`${order.number} is already ${order.status}.`);
    const body = ctx.request.body ?? {};
    const charge = body.charge !== undefined && body.charge !== "" ? money(body.charge) : order.charge === null ? null : Number(order.charge);
    if (order.kind === "repair" && charge === null) throw new errors.ValidationError("Enter the repair charge before delivering.");
    const { list, total } = await takePayments(strapi, staff, order.customer.id, body.payments);
    const paid = toRupees(toPaise(order.paidTotal ?? 0) + toPaise(total));
    if (order.kind === "repair" && charge !== null && toPaise(paid) < toPaise(charge)) {
      throw new errors.ValidationError(`₹${toRupees(toPaise(charge) - toPaise(paid))} is still due. Take it before handing the piece over.`, { code: "BALANCE_DUE" });
    }
    await strapi.db.query(SERVICE_ORDER).update({
      where: { id: order.id },
      data: {
        status: "delivered",
        charge,
        weightOut: body.weightOut !== undefined && body.weightOut !== "" ? round3(Number(body.weightOut)) : order.weightOut,
        payments: [...(order.payments ?? []), ...list],
        paidTotal: paid,
        deliveredAt: new Date().toISOString(),
        log: [...(order.log ?? []), logEntry(staff, `Delivered${total ? `; ₹${total} received` : ""}`)],
      },
    });
    ctx.body = { data: serialize(await load(strapi, staff, order.id)) };
  },
});
