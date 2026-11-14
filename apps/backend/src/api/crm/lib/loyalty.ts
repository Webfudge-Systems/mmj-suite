import { errors } from "@strapi/utils";
import type { Staff } from "../../../utils/staff";
import { setting } from "../../../utils/staff";

export const LOYALTY = "api::loyalty-entry.loyalty-entry";
const CUSTOMER = "api::customer.customer";

/**
 * Loyalty rules. Each can be changed in CRM settings (organization settings
 * under "loyalty"). The CA should confirm how redeemed points are accounted.
 */
export function loyaltyRules(staff: Staff) {
  const raw = setting<Record<string, unknown>>(staff, "loyalty", {}) ?? {};
  return {
    enabled: raw.enabled !== false,
    /** Rupees of bill value that earn one point. */
    rupeesPerPoint: Math.max(1, Number(raw.rupeesPerPoint ?? 1000)),
    /** What one point is worth in rupees when redeemed. */
    pointValue: Math.max(0, Number(raw.pointValue ?? 1)),
    /** Fewest points that can be redeemed at once. */
    minRedeem: Math.max(1, Number(raw.minRedeem ?? 100)),
  };
}

export function pointsFor(staff: Staff, billValue: number) {
  const rules = loyaltyRules(staff);
  if (!rules.enabled || !(billValue > 0)) return 0;
  return Math.floor(billValue / rules.rupeesPerPoint);
}

type Entry = {
  customerId: number;
  points: number;
  kind: "earn" | "reverse" | "redeem" | "adjust";
  reference?: string | null;
  note?: string | null;
  invoiceId?: number | null;
};

/**
 * Adds one ledger entry and updates the customer's cached balance. Call inside
 * a transaction when it must succeed or fail with another write.
 */
export async function addLoyaltyEntry(strapi: any, staff: Staff, entry: Entry) {
  if (!Number.isInteger(entry.points) || entry.points === 0) return null;
  const customer = await strapi.db.query(CUSTOMER).findOne({ where: { id: entry.customerId, organization: { id: staff.organization.id } }, select: ["id", "documentId", "loyaltyPoints"] });
  if (!customer) throw new errors.NotFoundError("Customer not found.");
  const balance = Number(customer.loyaltyPoints ?? 0) + entry.points;
  if (balance < 0) throw new errors.ValidationError(`Only ${customer.loyaltyPoints ?? 0} points are available.`);
  await strapi.db.query(CUSTOMER).update({ where: { id: customer.id }, data: { loyaltyPoints: balance } });
  return strapi.db.query(LOYALTY).create({
    data: {
      kind: entry.kind,
      points: entry.points,
      balance,
      reference: entry.reference ?? null,
      note: entry.note ?? null,
      customer: customer.id,
      invoice: entry.invoiceId ?? null,
      by: staff.id,
      organization: staff.organization.id,
    },
  });
}

/** Points for a paid invoice. Quietly does nothing when loyalty is off or the bill is too small. */
export async function earnForInvoice(strapi: any, staff: Staff, invoice: { id: number; number: string; total: number; customerId: number | null }) {
  if (!invoice.customerId) return;
  const points = pointsFor(staff, invoice.total);
  if (!points) return;
  await addLoyaltyEntry(strapi, staff, { customerId: invoice.customerId, points, kind: "earn", reference: invoice.number, invoiceId: invoice.id });
}

/** Takes back the points an invoice earned when it is cancelled, as far as the balance allows. */
export async function reverseForInvoice(strapi: any, staff: Staff, invoice: { id: number; number: string; customerId: number | null }) {
  if (!invoice.customerId) return;
  const entries = await strapi.db.query(LOYALTY).findMany({ where: { invoice: { id: invoice.id } }, select: ["id", "kind", "points"] });
  const earned = entries.reduce((sum: number, entry: any) => sum + Number(entry.points), 0);
  if (earned <= 0) return;
  const customer = await strapi.db.query(CUSTOMER).findOne({ where: { id: invoice.customerId }, select: ["id", "loyaltyPoints"] });
  const take = Math.min(earned, Number(customer?.loyaltyPoints ?? 0));
  if (take > 0) {
    await addLoyaltyEntry(strapi, staff, { customerId: invoice.customerId, points: -take, kind: "reverse", reference: invoice.number, invoiceId: invoice.id, note: "Invoice cancelled" });
  }
}

export function serializeLoyaltyEntry(entry: any) {
  return {
    id: entry.id,
    kind: entry.kind,
    points: entry.points,
    balance: entry.balance,
    reference: entry.reference ?? null,
    note: entry.note ?? null,
    by: entry.by ? entry.by.fullName || entry.by.username : null,
    createdAt: entry.createdAt,
  };
}
