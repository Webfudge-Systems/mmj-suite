import { errors } from "@strapi/utils";
import { PricingError, roundBill, toPaise, toRupees, valueOldMetal } from "../../../utils/pricing";
import { branchIdsFor, requireBranch } from "../../../utils/staff";
import { staffOf } from "../../stock/lib/common";
import { latestRateCard } from "../lib/bill";
import {
  BOOKING,
  COUNTER_ROLES,
  CREDIT_NOTE,
  CUSTOMER,
  DAY_CLOSE,
  INVOICE,
  MANAGER_ROLES,
  OLD_GOLD,
  branchRef,
  cashTakenToday,
  customerRef,
  indiaDate,
  indiaDayRange,
  nextNumber,
  parsePayments,
  person,
  rules,
  sumPaise,
  type Payment,
} from "../lib/common";
import { changePiece } from "../lib/pieces";

const ITEM = "api::item.item";
const PEOPLE = { customer: true, by: { select: ["id", "fullName", "username"] }, branch: { select: ["id", "code", "name"] } };

function requireCounter(staff: any) {
  if (!COUNTER_ROLES.includes(staff.staffRole)) throw new errors.ForbiddenError("Only the counter staff, a branch manager or the owner can do this.");
}

async function loadCustomer(strapi: any, staff: any, id: unknown) {
  const customer = id ? await strapi.db.query(CUSTOMER).findOne({ where: { id: Number(id), organization: { id: staff.organization.id } } }) : null;
  if (!customer) throw new errors.ValidationError("Choose the customer.");
  return customer;
}

/** Cash paid out above the limit must go by bank, for the shop's own tax records. */
function checkPayout(staff: any, payouts: Payment[]) {
  const cash = toRupees(sumPaise(payouts.filter((payment) => payment.mode === "cash").map((payment) => payment.amount)));
  const limit = rules(staff).cashPayoutLimit;
  if (cash > limit) throw new errors.ValidationError(`Pay at most ₹${limit} in cash. Send the rest by bank transfer or UPI.`, { code: "CASH_PAYOUT_LIMIT" });
}

const money = (value: unknown) => Number(value ?? 0);

function serializeBooking(booking: any) {
  return {
    id: booking.id,
    number: booking.number,
    status: booking.status,
    amount: money(booking.amount),
    balance: money(booking.balance),
    payments: booking.payments ?? [],
    lockedPurity: booking.lockedPurity ?? null,
    lockedRate: booking.lockedRate === null || booking.lockedRate === undefined ? null : money(booking.lockedRate),
    lockedWeight: booking.lockedWeight === null || booking.lockedWeight === undefined ? null : money(booking.lockedWeight),
    lockedWeightUsed: money(booking.lockedWeightUsed),
    usage: booking.usage ?? [],
    note: booking.note ?? null,
    validUntil: booking.validUntil ?? null,
    createdAt: booking.createdAt,
    customer: customerRef(booking.customer),
    by: person(booking.by),
    branch: branchRef(booking.branch),
  };
}

function serializeCreditNote(note: any) {
  return {
    id: note.id,
    number: note.number,
    status: note.status,
    amount: money(note.amount),
    balance: money(note.balance),
    lines: note.lines ?? [],
    deductionPercent: money(note.deductionPercent),
    reason: note.reason ?? null,
    usage: note.usage ?? [],
    refunds: note.refunds ?? [],
    createdAt: note.createdAt,
    customer: customerRef(note.customer),
    by: person(note.by),
    branch: branchRef(note.branch),
    invoice: note.invoice ? { id: note.invoice.id, number: note.invoice.number } : null,
  };
}

function serializeOldGold(record: any) {
  return {
    id: record.id,
    number: record.number,
    kind: record.kind,
    lines: record.lines ?? [],
    totalValue: money(record.totalValue),
    payouts: record.payouts ?? [],
    idProof: record.idProof ?? null,
    createdAt: record.createdAt,
    customer: customerRef(record.customer),
    by: person(record.by),
    branch: branchRef(record.branch),
    invoice: record.invoice ? { id: record.invoice.id, number: record.invoice.number } : null,
  };
}

async function list(strapi: any, staff: any, uid: string, query: any, populate: any, serialize: (row: any) => unknown) {
  const branches = await branchIdsFor(strapi, staff);
  const where: any = { organization: { id: staff.organization.id }, branch: { id: { $in: branches } } };
  if (query.customerId) where.customer = { id: Number(query.customerId) };
  if (typeof query.status === "string" && query.status) where.status = query.status;
  const rows = await strapi.db.query(uid).findMany({ where, orderBy: { createdAt: "desc" }, limit: 100, populate });
  return rows.map(serialize);
}

/** Values old metal lines at today's pure rate. The total is rounded to the rupee, as paid out. */
async function valueOldGold(strapi: any, staff: any, raw: any[]) {
  const card = await latestRateCard(strapi, staff.organization.id);
  if (!card) throw new errors.ValidationError("Publish today's rate first.");
  const shop = rules(staff);
  if (!raw.length) throw new errors.ValidationError("Add what the customer is selling.");
  const lines = raw.map((line, index) => {
    const metal = line.metal === "silver" ? "silver" : "gold";
    const pureRate = card.rates.find((rate: any) => rate.purity === (metal === "gold" ? "24KT" : "999"))?.ratePerGram;
    if (!pureRate) throw new errors.ValidationError(`There is no ${metal === "gold" ? "24KT" : "999"} rate to value it.`);
    const deduction = line.deductionPercent !== undefined && MANAGER_ROLES.includes(staff.staffRole) ? Number(line.deductionPercent) : shop.oldGoldDeductionPercent;
    try {
      const valued = valueOldMetal({ grossWeight: Number(line.grossWeight), lessWeight: Number(line.lessWeight ?? 0), fineness: Number(line.fineness), pureRate, deductionPercent: deduction });
      return { description: String(line.description ?? "").trim().slice(0, 80) || `Old ${metal}`, metal, grossWeight: Number(line.grossWeight), lessWeight: Number(line.lessWeight ?? 0), fineness: Number(line.fineness), pureRate, deductionPercent: deduction, ...valued };
    } catch (error) {
      if (error instanceof PricingError) throw new errors.ValidationError(`Line ${index + 1}: ${error.message}`);
      throw error;
    }
  });
  return { lines, total: roundBill(toRupees(sumPaise(lines.map((line) => line.value)))).rounded };
}

export default ({ strapi }: { strapi: any }) => ({
  /** What the shop would pay for old metal, before anything is recorded. */
  async quoteOldGold(ctx: any) {
    const staff = staffOf(ctx);
    requireCounter(staff);
    ctx.body = { data: await valueOldGold(strapi, staff, Array.isArray(ctx.request.body?.lines) ? ctx.request.body.lines : []) };
  },

  /** Buys old gold or silver outright and pays the customer. */
  async buyOldGold(ctx: any) {
    const staff = staffOf(ctx);
    requireCounter(staff);
    const body = ctx.request.body ?? {};
    const branch = await requireBranch(strapi, staff, body.branchId);
    const customer = await loadCustomer(strapi, staff, body.customerId);
    const idProof = typeof body.idProof === "string" ? body.idProof.trim().slice(0, 60) : "";
    if (!idProof) throw new errors.ValidationError("Record the seller's ID proof, like Aadhaar ending 1234.");
    const { lines, total } = await valueOldGold(strapi, staff, Array.isArray(body.lines) ? body.lines : []);
    const payouts = parsePayments(body.payouts);
    if (sumPaise(payouts.map((payment) => payment.amount)) !== toPaise(total)) {
      throw new errors.ValidationError(`Payouts must add up to ₹${total}.`, { code: "PAYMENT_MISMATCH" });
    }
    checkPayout(staff, payouts);

    const created = await strapi.documents(OLD_GOLD).create({
      data: {
        number: await nextNumber(strapi, staff, "oldgold", "OG"),
        kind: "purchase",
        lines,
        totalValue: total,
        payouts,
        idProof,
        customer: customer.documentId,
        by: staff.documentId,
        branch: branch.documentId,
        organization: staff.organization.documentId,
      },
    });
    const saved = await strapi.db.query(OLD_GOLD).findOne({ where: { id: created.id }, populate: { ...PEOPLE, invoice: { select: ["id", "number"] } } });
    ctx.status = 201;
    ctx.body = { data: serializeOldGold(saved) };
  },

  async listOldGold(ctx: any) {
    const staff = staffOf(ctx);
    ctx.body = { data: await list(strapi, staff, OLD_GOLD, ctx.query, { ...PEOPLE, invoice: { select: ["id", "number"] } }, serializeOldGold) };
  },

  /**
   * Takes an advance. With a purity and weight it also books today's rate for
   * that weight: if the metal is dearer when the customer buys, they pay the
   * booked rate on that weight.
   */
  async createBooking(ctx: any) {
    const staff = staffOf(ctx);
    requireCounter(staff);
    const body = ctx.request.body ?? {};
    const branch = await requireBranch(strapi, staff, body.branchId);
    const customer = await loadCustomer(strapi, staff, body.customerId);
    const payments = parsePayments(body.payments);
    const amount = toRupees(sumPaise(payments.map((payment) => payment.amount)));
    const cash = toRupees(sumPaise(payments.filter((payment) => payment.mode === "cash").map((payment) => payment.amount)));
    const shop = rules(staff);
    const cashLeft = Math.max(0, toRupees(toPaise(shop.cashReceiptLimit) - 1 - toPaise(await cashTakenToday(strapi, staff, customer.id))));
    if (cash > cashLeft) throw new errors.ValidationError(`At most ₹${cashLeft} more can be taken in cash from this customer today.`, { code: "CASH_LIMIT" });

    let lock: any = {};
    if (body.lockedPurity) {
      const card = await latestRateCard(strapi, staff.organization.id);
      const rate = card?.rates.find((line: any) => line.purity === body.lockedPurity)?.ratePerGram;
      if (!card || indiaDate(new Date(card.effectiveFrom)) !== indiaDate()) throw new errors.ValidationError("Publish today's rate before booking it.");
      if (!rate) throw new errors.ValidationError(`There is no ${body.lockedPurity} rate today.`);
      const weight = Math.round(Number(body.lockedWeight) * 1000) / 1000;
      if (!(weight > 0)) throw new errors.ValidationError("Enter the weight to book the rate for.");
      const minimum = Number(staff.organization.settings?.minAdvancePercentForRateLock ?? 10);
      if (toPaise(amount) * 100 < toPaise(weight * rate) * minimum) {
        throw new errors.ValidationError(`Booking the rate for ${weight} g needs an advance of at least ${minimum}% of its value (₹${Math.ceil((weight * rate * minimum) / 100)}).`);
      }
      lock = { lockedPurity: body.lockedPurity, lockedRate: rate, lockedWeight: weight, lockedWeightUsed: 0 };
    }
    const days = Math.min(Math.max(Number(body.validDays) || 30, 1), 365);
    const validUntil = indiaDate(new Date(Date.now() + days * 86400000));

    const created = await strapi.documents(BOOKING).create({
      data: {
        number: await nextNumber(strapi, staff, "booking", "ADV"),
        status: "open",
        amount,
        balance: amount,
        payments,
        ...lock,
        usage: [],
        note: typeof body.note === "string" ? body.note.trim().slice(0, 500) || null : null,
        validUntil,
        customer: customer.documentId,
        by: staff.documentId,
        branch: branch.documentId,
        organization: staff.organization.documentId,
      },
    });
    const saved = await strapi.db.query(BOOKING).findOne({ where: { id: created.id }, populate: PEOPLE });
    ctx.status = 201;
    ctx.body = { data: serializeBooking(saved) };
  },

  async listBookings(ctx: any) {
    const staff = staffOf(ctx);
    ctx.body = { data: await list(strapi, staff, BOOKING, ctx.query, PEOPLE, serializeBooking) };
  },

  /** Returns what is left of an advance to the customer. */
  async refundBooking(ctx: any) {
    const staff = staffOf(ctx);
    if (!MANAGER_ROLES.includes(staff.staffRole)) throw new errors.ForbiddenError("Only the owner or a branch manager can refund an advance.");
    const booking = await strapi.db.query(BOOKING).findOne({ where: { id: Number(ctx.params.id), organization: { id: staff.organization.id } }, populate: PEOPLE });
    if (!booking) throw new errors.NotFoundError("Advance not found.");
    await requireBranch(strapi, staff, booking.branch.id);
    if (booking.status !== "open") throw new errors.ValidationError(`Advance ${booking.number} is already ${booking.status}.`);
    const payouts = parsePayments(ctx.request.body?.payouts);
    if (sumPaise(payouts.map((payment) => payment.amount)) !== toPaise(Number(booking.balance))) {
      throw new errors.ValidationError(`Refund exactly the balance of ₹${Number(booking.balance)}.`);
    }
    checkPayout(staff, payouts);
    await strapi.db.query(BOOKING).update({
      where: { id: booking.id },
      data: { status: "refunded", balance: 0, usage: [...(booking.usage ?? []), { refund: payouts, amount: Number(booking.balance), at: new Date().toISOString(), by: staff.id }] },
    });
    const saved = await strapi.db.query(BOOKING).findOne({ where: { id: booking.id }, populate: PEOPLE });
    ctx.body = { data: serializeBooking(saved) };
  },

  /**
   * Takes pieces back from an invoice and issues a credit note for what was
   * paid for them, less the shop's return deduction. The pieces go back into
   * stock without a tray.
   */
  async createReturn(ctx: any) {
    const staff = staffOf(ctx);
    requireCounter(staff);
    const body = ctx.request.body ?? {};
    const invoice = await strapi.db.query(INVOICE).findOne({
      where: { id: Number(body.invoiceId), organization: { id: staff.organization.id } },
      populate: { customer: true, branch: true },
    });
    if (!invoice) throw new errors.NotFoundError("Invoice not found.");
    const branch = await requireBranch(strapi, staff, invoice.branch.id);
    if (invoice.status !== "paid") throw new errors.ValidationError("A cancelled invoice cannot take returns.");
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
    if (!reason) throw new errors.ValidationError("Write why the pieces are coming back.");

    const shop = rules(staff);
    const deduction = body.deductionPercent !== undefined && MANAGER_ROLES.includes(staff.staffRole) ? Number(body.deductionPercent) : shop.returnDeductionPercent;
    if (!(deduction >= 0 && deduction < 100)) throw new errors.ValidationError("The deduction must be between 0 and 100%.");

    const wanted: number[] = (Array.isArray(body.itemIds) ? body.itemIds : []).map(Number);
    const lines: any[] = invoice.lines ?? [];
    const returning = lines.filter((line) => wanted.includes(line.itemId));
    if (!returning.length) throw new errors.ValidationError("Choose the pieces coming back.");
    const already = returning.find((line) => line.returnedAt);
    if (already) throw new errors.ValidationError(`${already.tagNumber} was already returned on ${already.creditNoteNumber}.`);

    const noteLines = returning.map((line) => {
      const value = toRupees(Math.round((toPaise(line.total) * (100 - deduction)) / 100));
      return { kind: "return", itemId: line.itemId, tagNumber: line.tagNumber, description: line.description, paid: line.total, deductionPercent: deduction, amount: value };
    });
    const amount = toRupees(sumPaise(noteLines.map((line) => line.amount)));
    const now = new Date().toISOString();

    const note = await strapi.db.transaction(async () => {
      const number = await nextNumber(strapi, staff, "creditnote", "CN");
      const created = await strapi.documents(CREDIT_NOTE).create({
        data: {
          number,
          status: "open",
          lines: noteLines,
          amount,
          balance: amount,
          deductionPercent: deduction,
          reason,
          invoice: invoice.documentId,
          customer: invoice.customer?.documentId ?? null,
          by: staff.documentId,
          branch: branch.documentId,
          organization: staff.organization.documentId,
        },
      });
      const items = await strapi.db.query(ITEM).findMany({ where: { id: { $in: returning.map((line) => line.itemId) } } });
      for (const item of items) {
        await changePiece(strapi, staff, item, { status: "in_stock", type: "returned", heldBy: null, reference: number, note: reason });
      }
      await strapi.db.query(INVOICE).update({
        where: { id: invoice.id },
        data: { lines: lines.map((line) => (wanted.includes(line.itemId) ? { ...line, returnedAt: now, creditNoteNumber: number } : line)) },
      });
      return created;
    });

    const saved = await strapi.db.query(CREDIT_NOTE).findOne({ where: { id: note.id }, populate: { ...PEOPLE, invoice: { select: ["id", "number"] } } });
    ctx.status = 201;
    ctx.body = { data: serializeCreditNote(saved) };
  },

  async listCreditNotes(ctx: any) {
    const staff = staffOf(ctx);
    ctx.body = { data: await list(strapi, staff, CREDIT_NOTE, ctx.query, { ...PEOPLE, invoice: { select: ["id", "number"] } }, serializeCreditNote) };
  },

  /** Pays out what is left on a credit note. */
  async refundCreditNote(ctx: any) {
    const staff = staffOf(ctx);
    if (!MANAGER_ROLES.includes(staff.staffRole)) throw new errors.ForbiddenError("Only the owner or a branch manager can pay out a credit note.");
    const note = await strapi.db.query(CREDIT_NOTE).findOne({ where: { id: Number(ctx.params.id), organization: { id: staff.organization.id } }, populate: { ...PEOPLE, invoice: { select: ["id", "number"] } } });
    if (!note) throw new errors.NotFoundError("Credit note not found.");
    await requireBranch(strapi, staff, note.branch.id);
    if (note.status !== "open") throw new errors.ValidationError(`Credit note ${note.number} is already ${note.status}.`);
    const payouts = parsePayments(ctx.request.body?.payouts);
    if (sumPaise(payouts.map((payment) => payment.amount)) !== toPaise(Number(note.balance))) {
      throw new errors.ValidationError(`Pay out exactly the balance of ₹${Number(note.balance)}.`);
    }
    checkPayout(staff, payouts);
    await strapi.db.query(CREDIT_NOTE).update({
      where: { id: note.id },
      data: { status: "refunded", balance: 0, refunds: [...(note.refunds ?? []), { payouts, amount: Number(note.balance), at: new Date().toISOString(), by: staff.id }] },
    });
    const saved = await strapi.db.query(CREDIT_NOTE).findOne({ where: { id: note.id }, populate: { ...PEOPLE, invoice: { select: ["id", "number"] } } });
    ctx.body = { data: serializeCreditNote(saved) };
  },

  /** What came in and went out at the counter on one India day, and the cash that should be in the drawer. */
  async daySummary(ctx: any) {
    const staff = staffOf(ctx);
    const branch = await requireBranch(strapi, staff, ctx.query.branchId);
    const date = typeof ctx.query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ctx.query.date) ? ctx.query.date : indiaDate();
    ctx.body = { data: await summarise(strapi, staff, branch, date) };
  },

  async closeDay(ctx: any) {
    const staff = staffOf(ctx);
    requireCounter(staff);
    const body = ctx.request.body ?? {};
    const branch = await requireBranch(strapi, staff, body.branchId);
    const date = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : indiaDate();
    if (date > indiaDate()) throw new errors.ValidationError("You cannot close a day that has not happened yet.");
    const counted = Number(body.countedCash);
    if (!Number.isFinite(counted) || counted < 0) throw new errors.ValidationError("Enter the cash counted in the drawer.");
    const summary = await summarise(strapi, staff, branch, date);
    if (summary.closed) throw new errors.ValidationError(`${date} was already closed by ${summary.closed.closedBy}.`);
    const difference = toRupees(toPaise(counted) - toPaise(summary.expectedCash));
    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";
    if (difference !== 0 && !notes) throw new errors.ValidationError("The count does not match. Write a note explaining the difference.");

    await strapi.documents(DAY_CLOSE).create({
      data: {
        date,
        openingCash: summary.openingCash,
        expectedCash: summary.expectedCash,
        countedCash: counted,
        difference,
        totals: { in: summary.in, out: summary.out, counts: summary.counts },
        notes: notes || null,
        closedBy: staff.documentId,
        branch: branch.documentId,
        organization: staff.organization.documentId,
      },
    });
    ctx.status = 201;
    ctx.body = { data: await summarise(strapi, staff, branch, date) };
  },
});

/** Totals by payment method for one branch and day. */
async function summarise(strapi: any, staff: any, branch: any, date: string) {
  const { start, end } = indiaDayRange(date);
  const scope = { organization: { id: staff.organization.id }, branch: { id: branch.id } };
  const day = { ...scope, createdAt: { $gte: start, $lt: end } };

  const [invoices, bookings, oldGold, creditNotes, cancelled, previous, closed] = await Promise.all([
    strapi.db.query(INVOICE).findMany({ where: { ...scope, invoiceDate: { $gte: start, $lt: end } }, select: ["id", "number", "status", "total", "payments", "oldGoldValue"] }),
    strapi.db.query(BOOKING).findMany({ where: day, select: ["id", "payments", "usage"] }),
    strapi.db.query(OLD_GOLD).findMany({ where: { ...day, kind: "purchase" }, select: ["id", "payouts", "totalValue"] }),
    strapi.db.query(CREDIT_NOTE).findMany({ where: { ...scope, updatedAt: { $gte: start } }, select: ["id", "refunds"] }),
    strapi.db.query(INVOICE).count({ where: { ...scope, status: "cancelled", cancelledAt: { $gte: start, $lt: end } } }),
    strapi.db.query(DAY_CLOSE).findOne({ where: { ...scope, date: { $lt: date } }, orderBy: { date: "desc" } }),
    strapi.db.query(DAY_CLOSE).findOne({ where: { ...scope, date }, populate: { closedBy: { select: ["id", "fullName", "username"] } } }),
  ]);

  const inflow: Record<string, number> = {};
  const outflow: Record<string, number> = {};
  const add = (bucket: Record<string, number>, payments: Payment[] | undefined) => {
    for (const payment of payments ?? []) bucket[payment.mode] = toRupees(toPaise(bucket[payment.mode] ?? 0) + toPaise(payment.amount));
  };
  const sales = invoices.filter((invoice: any) => invoice.status === "paid");
  // Money from an invoice cancelled today stays in the drawer until it is refunded as a credit note.
  for (const invoice of invoices) add(inflow, invoice.payments);
  for (const booking of bookings) add(inflow, booking.payments);
  for (const record of oldGold) add(outflow, record.payouts);
  const inWindow = (at: string) => at >= start && at < end;
  for (const note of creditNotes) for (const refund of note.refunds ?? []) if (inWindow(refund.at)) add(outflow, refund.payouts);
  const advanceRefunds = await strapi.db.query(BOOKING).findMany({ where: { ...scope, updatedAt: { $gte: start } }, select: ["id", "usage"] });
  for (const booking of advanceRefunds) for (const entry of booking.usage ?? []) if (entry.refund && inWindow(entry.at)) add(outflow, entry.refund);

  const openingCash = previous ? Number(previous.countedCash) : 0;
  const expectedCash = toRupees(toPaise(openingCash) + toPaise(inflow.cash ?? 0) - toPaise(outflow.cash ?? 0));

  return {
    date,
    branch: branchRef(branch),
    openingCash,
    in: inflow,
    out: outflow,
    expectedCash,
    counts: {
      invoices: sales.length,
      salesTotal: toRupees(sumPaise(sales.map((invoice: any) => Number(invoice.total)))),
      oldGoldTaken: toRupees(sumPaise(sales.map((invoice: any) => Number(invoice.oldGoldValue ?? 0)))),
      oldGoldBought: toRupees(sumPaise(oldGold.map((record: any) => Number(record.totalValue)))),
      advances: bookings.length,
      cancelled,
    },
    closed: closed
      ? { countedCash: Number(closed.countedCash), difference: Number(closed.difference), notes: closed.notes ?? null, closedBy: person(closed.closedBy), at: closed.createdAt }
      : null,
  };
}
