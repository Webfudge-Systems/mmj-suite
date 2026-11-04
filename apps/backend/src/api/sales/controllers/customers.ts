import { errors } from "@strapi/utils";
import { staffOf } from "../../stock/lib/common";
import { BOOKING, CREDIT_NOTE, CUSTOMER, ESTIMATE_ROLES, INVOICE, normalisePan, normalisePhone } from "../lib/common";

const text = (value: unknown, max: number) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null);

export function serializeCustomer(customer: any) {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    altPhone: customer.altPhone ?? null,
    email: customer.email ?? null,
    address: customer.address ?? null,
    city: customer.city ?? null,
    pan: customer.pan ?? null,
    gstin: customer.gstin ?? null,
    notes: customer.notes ?? null,
    createdAt: customer.createdAt,
  };
}

export default ({ strapi }: { strapi: any }) => ({
  /** Search by phone (any part) or name. */
  async list(ctx: any) {
    const staff = staffOf(ctx);
    const q = text(ctx.query.q, 60);
    const where: any = { organization: { id: staff.organization.id } };
    if (q) {
      const digits = q.replace(/\D/g, "");
      where.$or = [{ name: { $containsi: q } }, ...(digits.length >= 3 ? [{ phone: { $contains: digits } }] : [])];
    }
    const rows = await strapi.db.query(CUSTOMER).findMany({ where, orderBy: { updatedAt: "desc" }, limit: 30 });
    ctx.body = { data: rows.map(serializeCustomer) };
  },

  /** The customer with what the counter needs: open advances, open credit notes, recent bills. */
  async get(ctx: any) {
    const staff = staffOf(ctx);
    const org = { organization: { id: staff.organization.id } };
    const customer = await strapi.db.query(CUSTOMER).findOne({ where: { id: Number(ctx.params.id), ...org } });
    if (!customer) throw new errors.NotFoundError("Customer not found.");
    const mine = { ...org, customer: { id: customer.id } };
    const [invoices, advances, creditNotes] = await Promise.all([
      strapi.db.query(INVOICE).findMany({ where: mine, orderBy: { invoiceDate: "desc" }, limit: 20, select: ["id", "number", "invoiceDate", "total", "status"] }),
      strapi.db.query(BOOKING).findMany({ where: { ...mine, status: "open" }, orderBy: { createdAt: "desc" } }),
      strapi.db.query(CREDIT_NOTE).findMany({ where: { ...mine, status: "open" }, orderBy: { createdAt: "desc" } }),
    ]);
    ctx.body = {
      data: {
        ...serializeCustomer(customer),
        invoices: invoices.map((invoice: any) => ({ id: invoice.id, number: invoice.number, invoiceDate: invoice.invoiceDate, total: Number(invoice.total), status: invoice.status })),
        advances: advances.map((booking: any) => ({
          id: booking.id,
          number: booking.number,
          balance: Number(booking.balance),
          lockedPurity: booking.lockedPurity ?? null,
          lockedRate: booking.lockedRate === null ? null : Number(booking.lockedRate),
          lockedWeightLeft: booking.lockedWeight ? Number(booking.lockedWeight) - Number(booking.lockedWeightUsed ?? 0) : null,
          validUntil: booking.validUntil ?? null,
        })),
        creditNotes: creditNotes.map((note: any) => ({ id: note.id, number: note.number, balance: Number(note.balance) })),
      },
    };
  },

  async save(ctx: any) {
    const staff = staffOf(ctx);
    if (!ESTIMATE_ROLES.includes(staff.staffRole)) throw new errors.ForbiddenError("Your role cannot add customers.");
    const body = ctx.request.body ?? {};
    const name = text(body.name, 120);
    const phone = normalisePhone(body.phone);
    if (!name) throw new errors.ValidationError("Enter the customer's name.");
    if (!phone) throw new errors.ValidationError("Enter a 10-digit mobile number.");
    const id = Number(ctx.params.id) || null;
    const org = { organization: { id: staff.organization.id } };

    const clash = await strapi.db.query(CUSTOMER).findOne({ where: { ...org, phone, ...(id ? { id: { $ne: id } } : {}) } });
    if (clash) throw new errors.ValidationError(`${clash.name} already has the number ${phone}.`, { customerId: clash.id });

    const data = {
      name,
      phone,
      altPhone: normalisePhone(body.altPhone),
      email: text(body.email, 120),
      address: text(body.address, 500),
      city: text(body.city, 60),
      pan: normalisePan(body.pan),
      gstin: text(body.gstin, 15)?.toUpperCase() ?? null,
      notes: text(body.notes, 1000),
    };

    let saved;
    if (id) {
      const existing = await strapi.db.query(CUSTOMER).findOne({ where: { id, ...org } });
      if (!existing) throw new errors.NotFoundError("Customer not found.");
      saved = await strapi.documents(CUSTOMER).update({ documentId: existing.documentId, data });
    } else {
      const home = staff.branches[0];
      saved = await strapi.documents(CUSTOMER).create({
        data: { ...data, organization: staff.organization.documentId, ...(home ? { branch: home.documentId } : {}) },
      });
    }
    ctx.status = id ? 200 : 201;
    ctx.body = { data: serializeCustomer(await strapi.db.query(CUSTOMER).findOne({ where: { id: saved.id } })) };
  },
});
