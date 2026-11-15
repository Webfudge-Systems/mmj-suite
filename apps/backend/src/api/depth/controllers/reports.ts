import { errors } from "@strapi/utils";
import { branchIdsFor, canSeeCost } from "../../../utils/staff";
import { staffOf } from "../../stock/lib/common";
import { BOOKING, CREDIT_NOTE, CUSTOMER, INVOICE, indiaDate, indiaDayRange } from "../../sales/lib/common";
import { latestRateCard } from "../../sales/lib/bill";
import { loyaltyRules } from "../../crm/lib/loyalty";
import { REPORT_ROLES, fineWeight, org, requireRole } from "../lib/common";

const ITEM = "api::item.item";
const OLD_GOLD = "api::old-gold.old-gold";
const SCHEME_ACCOUNT = "api::scheme-account.scheme-account";
const STOCK_VIEW_ROLES = [...REPORT_ROLES, "stock_keeper"] as const;

const r2 = (value: number) => Math.round(value * 100) / 100;
const r3 = (value: number) => Math.round(value * 1000) / 1000;

/** A date range from the query, defaulting to this month so far (India time). */
function range(query: any) {
  const today = indiaDate();
  const from = /^\d{4}-\d{2}-\d{2}$/.test(query.from ?? "") ? query.from : `${today.slice(0, 8)}01`;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(query.to ?? "") ? query.to : today;
  if (from > to) throw new errors.ValidationError("The start date is after the end date.");
  return { from, to, start: indiaDayRange(from).start, end: indiaDayRange(to).end };
}

async function branchWhere(strapi: any, staff: any, branchId: unknown) {
  const allowed = await branchIdsFor(strapi, staff);
  const id = Number(branchId);
  return { branch: { id: id && allowed.includes(id) ? id : { $in: allowed } } };
}

export default ({ strapi }: { strapi: any }) => ({
  /** Sales by day or month, with GST, old gold taken in, and money by payment method. */
  async sales(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, REPORT_ROLES, "see sales reports");
    const { from, to, start, end } = range(ctx.query);
    const byMonth = ctx.query.group === "month";
    const invoices = await strapi.db.query(INVOICE).findMany({
      where: { ...org(staff), ...(await branchWhere(strapi, staff, ctx.query.branchId)), status: "paid", invoiceDate: { $gte: start, $lt: end } },
      select: ["id", "number", "invoiceDate", "taxableValue", "cgst", "sgst", "total", "oldGoldValue", "payments", "lines"],
      populate: { salesperson: { select: ["id", "fullName", "username"] }, cashier: { select: ["id", "fullName", "username"] } },
      orderBy: { invoiceDate: "asc" },
      limit: 100000,
    });

    const rows = new Map<string, { period: string; invoices: number; pieces: number; taxable: number; cgst: number; sgst: number; total: number; oldGold: number }>();
    const modes: Record<string, number> = {};
    const purities = new Map<string, { purity: string; pieces: number; netWeight: number; fineWeight: number; value: number }>();
    const staffRows = new Map<string, { name: string; invoices: number; pieces: number; total: number }>();
    for (const invoice of invoices) {
      const day = indiaDate(new Date(invoice.invoiceDate));
      const period = byMonth ? day.slice(0, 7) : day;
      const row = rows.get(period) ?? { period, invoices: 0, pieces: 0, taxable: 0, cgst: 0, sgst: 0, total: 0, oldGold: 0 };
      const lines = (invoice.lines ?? []).filter((line: any) => !line.returnedAt);
      row.invoices += 1;
      row.pieces += lines.length;
      row.taxable += Number(invoice.taxableValue ?? 0);
      row.cgst += Number(invoice.cgst ?? 0);
      row.sgst += Number(invoice.sgst ?? 0);
      row.total += Number(invoice.total ?? 0);
      row.oldGold += Number(invoice.oldGoldValue ?? 0);
      rows.set(period, row);
      for (const payment of invoice.payments ?? []) modes[payment.mode] = r2((modes[payment.mode] ?? 0) + Number(payment.amount));
      for (const line of lines) {
        const entry = purities.get(line.purity) ?? { purity: line.purity, pieces: 0, netWeight: 0, fineWeight: 0, value: 0 };
        entry.pieces += 1;
        entry.netWeight += Number(line.netWeight ?? 0);
        try {
          entry.fineWeight += fineWeight(line.purity, Number(line.netWeight ?? 0));
        } catch {
          // An unknown purity on an old line just leaves its fine weight out.
        }
        entry.value += Number(line.total ?? 0);
        purities.set(line.purity, entry);
      }
      const seller = invoice.salesperson ?? invoice.cashier;
      const name = seller ? seller.fullName || seller.username : "Counter";
      const staffRow = staffRows.get(name) ?? { name, invoices: 0, pieces: 0, total: 0 };
      staffRow.invoices += 1;
      staffRow.pieces += lines.length;
      staffRow.total += Number(invoice.total ?? 0);
      staffRows.set(name, staffRow);
    }
    const oldGold = await strapi.db.query(OLD_GOLD).findMany({
      where: { ...org(staff), ...(await branchWhere(strapi, staff, ctx.query.branchId)), kind: "purchase", createdAt: { $gte: start, $lt: end } },
      select: ["id", "totalValue"],
    });

    const periods = [...rows.values()].map((row) => ({ ...row, taxable: r2(row.taxable), cgst: r2(row.cgst), sgst: r2(row.sgst), total: r2(row.total), oldGold: r2(row.oldGold) }));
    const sum = (key: "invoices" | "pieces" | "taxable" | "cgst" | "sgst" | "total" | "oldGold") => r2(periods.reduce((acc, row) => acc + row[key], 0));
    ctx.body = {
      data: {
        from,
        to,
        group: byMonth ? "month" : "day",
        totals: { invoices: sum("invoices"), pieces: sum("pieces"), taxable: sum("taxable"), cgst: sum("cgst"), sgst: sum("sgst"), total: sum("total"), oldGoldTaken: sum("oldGold"), oldGoldBought: r2(oldGold.reduce((acc: number, record: any) => acc + Number(record.totalValue ?? 0), 0)) },
        periods,
        paymentModes: modes,
        purities: [...purities.values()].map((entry) => ({ ...entry, netWeight: r3(entry.netWeight), fineWeight: r3(entry.fineWeight), value: r2(entry.value) })),
        staff: [...staffRows.values()].map((row) => ({ ...row, total: r2(row.total) })).sort((a, b) => b.total - a.total),
      },
    };
  },

  /** What is in stock, by purity and category, valued at today's published rate. */
  async stock(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, [...STOCK_VIEW_ROLES], "see stock reports");
    const card = await latestRateCard(strapi, staff.organization.id);
    const rate = (purity: string) => card?.rates.find((line: any) => line.purity === purity)?.ratePerGram ?? 0;
    const cost = canSeeCost(staff);
    const items = await strapi.db.query(ITEM).findMany({
      where: { ...org(staff), ...(await branchWhere(strapi, staff, ctx.query.branchId)), status: { $notIn: ["sold", "melted"] } },
      select: ["id", "purity", "grossWeight", "netWeight", "costPrice", "status", "receivedAt"],
      populate: { design: { select: ["id"], populate: { category: { select: ["id", "name"] } } } },
      limit: 100000,
    });
    const byPurity = new Map<string, { purity: string; pieces: number; grossWeight: number; netWeight: number; fineWeight: number; metalValue: number; cost: number }>();
    const byCategory = new Map<string, { category: string; pieces: number; netWeight: number; metalValue: number }>();
    const byStatus: Record<string, number> = {};
    for (const item of items) {
      const net = Number(item.netWeight);
      const value = net * rate(item.purity);
      const purity = byPurity.get(item.purity) ?? { purity: item.purity, pieces: 0, grossWeight: 0, netWeight: 0, fineWeight: 0, metalValue: 0, cost: 0 };
      purity.pieces += 1;
      purity.grossWeight += Number(item.grossWeight);
      purity.netWeight += net;
      try {
        purity.fineWeight += fineWeight(item.purity, net);
      } catch {
        // Unknown purity: no fine weight.
      }
      purity.metalValue += value;
      purity.cost += Number(item.costPrice ?? 0);
      byPurity.set(item.purity, purity);
      const name = item.design?.category?.name ?? "Uncategorised";
      const category = byCategory.get(name) ?? { category: name, pieces: 0, netWeight: 0, metalValue: 0 };
      category.pieces += 1;
      category.netWeight += net;
      category.metalValue += value;
      byCategory.set(name, category);
      byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
    }
    const purityRows = [...byPurity.values()].map((row) => ({
      purity: row.purity,
      pieces: row.pieces,
      grossWeight: r3(row.grossWeight),
      netWeight: r3(row.netWeight),
      fineWeight: r3(row.fineWeight),
      ratePerGram: rate(row.purity),
      metalValue: r2(row.metalValue),
      ...(cost ? { cost: r2(row.cost) } : {}),
    }));
    ctx.body = {
      data: {
        rateCard: card ? { effectiveFrom: card.effectiveFrom } : null,
        totals: {
          pieces: items.length,
          netWeight: r3(purityRows.reduce((acc, row) => acc + row.netWeight, 0)),
          metalValue: r2(purityRows.reduce((acc, row) => acc + row.metalValue, 0)),
          ...(cost ? { cost: r2(purityRows.reduce((acc, row) => acc + (row.cost ?? 0), 0)) } : {}),
        },
        purities: purityRows,
        categories: [...byCategory.values()].map((row) => ({ ...row, netWeight: r3(row.netWeight), metalValue: r2(row.metalValue) })).sort((a, b) => b.metalValue - a.metalValue),
        statuses: byStatus,
      },
    };
  },

  /** How long pieces have sat in stock, to find what is not selling. */
  async ageing(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, [...STOCK_VIEW_ROLES], "see stock reports");
    const items = await strapi.db.query(ITEM).findMany({
      where: { ...org(staff), ...(await branchWhere(strapi, staff, ctx.query.branchId)), status: { $in: ["in_stock", "with_staff", "on_approval"] } },
      select: ["id", "tagNumber", "purity", "grossWeight", "netWeight", "receivedAt", "createdAt", "status"],
      populate: { design: { select: ["id", "code", "name"], populate: { category: { select: ["id", "name"] } } }, location: { select: ["id", "fullCode"] } },
      limit: 100000,
    });
    const buckets = [
      { key: "0-30", label: "Under a month", max: 30 },
      { key: "31-90", label: "1 to 3 months", max: 90 },
      { key: "91-180", label: "3 to 6 months", max: 180 },
      { key: "181-365", label: "6 to 12 months", max: 365 },
      { key: "365+", label: "Over a year", max: Infinity },
    ];
    const counts = buckets.map((bucket) => ({ ...bucket, max: undefined, pieces: 0, netWeight: 0 }));
    const now = Date.now();
    const aged = items.map((item: any) => {
      const since = item.receivedAt ?? item.createdAt;
      const days = Math.max(0, Math.floor((now - Date.parse(since)) / 86400000));
      const index = buckets.findIndex((bucket) => days <= bucket.max);
      counts[index].pieces += 1;
      counts[index].netWeight += Number(item.netWeight);
      return {
        id: item.id,
        tagNumber: item.tagNumber,
        design: item.design ? `${item.design.name} (${item.design.code})` : null,
        category: item.design?.category?.name ?? null,
        purity: item.purity,
        netWeight: Number(item.netWeight),
        location: item.location?.fullCode ?? null,
        status: item.status,
        days,
      };
    });
    ctx.body = {
      data: {
        buckets: counts.map(({ max: _max, ...bucket }) => ({ ...bucket, netWeight: r3(bucket.netWeight) })),
        oldest: aged.sort((a: any, b: any) => b.days - a.days).slice(0, 100),
      },
    };
  },

  /** Money the shop holds for customers: advances, credit notes, gold schemes and loyalty points. */
  async liabilities(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, REPORT_ROLES, "see what is owed to customers");
    const [advances, credits, schemes, points] = await Promise.all([
      strapi.db.query(BOOKING).findMany({ where: { ...org(staff), status: "open" }, select: ["id", "balance", "lockedWeight", "lockedWeightUsed"] }),
      strapi.db.query(CREDIT_NOTE).findMany({ where: { ...org(staff), status: "open" }, select: ["id", "balance"] }),
      strapi.db.query(SCHEME_ACCOUNT).findMany({ where: { ...org(staff), status: { $in: ["active", "matured"] } }, select: ["id", "status", "paidTotal"] }),
      strapi.db.query(CUSTOMER).findMany({ where: { ...org(staff), loyaltyPoints: { $gt: 0 } }, select: ["id", "loyaltyPoints"] }),
    ]);
    const pointValue = loyaltyRules(staff).pointValue;
    const totalPoints = points.reduce((acc: number, row: any) => acc + Number(row.loyaltyPoints ?? 0), 0);
    const rows = [
      { key: "advances", label: "Advances and bookings", count: advances.length, amount: r2(advances.reduce((acc: number, row: any) => acc + Number(row.balance ?? 0), 0)) },
      { key: "credit_notes", label: "Credit notes", count: credits.length, amount: r2(credits.reduce((acc: number, row: any) => acc + Number(row.balance ?? 0), 0)) },
      { key: "schemes", label: "Gold schemes (paid in so far)", count: schemes.length, amount: r2(schemes.reduce((acc: number, row: any) => acc + Number(row.paidTotal ?? 0), 0)) },
      { key: "points", label: "Loyalty points", count: points.length, amount: r2(totalPoints * pointValue) },
    ];
    ctx.body = {
      data: {
        rows,
        total: r2(rows.reduce((acc, row) => acc + row.amount, 0)),
        rateLockedGrams: r3(advances.reduce((acc: number, row: any) => acc + Math.max(0, Number(row.lockedWeight ?? 0) - Number(row.lockedWeightUsed ?? 0)), 0)),
      },
    };
  },
});
