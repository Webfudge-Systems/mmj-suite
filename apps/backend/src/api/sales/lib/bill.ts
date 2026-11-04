import { errors } from "@strapi/utils";
import { normaliseCode } from "../../../utils/stock";
import { PricingError, priceLine, roundBill, splitGst, toPaise, toRupees, valueOldMetal } from "../../../utils/pricing";
import { branchIdsFor, type Staff } from "../../../utils/staff";
import {
  BOOKING,
  CREDIT_NOTE,
  CUSTOMER,
  ESTIMATE,
  INVOICE,
  RATE_CARD,
  cashTakenToday,
  indiaDate,
  indiaDayRange,
  rules,
  sumPaise,
} from "./common";

const ITEM = "api::item.item";

export type OldGoldLineInput = {
  description?: string;
  metal?: "gold" | "silver";
  grossWeight: number;
  lessWeight?: number;
  fineness: number;
  deductionPercent?: number;
};

export type BillRequest = {
  branchId: number;
  customerId?: number | null;
  estimateId?: number | null;
  /** Item ids to bill. With an estimate, a subset of its pieces; without, pieces scanned at the counter. */
  itemIds?: number[];
  codes?: string[];
  /** Making-charge discount in rupees, keyed by item id. */
  discounts?: Record<string, number>;
  bookingIds?: number[];
  creditNoteIds?: number[];
  oldGold?: OldGoldLineInput[];
};

export type BillLine = {
  itemId: number;
  tagNumber: string;
  huid: string | null;
  hsn: string;
  description: string;
  designCode: string | null;
  category: string | null;
  metal: string;
  purity: string;
  grossWeight: number;
  stoneWeight: number;
  netWeight: number;
  ratePerGram: number;
  todayRate: number;
  lockedGrams: number;
  making: { type: string; value: number };
  metalValue: number;
  makingCharge: number;
  makingDiscount: number;
  stoneValue: number;
  otherCharges: number;
  taxableValue: number;
  gst: number;
  total: number;
  returnedAt?: string | null;
  creditNoteNumber?: string | null;
};

export type Bill = Awaited<ReturnType<typeof buildBill>>;

/** HSN for articles of jewellery of precious metal. */
const HSN_JEWELLERY = "7113";

function fail(message: string, details?: Record<string, unknown>): never {
  throw new errors.ValidationError(message, details);
}

export async function latestRateCard(strapi: any, organizationId: number) {
  const card = await strapi.db.query(RATE_CARD).findOne({
    where: { organization: { id: organizationId } },
    orderBy: [{ effectiveFrom: "desc" }, { id: "desc" }],
    populate: { rates: true },
  });
  if (!card) return null;
  return {
    id: card.id as number,
    effectiveFrom: card.effectiveFrom as string,
    rates: (card.rates ?? []).map((line: any) => ({ purity: line.purity as string, metal: line.metal as string, ratePerGram: Number(line.ratePerGram) })),
  };
}

/**
 * Prices a bill. Used for the live preview at the counter (strict = false,
 * which turns blocking problems into warnings where it can) and again, strictly,
 * when the invoice is saved. The invoice amount is always the server's.
 */
export async function buildBill(strapi: any, staff: Staff, request: BillRequest, { strict }: { strict: boolean }) {
  const shop = rules(staff);
  const warnings: string[] = [];
  const org = { organization: { id: staff.organization.id } };

  const branchId = Number(request.branchId);
  if (!(await branchIdsFor(strapi, staff)).includes(branchId)) throw new errors.ForbiddenError("You do not work at that branch.");

  const card = await latestRateCard(strapi, staff.organization.id);
  if (!card) fail("No rate has been published yet. Publish today's rate in the Back Office first.");
  if (indiaDate(new Date(card.effectiveFrom)) !== indiaDate()) {
    const message = "Today's rate has not been published yet. Bills use the last published rate.";
    if (strict && shop.requireTodayRate) fail("Publish today's rate in the Back Office before billing.");
    warnings.push(message);
  }
  const rateOf = (purity: string) => card.rates.find((rate: { purity: string }) => rate.purity === purity)?.ratePerGram;

  const customer = request.customerId
    ? await strapi.db.query(CUSTOMER).findOne({ where: { id: Number(request.customerId), ...org } })
    : null;
  if (request.customerId && !customer) fail("That customer does not exist.");

  // Which pieces are on the bill.
  let estimate: any = null;
  let ids: number[] = (request.itemIds ?? []).map(Number).filter(Boolean);
  if (request.estimateId) {
    estimate = await strapi.db.query(ESTIMATE).findOne({ where: { id: Number(request.estimateId), ...org }, populate: { customer: true, salesperson: { select: ["id", "fullName", "username"] } } });
    if (!estimate) fail("That estimate does not exist.");
    if (estimate.status !== "open") fail(`Estimate ${estimate.number} is already ${estimate.status}.`);
    const onEstimate = (estimate.lines ?? []).map((line: { itemId: number }) => line.itemId);
    ids = ids.length ? ids.filter((id) => onEstimate.includes(id)) : onEstimate;
  }
  for (const code of request.codes ?? []) {
    const item = await strapi.db.query(ITEM).findOne({
      where: { ...org, $or: [{ tagNumber: normaliseCode(code) }, { legacyTag: normaliseCode(code) }, { huid: normaliseCode(code) }] },
      select: ["id"],
    });
    if (!item) fail(`No piece matches ${code}.`);
    ids.push(item.id);
  }
  ids = [...new Set(ids)];
  if (!ids.length) fail("Add at least one piece to the bill.");

  const items = await strapi.db.query(ITEM).findMany({
    where: { id: { $in: ids }, ...org },
    populate: {
      making: true,
      branch: { select: ["id", "name"] },
      heldBy: { select: ["id", "fullName", "username"] },
      design: { select: ["id", "code", "name"], populate: { category: { select: ["id", "name"] } } },
    },
  });
  const estimateIds = new Set((estimate?.lines ?? []).map((line: { itemId: number }) => line.itemId));
  for (const item of items) {
    if (item.branch?.id !== branchId) fail(`${item.tagNumber} is at ${item.branch?.name}. Transfer it here first.`);
    if (item.status === "reserved" && !estimateIds.has(item.id)) fail(`${item.tagNumber} is reserved on another estimate.`);
    if (!["in_stock", "with_staff", "reserved"].includes(item.status)) fail(`${item.tagNumber} is ${item.status.replace("_", " ")} and cannot be sold.`);
  }

  // Advances: rate locks first (they change the line prices), amounts later.
  const bookings = request.bookingIds?.length
    ? await strapi.db.query(BOOKING).findMany({ where: { id: { $in: request.bookingIds.map(Number) }, ...org }, populate: { customer: { select: ["id"] } } })
    : [];
  for (const booking of bookings) {
    if (!customer || booking.customer?.id !== customer.id) fail(`Advance ${booking.number} belongs to another customer.`);
    if (booking.status !== "open" || Number(booking.balance) <= 0) fail(`Advance ${booking.number} has nothing left to use.`);
  }
  const lockLeft = new Map<number, number>(
    bookings.filter((booking: any) => booking.lockedPurity && booking.lockedRate).map((booking: any) => [booking.id, Math.max(0, Number(booking.lockedWeight ?? 0) - Number(booking.lockedWeightUsed ?? 0))]),
  );
  const lockUse: { bookingId: number; grams: number }[] = [];

  const limit = shop.discountLimit(staff.staffRole);
  const lines: BillLine[] = [];
  for (const item of items.sort((a: any, b: any) => ids.indexOf(a.id) - ids.indexOf(b.id))) {
    const todayRate = rateOf(item.purity);
    if (!todayRate) fail(`There is no rate for ${item.purity} on today's card.`);
    const netWeight = Number(item.netWeight);

    // Booked grams are priced at the booked rate, the rest at today's. A booked
    // rate protects against a rise: if the metal is cheaper today, today's rate applies.
    const netMg = Math.round(netWeight * 1000);
    let lockedMg = 0;
    let lockedPaise = 0;
    for (const booking of bookings) {
      const leftMg = Math.round((lockLeft.get(booking.id) ?? 0) * 1000);
      if (!leftMg || booking.lockedPurity !== item.purity || Number(booking.lockedRate) >= todayRate) continue;
      const takeMg = Math.min(leftMg, netMg - lockedMg);
      if (takeMg <= 0) continue;
      lockedPaise += Math.round((takeMg * toPaise(Number(booking.lockedRate))) / 1000);
      lockedMg += takeMg;
      lockLeft.set(booking.id, (leftMg - takeMg) / 1000);
      lockUse.push({ bookingId: booking.id, grams: takeMg / 1000 });
    }
    const metalPaise = lockedPaise + Math.round(((netMg - lockedMg) * toPaise(todayRate)) / 1000);
    const lockedGrams = lockedMg / 1000;
    const ratePerGram = lockedMg ? Math.round((metalPaise / netMg) * 1000) / 100 : todayRate;

    const making = { type: item.making?.type ?? "fixed", value: Number(item.making?.value ?? 0) };
    const discount = Math.max(0, Number(request.discounts?.[String(item.id)] ?? 0));
    let price;
    try {
      price = priceLine({
        netWeight,
        ratePerGram: todayRate,
        metalValue: toRupees(metalPaise),
        making: making as any,
        stoneValue: Number(item.stoneValue ?? 0),
        otherCharges: item.huid ? shop.hallmarkCharge : 0,
        makingDiscount: discount,
      });
    } catch (error) {
      if (error instanceof PricingError) fail(`${item.tagNumber}: ${error.message}`);
      throw error;
    }
    if (discount > 0 && toPaise(discount) > Math.floor((toPaise(price.makingCharge) * limit) / 100)) {
      fail(`${item.tagNumber}: your role can give at most ${limit}% off making (₹${toRupees(Math.floor((toPaise(price.makingCharge) * limit) / 100))}).`);
    }

    lines.push({
      itemId: item.id,
      tagNumber: item.tagNumber,
      huid: item.huid ?? null,
      hsn: HSN_JEWELLERY,
      description: item.design?.name ?? item.purity,
      designCode: item.design?.code ?? null,
      category: item.design?.category?.name ?? null,
      metal: item.metal,
      purity: item.purity,
      grossWeight: Number(item.grossWeight),
      stoneWeight: Number(item.stoneWeight ?? 0),
      netWeight,
      ratePerGram,
      todayRate,
      lockedGrams,
      making,
      ...price,
    });
  }

  const taxablePaise = sumPaise(lines.map((line) => line.taxableValue));
  const gstPaise = sumPaise(lines.map((line) => line.gst));
  const { cgst, sgst } = splitGst(toRupees(gstPaise));
  const { rounded, roundOff } = roundBill(toRupees(taxablePaise + gstPaise));
  let remaining = toPaise(rounded);

  // Old gold taken in exchange.
  const pureRate = { gold: rateOf("24KT"), silver: rateOf("999") };
  const oldGoldLines = (request.oldGold ?? []).map((raw, index) => {
    const metal = raw.metal === "silver" ? "silver" : "gold";
    const rate = pureRate[metal];
    if (!rate) fail(`There is no ${metal === "gold" ? "24KT" : "999 silver"} rate to value old ${metal}.`);
    const deduction = raw.deductionPercent === undefined || raw.deductionPercent === null || !["owner", "branch_manager"].includes(staff.staffRole)
      ? shop.oldGoldDeductionPercent
      : Number(raw.deductionPercent);
    try {
      const valued = valueOldMetal({
        grossWeight: Number(raw.grossWeight),
        lessWeight: Number(raw.lessWeight ?? 0),
        fineness: Number(raw.fineness),
        pureRate: rate,
        deductionPercent: deduction,
      });
      return {
        description: (raw.description ?? "").toString().trim().slice(0, 80) || `Old ${metal}`,
        metal,
        grossWeight: Number(raw.grossWeight),
        lessWeight: Number(raw.lessWeight ?? 0),
        fineness: Number(raw.fineness),
        pureRate: rate,
        deductionPercent: deduction,
        ...valued,
      };
    } catch (error) {
      if (error instanceof PricingError) fail(`Old gold line ${index + 1}: ${error.message}`);
      throw error;
    }
  });
  const oldGoldPaise = sumPaise(oldGoldLines.map((line) => line.value));
  if (oldGoldPaise > remaining) {
    fail("The old gold is worth more than the bill. Record the extra as an old gold purchase, or add pieces.");
  }
  remaining -= oldGoldPaise;

  // Credit notes, then advances, each up to what is left to pay.
  const creditNotes = request.creditNoteIds?.length
    ? await strapi.db.query(CREDIT_NOTE).findMany({ where: { id: { $in: request.creditNoteIds.map(Number) }, ...org }, populate: { customer: { select: ["id"] } } })
    : [];
  const creditUse = creditNotes.map((note: any) => {
    if (!customer || note.customer?.id !== customer.id) fail(`Credit note ${note.number} belongs to another customer.`);
    if (note.status !== "open") fail(`Credit note ${note.number} has been used.`);
    const used = Math.min(toPaise(Number(note.balance)), remaining);
    remaining -= used;
    return { id: note.id, number: note.number, used: toRupees(used) };
  });
  const advanceUse = bookings.map((booking: any) => {
    const used = Math.min(toPaise(Number(booking.balance)), remaining);
    remaining -= used;
    return { id: booking.id, number: booking.number, used: toRupees(used), lockedGrams: lockUse.filter((entry) => entry.bookingId === booking.id).reduce((sum, entry) => sum + entry.grams, 0) };
  });

  // PAN and cash limits look at the customer's whole day.
  let panRequired = false;
  let cashAllowed = shop.cashReceiptLimit - 0.01;
  if (customer) {
    const { start, end } = indiaDayRange(indiaDate());
    const earlier = await strapi.db.query(INVOICE).findMany({
      where: { ...org, customer: { id: customer.id }, status: "paid", createdAt: { $gte: start, $lt: end } },
      select: ["id", "total"],
    });
    const dayTotal = toRupees(sumPaise(earlier.map((invoice: any) => Number(invoice.total))) + toPaise(rounded));
    panRequired = dayTotal >= shop.panThreshold;
    cashAllowed = Math.max(0, toRupees(toPaise(shop.cashReceiptLimit) - 1 - toPaise(await cashTakenToday(strapi, staff, customer.id))));
  } else if (toPaise(rounded) >= toPaise(shop.panThreshold)) {
    panRequired = true;
  }

  return {
    branchId,
    customer,
    estimate,
    rateCard: card,
    lines,
    taxableValue: toRupees(taxablePaise),
    gst: toRupees(gstPaise),
    cgst,
    sgst,
    roundOff,
    total: rounded,
    oldGold: { lines: oldGoldLines, value: toRupees(oldGoldPaise) },
    creditNotes: creditUse,
    creditNoteUsed: toRupees(sumPaise(creditUse.map((entry: { used: number }) => entry.used))),
    advances: advanceUse,
    advanceUsed: toRupees(sumPaise(advanceUse.map((entry: { used: number }) => entry.used))),
    amountDue: toRupees(remaining),
    panRequired,
    panMissing: panRequired && !customer?.pan,
    cashAllowed,
    discountLimitPercent: limit,
    warnings,
  };
}

/** The bill as the counter sees it while building it. */
export function serializeQuote(bill: Bill) {
  return {
    customer: bill.customer ? { id: bill.customer.id, name: bill.customer.name, phone: bill.customer.phone, pan: bill.customer.pan ?? null } : null,
    estimate: bill.estimate ? { id: bill.estimate.id, number: bill.estimate.number } : null,
    rateCard: { id: bill.rateCard.id, effectiveFrom: bill.rateCard.effectiveFrom },
    lines: bill.lines,
    taxableValue: bill.taxableValue,
    gst: bill.gst,
    cgst: bill.cgst,
    sgst: bill.sgst,
    roundOff: bill.roundOff,
    total: bill.total,
    oldGold: bill.oldGold,
    creditNotes: bill.creditNotes,
    creditNoteUsed: bill.creditNoteUsed,
    advances: bill.advances,
    advanceUsed: bill.advanceUsed,
    amountDue: bill.amountDue,
    panRequired: bill.panRequired,
    panMissing: bill.panMissing,
    cashAllowed: bill.cashAllowed,
    discountLimitPercent: bill.discountLimitPercent,
    warnings: bill.warnings,
  };
}
