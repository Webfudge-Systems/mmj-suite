import { errors } from "@strapi/utils";
import { financialYear, rupeesInWords, toPaise, toRupees } from "../../../utils/pricing";
import { reserveSequence } from "../../../utils/sequence";
import { branchIdsFor, requireBranch, setting, tagPrefix } from "../../../utils/staff";
import { staffOf } from "../../stock/lib/common";
import { buildBill, serializeQuote, type BillRequest } from "../lib/bill";
import {
  BOOKING,
  COUNTER_ROLES,
  CREDIT_NOTE,
  ESTIMATE,
  INVOICE,
  MANAGER_ROLES,
  OLD_GOLD,
  branchRef,
  nextNumber,
  parsePayments,
  person,
  sumPaise,
} from "../lib/common";
import { changePiece } from "../lib/pieces";
import { releaseFromEstimate } from "./estimates";

const ITEM = "api::item.item";

const POPULATE = {
  customer: { select: ["id", "name", "phone"] },
  salesperson: { select: ["id", "fullName", "username"] },
  cashier: { select: ["id", "fullName", "username"] },
  cancelledBy: { select: ["id", "fullName", "username"] },
  estimate: { select: ["id", "number"] },
  branch: true,
};

function requestFrom(body: any): BillRequest {
  return {
    branchId: Number(body.branchId),
    customerId: body.customerId ? Number(body.customerId) : null,
    estimateId: body.estimateId ? Number(body.estimateId) : null,
    itemIds: Array.isArray(body.itemIds) ? body.itemIds.map(Number) : undefined,
    codes: Array.isArray(body.codes) ? body.codes.map(String) : undefined,
    discounts: body.discounts && typeof body.discounts === "object" ? body.discounts : undefined,
    bookingIds: Array.isArray(body.bookingIds) ? body.bookingIds.map(Number) : undefined,
    creditNoteIds: Array.isArray(body.creditNoteIds) ? body.creditNoteIds.map(Number) : undefined,
    oldGold: Array.isArray(body.oldGold) ? body.oldGold : undefined,
  };
}

export async function serializeInvoice(strapi: any, invoice: any, { full }: { full: boolean }) {
  const base = {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    invoiceDate: invoice.invoiceDate,
    customer: invoice.customerSnapshot,
    total: Number(invoice.total),
    amountDue: Number(invoice.amountDue),
    pieces: (invoice.lines ?? []).length,
    branch: branchRef(invoice.branch),
    salesperson: person(invoice.salesperson),
    cashier: person(invoice.cashier),
  };
  if (!full) return base;

  const organization = await strapi.db.query("api::organization.organization").findOne({ where: { id: invoice.organization?.id ?? invoice.organization } });
  const oldGold = await strapi.db.query(OLD_GOLD).findOne({ where: { invoice: { id: invoice.id } } });
  return {
    ...base,
    lines: invoice.lines,
    rates: invoice.rates,
    taxableValue: Number(invoice.taxableValue),
    cgst: Number(invoice.cgst),
    sgst: Number(invoice.sgst),
    roundOff: Number(invoice.roundOff),
    oldGoldValue: Number(invoice.oldGoldValue ?? 0),
    oldGold: oldGold ? { number: oldGold.number, lines: oldGold.lines } : null,
    advanceUsed: Number(invoice.advanceUsed ?? 0),
    creditNoteUsed: Number(invoice.creditNoteUsed ?? 0),
    payments: invoice.payments,
    notes: invoice.notes ?? null,
    amountInWords: rupeesInWords(Number(invoice.total)),
    estimate: invoice.estimate ? { id: invoice.estimate.id, number: invoice.estimate.number } : null,
    cancelReason: invoice.cancelReason ?? null,
    cancelledAt: invoice.cancelledAt ?? null,
    cancelledBy: person(invoice.cancelledBy),
    seller: {
      name: organization?.legalName || organization?.name,
      tradeName: organization?.name,
      gstin: invoice.branch?.gstin || organization?.gstin || null,
      phone: invoice.branch?.phone || organization?.phone || null,
      email: organization?.email ?? null,
      address: [invoice.branch?.address, invoice.branch?.city].filter(Boolean).join(", ") || null,
    },
  };
}

export default ({ strapi }: { strapi: any }) => ({
  /** Prices a bill without saving it, for the counter screen. */
  async quote(ctx: any) {
    const staff = staffOf(ctx);
    const bill = await buildBill(strapi, staff, requestFrom(ctx.request.body ?? {}), { strict: false });
    ctx.body = { data: serializeQuote(bill) };
  },

  /** Issues a tax invoice. Prices are recalculated here; the payments must cover exactly what is due. */
  async create(ctx: any) {
    const staff = staffOf(ctx);
    if (!COUNTER_ROLES.includes(staff.staffRole)) throw new errors.ForbiddenError("Your role cannot issue invoices.");
    const body = ctx.request.body ?? {};
    const bill = await buildBill(strapi, staff, requestFrom(body), { strict: true });
    if (!bill.customer) throw new errors.ValidationError("Choose the customer for the invoice.");
    if (bill.panMissing) throw new errors.ValidationError("This customer's purchases today reach ₹2 lakh. Add their PAN before billing.", { code: "PAN_REQUIRED" });

    const payments = parsePayments(body.payments, { allowEmpty: bill.amountDue === 0 });
    const paid = sumPaise(payments.map((payment) => payment.amount));
    if (paid !== toPaise(bill.amountDue)) {
      throw new errors.ValidationError(`Payments add up to ₹${toRupees(paid)} but ₹${bill.amountDue} is due.`, { code: "PAYMENT_MISMATCH" });
    }
    const cash = toRupees(sumPaise(payments.filter((payment) => payment.mode === "cash").map((payment) => payment.amount)));
    if (cash > bill.cashAllowed) {
      throw new errors.ValidationError(`Cash from one customer in a day must stay below the legal limit. At most ₹${bill.cashAllowed} more can be taken in cash today.`, { code: "CASH_LIMIT" });
    }

    const customer = bill.customer;
    const now = new Date();
    const invoice = await strapi.db.transaction(async () => {
      const fy = financialYear(now);
      const prefix = String(setting(staff, "invoicePrefix", tagPrefix(staff)));
      const number = `${prefix}/${fy}/${String(await reserveSequence(strapi, `invoice:${staff.organization.id}:${fy}`)).padStart(6, "0")}`;
      const branch = await requireBranch(strapi, staff, bill.branchId);

      const created = await strapi.documents(INVOICE).create({
        data: {
          number,
          status: "paid",
          invoiceDate: now.toISOString(),
          lines: bill.lines,
          customerSnapshot: {
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            address: [customer.address, customer.city].filter(Boolean).join(", ") || null,
            pan: customer.pan ?? null,
            gstin: customer.gstin ?? null,
          },
          rates: { rateCardId: bill.rateCard.id, effectiveFrom: bill.rateCard.effectiveFrom, lines: bill.rateCard.rates },
          taxableValue: bill.taxableValue,
          cgst: bill.cgst,
          sgst: bill.sgst,
          roundOff: bill.roundOff,
          total: bill.total,
          oldGoldValue: bill.oldGold.value,
          advanceUsed: bill.advanceUsed,
          creditNoteUsed: bill.creditNoteUsed,
          amountDue: bill.amountDue,
          payments,
          notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 500) || null : null,
          customer: customer.documentId,
          salesperson: bill.estimate?.salesperson ? (await strapi.db.query("plugin::users-permissions.user").findOne({ where: { id: bill.estimate.salesperson.id } }))?.documentId : staff.documentId,
          cashier: staff.documentId,
          estimate: bill.estimate?.documentId ?? null,
          branch: branch.documentId,
          organization: staff.organization.documentId,
        },
      });

      if (bill.oldGold.lines.length) {
        await strapi.documents(OLD_GOLD).create({
          data: {
            number: await nextNumber(strapi, staff, "oldgold", "OG"),
            kind: "exchange",
            lines: bill.oldGold.lines,
            totalValue: bill.oldGold.value,
            idProof: typeof body.idProof === "string" ? body.idProof.trim().slice(0, 60) || null : null,
            customer: customer.documentId,
            invoice: created.documentId,
            by: staff.documentId,
            branch: branch.documentId,
            organization: staff.organization.documentId,
          },
        });
      }

      const items = await strapi.db.query(ITEM).findMany({ where: { id: { $in: bill.lines.map((line) => line.itemId) } }, populate: { location: { select: ["id"] } } });
      for (const item of items) {
        await changePiece(strapi, staff, item, { status: "sold", type: "sold", heldBy: null, reference: number, clearLocation: true });
      }

      if (bill.estimate) {
        const billed = new Set(bill.lines.map((line) => line.itemId));
        const left = (bill.estimate.lines ?? []).filter((line: { itemId: number }) => !billed.has(line.itemId));
        await releaseFromEstimate(strapi, staff, bill.estimate, left.map((line: { itemId: number }) => line.itemId));
        await strapi.db.query(ESTIMATE).update({ where: { id: bill.estimate.id }, data: { status: "billed", billedAt: now.toISOString(), invoice: created.id } });
      }

      for (const use of bill.advances) {
        if (!use.used && !use.lockedGrams) continue;
        const booking = await strapi.db.query(BOOKING).findOne({ where: { id: use.id } });
        const balance = toRupees(toPaise(Number(booking.balance)) - toPaise(use.used));
        await strapi.db.query(BOOKING).update({
          where: { id: booking.id },
          data: {
            balance,
            status: balance <= 0 ? "used" : "open",
            lockedWeightUsed: Number(booking.lockedWeightUsed ?? 0) + use.lockedGrams,
            usage: [...(booking.usage ?? []), { invoice: number, amount: use.used, grams: use.lockedGrams, at: now.toISOString() }],
          },
        });
      }
      for (const use of bill.creditNotes) {
        if (!use.used) continue;
        const note = await strapi.db.query(CREDIT_NOTE).findOne({ where: { id: use.id } });
        const balance = toRupees(toPaise(Number(note.balance)) - toPaise(use.used));
        await strapi.db.query(CREDIT_NOTE).update({
          where: { id: note.id },
          data: { balance, status: balance <= 0 ? "used" : "open", usage: [...(note.usage ?? []), { invoice: number, amount: use.used, at: now.toISOString() }] },
        });
      }
      return created;
    });

    const saved = await strapi.db.query(INVOICE).findOne({ where: { id: invoice.id }, populate: { ...POPULATE, organization: { select: ["id"] } } });
    ctx.status = 201;
    ctx.body = { data: await serializeInvoice(strapi, saved, { full: true }) };
  },

  async list(ctx: any) {
    const staff = staffOf(ctx);
    const branches = await branchIdsFor(strapi, staff);
    const branchId = Number(ctx.query.branchId);
    const page = Math.max(Number(ctx.query.page) || 1, 1);
    const where: any = { organization: { id: staff.organization.id }, branch: { id: branches.includes(branchId) ? branchId : { $in: branches } } };
    const q = typeof ctx.query.q === "string" ? ctx.query.q.trim() : "";
    if (q) where.$or = [{ number: { $containsi: q } }, { customer: { phone: { $contains: q.replace(/\D/g, "") || q } } }, { customer: { name: { $containsi: q } } }];
    if (ctx.query.date) {
      const start = new Date(`${ctx.query.date}T00:00:00+05:30`);
      where.invoiceDate = { $gte: start.toISOString(), $lt: new Date(start.getTime() + 86400000).toISOString() };
    }
    const result = await strapi.db.query(INVOICE).findPage({ where, page, pageSize: 30, orderBy: { invoiceDate: "desc" }, populate: POPULATE });
    ctx.body = {
      data: await Promise.all(result.results.map((invoice: any) => serializeInvoice(strapi, invoice, { full: false }))),
      meta: { pagination: result.pagination },
    };
  },

  async get(ctx: any) {
    const staff = staffOf(ctx);
    const invoice = await strapi.db.query(INVOICE).findOne({
      where: { id: Number(ctx.params.id), organization: { id: staff.organization.id } },
      populate: { ...POPULATE, organization: { select: ["id"] } },
    });
    if (!invoice) throw new errors.NotFoundError("Invoice not found.");
    await requireBranch(strapi, staff, invoice.branch.id);
    ctx.body = { data: await serializeInvoice(strapi, invoice, { full: true }) };
  },

  /**
   * Cancels an invoice. The pieces return to stock without a tray, advances and
   * credit notes get their balance back, and everything else the customer paid
   * (money and old gold) becomes a credit note they can use or have refunded.
   */
  async cancel(ctx: any) {
    const staff = staffOf(ctx);
    if (!MANAGER_ROLES.includes(staff.staffRole)) throw new errors.ForbiddenError("Only the owner or a branch manager can cancel an invoice.");
    const reason = typeof ctx.request.body?.reason === "string" ? ctx.request.body.reason.trim().slice(0, 500) : "";
    if (reason.length < 5) throw new errors.ValidationError("Write why the invoice is being cancelled.");
    const invoice = await strapi.db.query(INVOICE).findOne({
      where: { id: Number(ctx.params.id), organization: { id: staff.organization.id } },
      populate: { ...POPULATE, organization: { select: ["id"] } },
    });
    if (!invoice) throw new errors.NotFoundError("Invoice not found.");
    const branch = await requireBranch(strapi, staff, invoice.branch.id);
    if (invoice.status === "cancelled") throw new errors.ValidationError("This invoice is already cancelled.");
    if ((invoice.lines ?? []).some((line: any) => line.returnedAt)) throw new errors.ValidationError("Some pieces on this invoice were returned. Return the rest instead of cancelling.");

    const now = new Date().toISOString();
    await strapi.db.transaction(async () => {
      const items = await strapi.db.query(ITEM).findMany({ where: { id: { $in: invoice.lines.map((line: any) => line.itemId) } } });
      for (const item of items) {
        await changePiece(strapi, staff, item, { status: "in_stock", type: "sale_cancelled", heldBy: null, reference: invoice.number, note: reason });
      }
      // Give advances and credit notes back what this invoice took from them.
      for (const [uid, field] of [[BOOKING, "advance"], [CREDIT_NOTE, "credit"]] as const) {
        const used = await strapi.db.query(uid).findMany({ where: { organization: { id: staff.organization.id }, customer: { id: invoice.customer.id } } });
        for (const record of used) {
          const entries = (record.usage ?? []).filter((entry: any) => entry.invoice === invoice.number && !entry.reversed);
          if (!entries.length) continue;
          const amount = toRupees(sumPaise(entries.map((entry: any) => entry.amount)));
          const grams = entries.reduce((sum: number, entry: any) => sum + Number(entry.grams ?? 0), 0);
          await strapi.db.query(uid).update({
            where: { id: record.id },
            data: {
              balance: toRupees(toPaise(Number(record.balance)) + toPaise(amount)),
              status: "open",
              ...(field === "advance" ? { lockedWeightUsed: Math.max(0, Number(record.lockedWeightUsed ?? 0) - grams) } : {}),
              usage: (record.usage ?? []).map((entry: any) => (entry.invoice === invoice.number ? { ...entry, reversed: now } : entry)),
            },
          });
        }
      }
      const refundable = toRupees(sumPaise([...(invoice.payments ?? []).map((payment: any) => payment.amount), Number(invoice.oldGoldValue ?? 0)]));
      if (refundable > 0) {
        await strapi.documents(CREDIT_NOTE).create({
          data: {
            number: await nextNumber(strapi, staff, "creditnote", "CN"),
            status: "open",
            lines: [{ kind: "cancellation", invoice: invoice.number, amount: refundable }],
            amount: refundable,
            balance: refundable,
            reason: `Invoice ${invoice.number} cancelled: ${reason}`,
            invoice: invoice.documentId,
            customer: invoice.customer ? (await strapi.db.query("api::customer.customer").findOne({ where: { id: invoice.customer.id } })).documentId : null,
            by: staff.documentId,
            branch: branch.documentId,
            organization: staff.organization.documentId,
          },
        });
      }
      await strapi.db.query(INVOICE).update({ where: { id: invoice.id }, data: { status: "cancelled", cancelReason: reason, cancelledAt: now, cancelledBy: staff.id } });
    });

    const saved = await strapi.db.query(INVOICE).findOne({ where: { id: invoice.id }, populate: { ...POPULATE, organization: { select: ["id"] } } });
    ctx.body = { data: await serializeInvoice(strapi, saved, { full: true }) };
  },
});
