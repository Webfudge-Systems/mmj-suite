import { errors } from "@strapi/utils";
import { staffOf } from "../../stock/lib/common";
import { CUSTOMER, INVOICE, indiaDate, indiaDayRange } from "../../sales/lib/common";
import { ENQUIRY, MANAGER_ROLES, SCHEME_ACCOUNT, SCHEME_PAYMENT, daysUntilNext, org, requireRole, whatsappLink } from "../lib/common";
import { LOYALTY, loyaltyRules } from "../lib/loyalty";
import { dueState } from "./schemes";

const ORGANIZATION = "api::organization.organization";

type Reminder = {
  kind: "birthday" | "anniversary" | "scheme_due" | "follow_up";
  date: string;
  inDays: number;
  title: string;
  detail: string;
  customer: { id: number; name: string; phone: string } | null;
  enquiryId?: number;
  schemeId?: number;
  whatsapp: string | null;
};

function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Birthdays, anniversaries, scheme instalments and follow-ups coming up in the next `days` days. */
async function reminders(strapi: any, staff: any, days: number): Promise<Reminder[]> {
  const today = indiaDate();
  const list: Reminder[] = [];

  const people = await strapi.db.query(CUSTOMER).findMany({
    where: { ...org(staff), $or: [{ birthDate: { $notNull: true } }, { anniversaryDate: { $notNull: true } }] },
    select: ["id", "name", "phone", "birthDate", "anniversaryDate"],
    limit: 20000,
  });
  for (const person of people) {
    const first = person.name.split(" ")[0];
    const ref = { id: person.id, name: person.name, phone: person.phone };
    for (const [kind, field, wish] of [
      ["birthday", "birthDate", `Happy birthday, ${first}! Warm wishes from all of us at Mukund Maid Jewellers.`],
      ["anniversary", "anniversaryDate", `Happy anniversary, ${first}! Warm wishes from all of us at Mukund Maid Jewellers.`],
    ] as const) {
      const value = person[field];
      if (!value) continue;
      const inDays = daysUntilNext(value, today);
      if (inDays > days) continue;
      list.push({
        kind,
        date: addDays(today, inDays),
        inDays,
        title: `${person.name}'s ${kind}`,
        detail: inDays === 0 ? "Today" : inDays === 1 ? "Tomorrow" : `In ${inDays} days`,
        customer: ref,
        whatsapp: whatsappLink(person.phone, wish),
      });
    }
  }

  const accounts = await strapi.db.query(SCHEME_ACCOUNT).findMany({
    where: { ...org(staff), status: "active" },
    populate: { customer: { select: ["id", "name", "phone"] } },
    limit: 5000,
  });
  for (const account of accounts) {
    const state = dueState(account, today);
    if (!state.nextDueOn) continue;
    const inDays = Math.round((Date.parse(state.nextDueOn) - Date.parse(today)) / 86400000);
    if (inDays > days) continue;
    const first = account.customer?.name?.split(" ")[0] ?? "";
    list.push({
      kind: "scheme_due",
      date: state.nextDueOn,
      inDays,
      title: `${account.customer?.name ?? "Customer"}: instalment ${state.nextInstalment} of ${account.months}`,
      detail: `${account.number} · ₹${Number(account.monthlyAmount)}${inDays < 0 ? ` · ${-inDays} days late` : inDays === 0 ? " · due today" : ` · due in ${inDays} days`}`,
      customer: account.customer ? { id: account.customer.id, name: account.customer.name, phone: account.customer.phone } : null,
      schemeId: account.id,
      whatsapp: account.customer
        ? whatsappLink(account.customer.phone, `Namaste ${first}, a reminder that instalment ${state.nextInstalment} (₹${Number(account.monthlyAmount)}) of your gold savings scheme ${account.number} is due on ${state.nextDueOn}. – Mukund Maid Jewellers`)
        : null,
    });
  }

  const followUps = await strapi.db.query(ENQUIRY).findMany({
    where: { ...org(staff), status: { $in: ["new", "contacted", "visit_booked"] }, $or: [{ followUpOn: { $lte: addDays(today, days) } }, { visitOn: { $lte: addDays(today, days) } }] },
    populate: { customer: { select: ["id", "name", "phone"] } },
    limit: 1000,
  });
  for (const enquiry of followUps) {
    const date = [enquiry.visitOn, enquiry.followUpOn].filter(Boolean).sort()[0];
    const inDays = Math.round((Date.parse(date) - Date.parse(today)) / 86400000);
    list.push({
      kind: "follow_up",
      date,
      inDays,
      title: `${enquiry.visitOn === date ? "Visit" : "Follow up"}: ${enquiry.name}`,
      detail: `${enquiry.number}${inDays < 0 ? ` · ${-inDays} days overdue` : inDays === 0 ? " · today" : ` · in ${inDays} days`}`,
      customer: enquiry.customer ? { id: enquiry.customer.id, name: enquiry.customer.name, phone: enquiry.customer.phone } : null,
      enquiryId: enquiry.id,
      whatsapp: enquiry.phone ? whatsappLink(enquiry.phone, `Namaste ${String(enquiry.name).split(" ")[0]}, this is Mukund Maid Jewellers about your enquiry ${enquiry.number}.`) : null,
    });
  }

  return list.sort((a, b) => a.date.localeCompare(b.date));
}

const SEGMENTS = ["all", "opted_in", "scheme_members", "recent_buyers", "lapsed", "big_spenders", "birthday_month", "anniversary_month", "never_bought"] as const;

export default ({ strapi }: { strapi: any }) => ({
  async dashboard(ctx: any) {
    const staff = staffOf(ctx);
    const today = indiaDate();
    const monthStart = `${today.slice(0, 8)}01`;
    const { start: monthStartAt } = indiaDayRange(monthStart);
    const where = org(staff);
    const [customers, newCustomers, openEnquiries, newEnquiries, wonThisMonth, activeSchemes, maturedSchemes, schemeMonth, pointsOut, upcoming] = await Promise.all([
      strapi.db.query(CUSTOMER).count({ where }),
      strapi.db.query(CUSTOMER).count({ where: { ...where, createdAt: { $gte: monthStartAt } } }),
      strapi.db.query(ENQUIRY).count({ where: { ...where, status: { $in: ["new", "contacted", "visit_booked"] } } }),
      strapi.db.query(ENQUIRY).count({ where: { ...where, status: "new" } }),
      strapi.db.query(ENQUIRY).count({ where: { ...where, status: "won", updatedAt: { $gte: monthStartAt } } }),
      strapi.db.query(SCHEME_ACCOUNT).findMany({ where: { ...where, status: "active" }, select: ["id", "paidTotal", "monthlyAmount", "months", "instalmentsPaid", "startDate", "status"] }),
      strapi.db.query(SCHEME_ACCOUNT).count({ where: { ...where, status: "matured" } }),
      strapi.db.query(SCHEME_PAYMENT).findMany({ where: { ...where, createdAt: { $gte: monthStartAt } }, select: ["id", "amount"] }),
      strapi.db.query(CUSTOMER).findMany({ where: { ...where, loyaltyPoints: { $gt: 0 } }, select: ["id", "loyaltyPoints"] }),
      reminders(strapi, staff, 7),
    ]);
    const rules = loyaltyRules(staff);
    const points = pointsOut.reduce((sum: number, row: any) => sum + Number(row.loyaltyPoints ?? 0), 0);
    ctx.body = {
      data: {
        customers: { total: customers, newThisMonth: newCustomers },
        enquiries: { open: openEnquiries, new: newEnquiries, wonThisMonth },
        schemes: {
          active: activeSchemes.length,
          matured: maturedSchemes,
          behind: activeSchemes.filter((account: any) => dueState(account, today).behind > 0).length,
          held: Math.round(activeSchemes.reduce((sum: number, account: any) => sum + Number(account.paidTotal ?? 0), 0) * 100) / 100,
          collectedThisMonth: Math.round(schemeMonth.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0) * 100) / 100,
        },
        loyalty: { enabled: rules.enabled, pointsOutstanding: points, valueOutstanding: Math.round(points * rules.pointValue), members: pointsOut.length },
        upcoming: upcoming.slice(0, 12),
      },
    };
  },

  async reminders(ctx: any) {
    const staff = staffOf(ctx);
    const days = Math.min(Math.max(Number(ctx.query.days) || 30, 1), 90);
    ctx.body = { data: await reminders(strapi, staff, days) };
  },

  /**
   * A campaign audience: customers in a segment, with a WhatsApp link each and an
   * optional CSV. Marketing segments only include customers who agreed to it.
   */
  async audience(ctx: any) {
    const staff = staffOf(ctx);
    const segment = SEGMENTS.includes(ctx.query.segment) ? ctx.query.segment : "opted_in";
    const days = Math.min(Math.max(Number(ctx.query.days) || 180, 7), 3650);
    const minSpend = Math.max(Number(ctx.query.minSpend) || 200000, 0);
    const message = typeof ctx.query.message === "string" ? ctx.query.message.slice(0, 1000) : "";
    const today = indiaDate();
    const month = today.slice(5, 7);

    const people = await strapi.db.query(CUSTOMER).findMany({ where: org(staff), orderBy: { name: "asc" }, limit: 20000 });
    const invoices = await strapi.db.query(INVOICE).findMany({
      where: { ...org(staff), status: { $ne: "cancelled" } },
      select: ["id", "total", "invoiceDate"],
      populate: { customer: { select: ["id"] } },
      limit: 100000,
    });
    const buying = new Map<number, { spent: number; last: string }>();
    for (const invoice of invoices) {
      const id = invoice.customer?.id;
      if (!id) continue;
      const entry = buying.get(id) ?? { spent: 0, last: "" };
      entry.spent += Number(invoice.total);
      if (String(invoice.invoiceDate) > entry.last) entry.last = String(invoice.invoiceDate);
      buying.set(id, entry);
    }
    const members = new Set<number>(
      (await strapi.db.query(SCHEME_ACCOUNT).findMany({ where: { ...org(staff), status: { $in: ["active", "matured"] } }, populate: { customer: { select: ["id"] } } }))
        .map((account: any) => account.customer?.id)
        .filter(Boolean),
    );
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();

    const matches = (person: any) => {
      const history = buying.get(person.id);
      switch (segment) {
        case "all":
          return true;
        case "opted_in":
          return person.marketingOptIn === true;
        case "scheme_members":
          return members.has(person.id);
        case "recent_buyers":
          return !!history && history.last >= cutoff;
        case "lapsed":
          return !!history && history.last < cutoff;
        case "big_spenders":
          return !!history && history.spent >= minSpend;
        case "birthday_month":
          return person.birthDate?.slice(5, 7) === month;
        case "anniversary_month":
          return person.anniversaryDate?.slice(5, 7) === month;
        case "never_bought":
          return !history;
      }
    };
    // Promotions go only to people who said yes; "all" is for service messages and stays unfiltered.
    const consentOnly = segment !== "all" && ctx.query.includeAll !== "true";
    const rows = people
      .filter(matches)
      .filter((person: any) => !consentOnly || person.marketingOptIn === true)
      .map((person: any) => {
        const history = buying.get(person.id);
        const first = person.name.split(" ")[0];
        return {
          id: person.id,
          name: person.name,
          phone: person.phone,
          city: person.city ?? null,
          spent: Math.round((history?.spent ?? 0) * 100) / 100,
          lastBillAt: history?.last || null,
          points: Number(person.loyaltyPoints ?? 0),
          marketingOptIn: person.marketingOptIn === true,
          whatsapp: whatsappLink(person.phone, (message || "Namaste {name}, greetings from Mukund Maid Jewellers.").split("{name}").join(first)),
        };
      });

    if (ctx.query.format === "csv") {
      const cell = (value: unknown) => `"${String(value ?? "").split('"').join('""')}"`;
      const csv = [
        ["Name", "Mobile", "City", "Total bought", "Last bill", "Points", "Marketing consent"].map(cell).join(","),
        ...rows.map((row: any) => [row.name, row.phone, row.city, row.spent, row.lastBillAt?.slice(0, 10), row.points, row.marketingOptIn ? "Yes" : "No"].map(cell).join(",")),
      ].join("\n");
      ctx.set("Content-Type", "text/csv; charset=utf-8");
      ctx.set("Content-Disposition", `attachment; filename="mmj-${segment}-${today}.csv"`);
      ctx.body = csv;
      return;
    }
    ctx.body = { data: rows, meta: { segment, total: rows.length, consentOnly } };
  },

  async getSettings(ctx: any) {
    const staff = staffOf(ctx);
    ctx.body = { data: { loyalty: loyaltyRules(staff) } };
  },

  async saveSettings(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, MANAGER_ROLES, "change CRM settings");
    const body = ctx.request.body?.loyalty ?? {};
    const rupeesPerPoint = Number(body.rupeesPerPoint);
    const pointValue = Number(body.pointValue);
    const minRedeem = Number(body.minRedeem);
    if (!(rupeesPerPoint >= 1)) throw new errors.ValidationError("Points must cost at least ₹1 of bill value.");
    if (!(pointValue >= 0) || pointValue > rupeesPerPoint) throw new errors.ValidationError("A point cannot be worth more than the bill value that earns it.");
    if (!(minRedeem >= 1)) throw new errors.ValidationError("Set the fewest points that can be redeemed.");
    const organization = await strapi.db.query(ORGANIZATION).findOne({ where: { id: staff.organization.id } });
    const loyalty = { enabled: body.enabled !== false, rupeesPerPoint: Math.round(rupeesPerPoint), pointValue, minRedeem: Math.round(minRedeem) };
    await strapi.db.query(ORGANIZATION).update({ where: { id: organization.id }, data: { settings: { ...(organization.settings ?? {}), loyalty } } });
    ctx.body = { data: { loyalty } };
  },

  /** The most recent loyalty movements across all customers. */
  async loyaltyLedger(ctx: any) {
    const staff = staffOf(ctx);
    const rows = await strapi.db.query(LOYALTY).findMany({
      where: org(staff),
      orderBy: { createdAt: "desc" },
      limit: 200,
      populate: { customer: { select: ["id", "name", "phone"] }, by: { select: ["id", "fullName", "username"] } },
    });
    ctx.body = {
      data: rows.map((row: any) => ({
        id: row.id,
        kind: row.kind,
        points: row.points,
        balance: row.balance,
        reference: row.reference ?? null,
        note: row.note ?? null,
        customer: row.customer ? { id: row.customer.id, name: row.customer.name, phone: row.customer.phone } : null,
        by: row.by ? row.by.fullName || row.by.username : null,
        createdAt: row.createdAt,
      })),
    };
  },
});
