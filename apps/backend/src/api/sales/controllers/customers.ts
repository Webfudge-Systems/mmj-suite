import { errors } from "@strapi/utils";
import { staffOf } from "../../stock/lib/common";
import { BOOKING, CREDIT_NOTE, CUSTOMER, ESTIMATE_ROLES, INVOICE, normalisePan, normalisePhone } from "../lib/common";

/** A YYYY-MM-DD date, or null. */
const isoDate = (value: unknown) => (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null);

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
    birthDate: customer.birthDate ?? null,
    anniversaryDate: customer.anniversaryDate ?? null,
    loyaltyPoints: Number(customer.loyaltyPoints ?? 0),
    tags: Array.isArray(customer.tags) ? customer.tags : [],
    source: customer.source ?? null,
    marketingOptIn: customer.marketingOptIn === true,
    createdAt: customer.createdAt,
  };
}

export default ({ strapi }: { strapi: any }) => ({
  /** Search by phone (any part) or name. */
  async list(ctx: any) {
    const staff = staffOf(ctx);
    const q = text(ctx.query.q, 60);
    const page = Math.max(Number(ctx.query.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(ctx.query.pageSize) || 30, 1), 100);
    const where: any = { organization: { id: staff.organization.id } };
    if (q) {
      const digits = q.replace(/\D/g, "");
      where.$or = [{ name: { $containsi: q } }, ...(digits.length >= 3 ? [{ phone: { $contains: digits } }] : [])];
    }
    const result = await strapi.db.query(CUSTOMER).findPage({ where, orderBy: q ? { name: "asc" } : { updatedAt: "desc" }, page, pageSize });
    let rows: any[] = result.results;

    // Names that start with what was typed come first, then a word inside the name, then the rest.
    if (q && !/^\d+$/.test(q)) {
      const needle = q.toLowerCase();
      const rank = (name: string) => {
        const lower = String(name ?? "").toLowerCase();
        if (lower.startsWith(needle)) return 0;
        if (lower.split(/[\s–-]+/).some((word) => word.startsWith(needle))) return 1;
        return 2;
      };
      rows = [...rows].sort((a, b) => rank(a.name) - rank(b.name));
    }

    // Bills, spend and last visit for the customer list, worked out in one query for the page.
    const stats = new Map<number, { bills: number; spent: number; lastBillAt: string | null }>();
    if (ctx.query.stats === "true" && rows.length) {
      const invoices = await strapi.db.query(INVOICE).findMany({
        where: { customer: { id: { $in: rows.map((row) => row.id) } }, status: { $ne: "cancelled" } },
        select: ["id", "total", "invoiceDate"],
        populate: { customer: { select: ["id"] } },
      });
      for (const invoice of invoices) {
        const id = invoice.customer?.id;
        if (!id) continue;
        const entry = stats.get(id) ?? { bills: 0, spent: 0, lastBillAt: null };
        entry.bills += 1;
        entry.spent += Number(invoice.total ?? 0);
        if (!entry.lastBillAt || String(invoice.invoiceDate) > entry.lastBillAt) entry.lastBillAt = invoice.invoiceDate;
        stats.set(id, entry);
      }
    }

    ctx.body = {
      data: rows.map((row) => ({
        ...serializeCustomer(row),
        ...(ctx.query.stats === "true" ? { stats: stats.get(row.id) ?? { bills: 0, spent: 0, lastBillAt: null } } : {}),
      })),
      meta: { pagination: result.pagination },
    };
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
      // CRM fields: only changed when sent, so the counter's shorter form leaves them alone.
      ...(body.birthDate !== undefined ? { birthDate: isoDate(body.birthDate) } : {}),
      ...(body.anniversaryDate !== undefined ? { anniversaryDate: isoDate(body.anniversaryDate) } : {}),
      ...(body.tags !== undefined ? { tags: Array.isArray(body.tags) ? body.tags.map((tag: unknown) => String(tag).trim().slice(0, 30)).filter(Boolean).slice(0, 20) : [] } : {}),
      ...(body.source !== undefined ? { source: text(body.source, 30) } : {}),
      ...(body.marketingOptIn !== undefined ? { marketingOptIn: body.marketingOptIn === true } : {}),
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
