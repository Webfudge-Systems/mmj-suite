import { errors } from "@strapi/utils";
import { requireBranch } from "../../../utils/staff";
import { staffOf } from "../../stock/lib/common";
import { BOOKING, CREDIT_NOTE, CUSTOMER, INVOICE, indiaDate, nextNumber } from "../../sales/lib/common";
import { serializeCustomer } from "../../sales/controllers/customers";
import { ENQUIRY, MANAGER_ROLES, MONEY_ROLES, SCHEME_ACCOUNT, org, requireRole, text, whatsappLink } from "../lib/common";
import { LOYALTY, addLoyaltyEntry, loyaltyRules, serializeLoyaltyEntry } from "../lib/loyalty";
import { serializeAccount } from "./schemes";
import { serializeEnquiry } from "./enquiries";

async function loadCustomer(strapi: any, staff: any, id: unknown) {
  const customer = await strapi.db.query(CUSTOMER).findOne({ where: { id: Number(id), ...org(staff) } });
  if (!customer) throw new errors.NotFoundError("Customer not found.");
  return customer;
}

export default ({ strapi }: { strapi: any }) => ({
  /** Everything about one customer: purchases, money on account, points, schemes and enquiries. */
  async profile(ctx: any) {
    const staff = staffOf(ctx);
    const customer = await loadCustomer(strapi, staff, ctx.params.id);
    const mine = { ...org(staff), customer: { id: customer.id } };
    const [invoices, advances, creditNotes, loyalty, schemes, enquiries] = await Promise.all([
      strapi.db.query(INVOICE).findMany({ where: mine, orderBy: { invoiceDate: "desc" }, limit: 100, select: ["id", "number", "invoiceDate", "total", "status", "lines"] }),
      strapi.db.query(BOOKING).findMany({ where: mine, orderBy: { createdAt: "desc" }, limit: 50 }),
      strapi.db.query(CREDIT_NOTE).findMany({ where: { ...mine, status: "open" }, orderBy: { createdAt: "desc" } }),
      strapi.db.query(LOYALTY).findMany({ where: mine, orderBy: { createdAt: "desc" }, limit: 100, populate: { by: { select: ["id", "fullName", "username"] } } }),
      strapi.db.query(SCHEME_ACCOUNT).findMany({
        where: mine,
        orderBy: { createdAt: "desc" },
        populate: { plan: { select: ["id", "name"] }, customer: { select: ["id", "name", "phone"] }, booking: { select: ["id", "number", "balance"] }, branch: { select: ["id", "name", "code"] } },
      }),
      strapi.db.query(ENQUIRY).findMany({ where: mine, orderBy: { createdAt: "desc" }, limit: 50, populate: { assignedTo: { select: ["id", "fullName", "username"] } } }),
    ]);
    const paid = invoices.filter((invoice: any) => invoice.status !== "cancelled");
    const spent = paid.reduce((sum: number, invoice: any) => sum + Number(invoice.total), 0);
    const rules = loyaltyRules(staff);
    const first = customer.name.split(" ")[0];
    ctx.body = {
      data: {
        ...serializeCustomer(customer),
        summary: {
          bills: paid.length,
          spent: Math.round(spent * 100) / 100,
          pieces: paid.reduce((sum: number, invoice: any) => sum + (invoice.lines?.length ?? 0), 0),
          firstBillAt: paid.at(-1)?.invoiceDate ?? null,
          lastBillAt: paid[0]?.invoiceDate ?? null,
          pointsValue: Math.round(Number(customer.loyaltyPoints ?? 0) * rules.pointValue),
        },
        whatsapp: whatsappLink(customer.phone, `Namaste ${first}, greetings from Mukund Maid Jewellers.`),
        invoices: invoices.map((invoice: any) => ({ id: invoice.id, number: invoice.number, invoiceDate: invoice.invoiceDate, total: Number(invoice.total), status: invoice.status, pieces: invoice.lines?.length ?? 0 })),
        advances: advances.map((booking: any) => ({
          id: booking.id,
          number: booking.number,
          status: booking.status,
          amount: Number(booking.amount),
          balance: Number(booking.balance),
          note: booking.note ?? null,
          validUntil: booking.validUntil ?? null,
          createdAt: booking.createdAt,
        })),
        creditNotes: creditNotes.map((note: any) => ({ id: note.id, number: note.number, balance: Number(note.balance) })),
        loyalty: loyalty.map(serializeLoyaltyEntry),
        schemes: schemes.map(serializeAccount),
        enquiries: enquiries.map(serializeEnquiry),
      },
    };
  },

  /** Owner or manager corrects a points balance. Written to the ledger with a reason. */
  async adjustPoints(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, MANAGER_ROLES, "correct loyalty points");
    const customer = await loadCustomer(strapi, staff, ctx.params.id);
    const points = Math.trunc(Number(ctx.request.body?.points));
    const note = text(ctx.request.body?.note, 300);
    if (!points) throw new errors.ValidationError("Enter the points to add or take away.");
    if (!note) throw new errors.ValidationError("Write the reason for the correction.");
    await addLoyaltyEntry(strapi, staff, { customerId: customer.id, points, kind: "adjust", note });
    ctx.body = { data: serializeCustomer(await loadCustomer(strapi, staff, customer.id)) };
  },

  /**
   * Redeems points as an advance the billing counter takes against the next bill.
   * The CA should confirm how loyalty redemptions are shown in the books.
   */
  async redeemPoints(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, MONEY_ROLES, "redeem loyalty points");
    const rules = loyaltyRules(staff);
    if (!rules.enabled) throw new errors.ValidationError("Loyalty points are switched off in CRM settings.");
    const customer = await loadCustomer(strapi, staff, ctx.params.id);
    const points = Math.trunc(Number(ctx.request.body?.points));
    if (!(points >= rules.minRedeem)) throw new errors.ValidationError(`Redeem at least ${rules.minRedeem} points at a time.`);
    if (points > Number(customer.loyaltyPoints ?? 0)) throw new errors.ValidationError(`${customer.name} has ${customer.loyaltyPoints ?? 0} points.`);
    const amount = Math.round(points * rules.pointValue * 100) / 100;
    if (!(amount > 0)) throw new errors.ValidationError("Points have no rupee value. Set it in CRM settings.");
    const branch = await requireBranch(strapi, staff, ctx.request.body?.branchId);

    const booking = await strapi.db.transaction(async () => {
      const created = await strapi.documents(BOOKING).create({
        data: {
          number: await nextNumber(strapi, staff, "booking", "ADV"),
          status: "open",
          amount,
          balance: amount,
          payments: [],
          usage: [],
          note: `Loyalty reward: ${points} points`,
          validUntil: indiaDate(new Date(Date.now() + 90 * 86400000)),
          customer: customer.documentId,
          by: staff.documentId,
          branch: branch.documentId,
          organization: staff.organization.documentId,
        },
      });
      await addLoyaltyEntry(strapi, staff, { customerId: customer.id, points: -points, kind: "redeem", reference: created.number, note: `Redeemed for ₹${amount} off a bill` });
      return created;
    });
    ctx.body = { data: { ...serializeCustomer(await loadCustomer(strapi, staff, customer.id)), advanceNumber: booking.number, amount } };
  },
});
