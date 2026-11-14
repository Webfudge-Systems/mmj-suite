import { errors } from "@strapi/utils";
import { toPaise, toRupees } from "../../../utils/pricing";
import { requireBranch } from "../../../utils/staff";
import { staffOf } from "../../stock/lib/common";
import { BOOKING, CUSTOMER, cashTakenToday, indiaDate, nextNumber, parsePayments, rules, sumPaise } from "../../sales/lib/common";
import { MANAGER_ROLES, MONEY_ROLES, SCHEME_ACCOUNT, SCHEME_PAYMENT, SCHEME_PLAN, isoDate, money, monthsBetween, org, person, requireRole, text } from "../lib/common";

const ACCOUNT_POPULATE = {
  plan: { select: ["id", "name"] },
  customer: { select: ["id", "name", "phone"] },
  booking: { select: ["id", "number", "balance"] },
  branch: { select: ["id", "name", "code"] },
  by: { select: ["id", "fullName", "username"] },
};

export function serializePlan(plan: any) {
  return {
    id: plan.id,
    name: plan.name,
    months: plan.months,
    minInstalment: Number(plan.minInstalment),
    bonusType: plan.bonusType,
    bonusValue: Number(plan.bonusValue ?? 0),
    graceDays: plan.graceDays ?? 7,
    terms: plan.terms ?? null,
    isActive: plan.isActive !== false,
  };
}

/** What the shop adds once every instalment is paid. */
export function bonusFor(account: { bonusType: string; bonusValue: number | string | null; monthlyAmount: number | string; paidTotal: number | string }) {
  const value = Number(account.bonusValue ?? 0);
  if (account.bonusType === "instalment") return money(Number(account.monthlyAmount) * value);
  if (account.bonusType === "percent") return money((Number(account.paidTotal) * value) / 100);
  return 0;
}

/** Instalments that should have been paid by today, and whether the account is behind. */
export function dueState(account: any, today = indiaDate()) {
  const expected = Math.min(account.months, monthsBetween(account.startDate, today) + 1);
  const behind = Math.max(0, expected - account.instalmentsPaid);
  const nextNo = account.instalmentsPaid + 1;
  const [y, m, d] = String(account.startDate).split("-").map(Number);
  const due = new Date(Date.UTC(y, m - 1 + account.instalmentsPaid, d));
  return {
    expected,
    behind,
    nextInstalment: account.status === "active" && nextNo <= account.months ? nextNo : null,
    nextDueOn: account.status === "active" && nextNo <= account.months ? due.toISOString().slice(0, 10) : null,
  };
}

export function serializeAccount(account: any) {
  const state = dueState(account);
  return {
    id: account.id,
    number: account.number,
    status: account.status,
    plan: account.plan ? { id: account.plan.id, name: account.plan.name } : null,
    customer: account.customer ? { id: account.customer.id, name: account.customer.name, phone: account.customer.phone } : null,
    monthlyAmount: Number(account.monthlyAmount),
    months: account.months,
    bonusType: account.bonusType,
    bonusValue: Number(account.bonusValue ?? 0),
    startDate: account.startDate,
    paidTotal: Number(account.paidTotal ?? 0),
    instalmentsPaid: account.instalmentsPaid ?? 0,
    bonusOnMaturity: bonusFor({ ...account, paidTotal: Number(account.monthlyAmount) * account.months }),
    bonusAmount: account.bonusAmount === null || account.bonusAmount === undefined ? null : Number(account.bonusAmount),
    ...state,
    redeemedAt: account.redeemedAt ?? null,
    redeemedAs: account.redeemedAs ?? null,
    booking: account.booking ? { id: account.booking.id, number: account.booking.number, balance: Number(account.booking.balance) } : null,
    branch: account.branch ? { id: account.branch.id, name: account.branch.name, code: account.branch.code } : null,
    by: person(account.by),
    note: account.note ?? null,
    createdAt: account.createdAt,
  };
}

function serializePayment(payment: any) {
  return {
    id: payment.id,
    number: payment.number,
    instalmentNo: payment.instalmentNo,
    amount: Number(payment.amount),
    payments: payment.payments ?? [],
    by: person(payment.by),
    createdAt: payment.createdAt,
  };
}

async function loadAccount(strapi: any, staff: any, id: unknown) {
  const account = await strapi.db.query(SCHEME_ACCOUNT).findOne({ where: { id: Number(id), ...org(staff) }, populate: ACCOUNT_POPULATE });
  if (!account) throw new errors.NotFoundError("Scheme account not found.");
  return account;
}

export default ({ strapi }: { strapi: any }) => ({
  async listPlans(ctx: any) {
    const staff = staffOf(ctx);
    const where: any = { ...org(staff) };
    if (ctx.query.active !== "all") where.isActive = { $ne: false };
    const plans = await strapi.db.query(SCHEME_PLAN).findMany({ where, orderBy: { months: "asc" } });
    ctx.body = { data: plans.map(serializePlan) };
  },

  async savePlan(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, MANAGER_ROLES, "change scheme plans");
    const body = ctx.request.body ?? {};
    const name = text(body.name, 80);
    const months = Number(body.months);
    const minInstalment = money(body.minInstalment);
    const bonusType = ["instalment", "percent", "none"].includes(body.bonusType) ? body.bonusType : "instalment";
    const bonusValue = bonusType === "none" ? 0 : Number(body.bonusValue ?? 1);
    if (!name) throw new errors.ValidationError("Name the plan.");
    // Schemes running beyond twelve months count as deposits under company law.
    if (!Number.isInteger(months) || months < 1 || months > 12) throw new errors.ValidationError("A plan runs for 1 to 12 monthly instalments.");
    if (!(minInstalment > 0)) throw new errors.ValidationError("Enter the smallest monthly instalment.");
    if (!(bonusValue >= 0) || (bonusType === "percent" && bonusValue > 100)) throw new errors.ValidationError("Check the bonus.");
    const data = {
      name,
      months,
      minInstalment,
      bonusType,
      bonusValue,
      graceDays: Math.min(Math.max(Number(body.graceDays ?? 7) || 0, 0), 60),
      terms: text(body.terms, 4000),
      isActive: body.isActive !== false,
    };
    const id = Number(ctx.params.id) || null;
    let saved;
    if (id) {
      const existing = await strapi.db.query(SCHEME_PLAN).findOne({ where: { id, ...org(staff) } });
      if (!existing) throw new errors.NotFoundError("Plan not found.");
      saved = await strapi.documents(SCHEME_PLAN).update({ documentId: existing.documentId, data });
    } else {
      saved = await strapi.documents(SCHEME_PLAN).create({ data: { ...data, organization: staff.organization.documentId } });
    }
    ctx.status = id ? 200 : 201;
    ctx.body = { data: serializePlan(await strapi.db.query(SCHEME_PLAN).findOne({ where: { id: saved.id } })) };
  },

  async list(ctx: any) {
    const staff = staffOf(ctx);
    const where: any = { ...org(staff) };
    if (["active", "matured", "redeemed", "closed"].includes(ctx.query.status)) where.status = ctx.query.status;
    if (Number(ctx.query.customerId)) where.customer = { id: Number(ctx.query.customerId) };
    const q = text(ctx.query.q, 60);
    if (q) where.$or = [{ number: { $containsi: q } }, { customer: { name: { $containsi: q } } }, { customer: { phone: { $contains: q.replace(/\D/g, "") || q } } }];
    const rows = await strapi.db.query(SCHEME_ACCOUNT).findMany({ where, orderBy: { createdAt: "desc" }, populate: ACCOUNT_POPULATE, limit: 500 });
    let data = rows.map(serializeAccount);
    if (ctx.query.due === "true") data = data.filter((account: any) => account.status === "active" && account.behind > 0);
    ctx.body = { data };
  },

  async get(ctx: any) {
    const staff = staffOf(ctx);
    const account = await loadAccount(strapi, staff, ctx.params.id);
    const payments = await strapi.db.query(SCHEME_PAYMENT).findMany({
      where: { account: { id: account.id } },
      orderBy: { instalmentNo: "asc" },
      populate: { by: { select: ["id", "fullName", "username"] } },
    });
    ctx.body = { data: { ...serializeAccount(account), payments: payments.map(serializePayment) } };
  },

  /** Enrols a customer in a plan. The first instalment can be taken at the same time. */
  async enrol(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, MONEY_ROLES, "enrol customers in schemes");
    const body = ctx.request.body ?? {};
    const branch = await requireBranch(strapi, staff, body.branchId);
    const plan = await strapi.db.query(SCHEME_PLAN).findOne({ where: { id: Number(body.planId), ...org(staff), isActive: { $ne: false } } });
    if (!plan) throw new errors.ValidationError("Choose a plan.");
    const customer = await strapi.db.query(CUSTOMER).findOne({ where: { id: Number(body.customerId), ...org(staff) } });
    if (!customer) throw new errors.ValidationError("Choose the customer.");
    const monthlyAmount = money(body.monthlyAmount);
    if (!(monthlyAmount >= Number(plan.minInstalment))) throw new errors.ValidationError(`The monthly instalment for ${plan.name} is at least ₹${Number(plan.minInstalment)}.`);
    const startDate = isoDate(body.startDate) ?? indiaDate();

    const created = await strapi.documents(SCHEME_ACCOUNT).create({
      data: {
        number: await nextNumber(strapi, staff, "scheme", "SCH"),
        status: "active",
        monthlyAmount,
        months: plan.months,
        bonusType: plan.bonusType,
        bonusValue: Number(plan.bonusValue ?? 0),
        startDate,
        paidTotal: 0,
        instalmentsPaid: 0,
        note: text(body.note, 300),
        plan: plan.documentId,
        customer: customer.documentId,
        by: staff.documentId,
        branch: branch.documentId,
        organization: staff.organization.documentId,
      },
    });
    ctx.status = 201;
    ctx.body = { data: serializeAccount(await loadAccount(strapi, staff, created.id)) };
  },

  /** Takes one or more monthly instalments. Counted in the day close and the daily cash limit. */
  async pay(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, MONEY_ROLES, "take scheme instalments");
    const body = ctx.request.body ?? {};
    const account = await loadAccount(strapi, staff, ctx.params.id);
    if (account.status !== "active") throw new errors.ValidationError(`${account.number} is ${account.status}; it takes no more instalments.`);
    const branch = await requireBranch(strapi, staff, body.branchId ?? account.branch?.id);
    const remaining = account.months - account.instalmentsPaid;
    const count = Math.min(Math.max(Number(body.instalments) || 1, 1), remaining);
    const amount = money(Number(account.monthlyAmount) * count);
    const payments = parsePayments(body.payments);
    if (sumPaise(payments.map((payment) => payment.amount)) !== toPaise(amount)) {
      throw new errors.ValidationError(`Payments must add up to ₹${amount} for ${count} instalment${count === 1 ? "" : "s"}.`, { code: "PAYMENT_MISMATCH" });
    }
    const cash = toRupees(sumPaise(payments.filter((payment) => payment.mode === "cash").map((payment) => payment.amount)));
    const limit = rules(staff).cashReceiptLimit;
    const cashLeft = Math.max(0, toRupees(toPaise(limit) - 1 - toPaise(await cashTakenToday(strapi, staff, account.customer.id))));
    if (cash > cashLeft) throw new errors.ValidationError(`At most ₹${cashLeft} more can be taken in cash from this customer today.`, { code: "CASH_LIMIT" });

    const customer = await strapi.db.query(CUSTOMER).findOne({ where: { id: account.customer.id }, select: ["id", "documentId"] });
    await strapi.db.transaction(async () => {
      // One receipt per instalment, so each month shows on its own line; money split evenly.
      let left = toPaise(amount);
      for (let index = 0; index < count; index += 1) {
        const share = index === count - 1 ? left : toPaise(account.monthlyAmount);
        left -= share;
        const scale = share / toPaise(amount);
        await strapi.documents(SCHEME_PAYMENT).create({
          data: {
            number: await nextNumber(strapi, staff, "scheme-payment", "SCR"),
            instalmentNo: account.instalmentsPaid + index + 1,
            amount: toRupees(share),
            payments: count === 1 ? payments : payments.map((payment) => ({ ...payment, amount: money(payment.amount * scale) })),
            account: account.documentId,
            customer: customer.documentId,
            by: staff.documentId,
            branch: branch.documentId,
            organization: staff.organization.documentId,
          },
        });
      }
      const instalmentsPaid = account.instalmentsPaid + count;
      await strapi.db.query(SCHEME_ACCOUNT).update({
        where: { id: account.id },
        data: {
          instalmentsPaid,
          paidTotal: toRupees(toPaise(account.paidTotal ?? 0) + toPaise(amount)),
          status: instalmentsPaid >= account.months ? "matured" : "active",
        },
      });
    });
    ctx.status = 201;
    ctx.body = { data: serializeAccount(await loadAccount(strapi, staff, account.id)) };
  },

  /**
   * Turns a scheme into an advance the billing counter can use against any bill.
   * Matured schemes carry the bonus; closing early (managers only) returns what
   * was paid, without the bonus.
   */
  async redeem(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, MONEY_ROLES, "redeem schemes");
    const body = ctx.request.body ?? {};
    const account = await loadAccount(strapi, staff, ctx.params.id);
    const early = account.status === "active";
    if (!["matured", "active"].includes(account.status)) throw new errors.ValidationError(`${account.number} is already ${account.status}.`);
    if (early) {
      requireRole(staff, MANAGER_ROLES, "close a scheme before it matures");
      if (!(account.instalmentsPaid > 0)) throw new errors.ValidationError("Nothing has been paid into this scheme yet.");
      if (!text(body.reason, 300)) throw new errors.ValidationError("Write why the scheme is closing early.");
    }
    const paid = Number(account.paidTotal ?? 0);
    const bonus = early ? 0 : bonusFor(account);
    const amount = toRupees(toPaise(paid) + toPaise(bonus));
    const branch = await requireBranch(strapi, staff, account.branch?.id);
    const customer = await strapi.db.query(CUSTOMER).findOne({ where: { id: account.customer.id }, select: ["id", "documentId"] });
    const validUntil = indiaDate(new Date(Date.now() + 180 * 86400000));

    const booking = await strapi.db.transaction(async () => {
      const created = await strapi.documents(BOOKING).create({
        data: {
          number: await nextNumber(strapi, staff, "booking", "ADV"),
          status: "open",
          amount,
          balance: amount,
          // No money changes hands now: the instalments were counted on the days they were paid.
          payments: [],
          usage: [],
          note: `Gold scheme ${account.number}: ₹${paid} paid${bonus ? ` + ₹${bonus} bonus` : ""}${early ? `. Closed early: ${text(body.reason, 200)}` : ""}`,
          validUntil,
          customer: customer.documentId,
          by: staff.documentId,
          branch: branch.documentId,
          organization: staff.organization.documentId,
        },
      });
      await strapi.db.query(SCHEME_ACCOUNT).update({
        where: { id: account.id },
        data: { status: early ? "closed" : "redeemed", bonusAmount: bonus, redeemedAt: new Date().toISOString(), redeemedAs: created.number ?? null, booking: created.id },
      });
      return created;
    });
    ctx.body = { data: { ...serializeAccount(await loadAccount(strapi, staff, account.id)), advanceNumber: booking.number } };
  },
});
