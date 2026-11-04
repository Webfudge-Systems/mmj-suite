/**
 * Server copy of packages/utils/src/pricing. Invoices are priced here, never
 * in the browser. Both copies are tested against the same worked examples;
 * keep them in step.
 */

export const GST_RATE_JEWELLERY = 0.03;
export const HALLMARK_CHARGE_PER_PIECE = 45;

export type Making = { type: "per_gram" | "percent" | "fixed"; value: number };

export type LineInput = {
  netWeight: number;
  /** Rupees per gram for the piece's purity. */
  ratePerGram: number;
  /** Metal value worked out elsewhere, such as part at a booked rate. Overrides weight × rate. */
  metalValue?: number;
  making: Making;
  stoneValue?: number;
  otherCharges?: number;
  /** Taken off the making charge, in rupees. */
  makingDiscount?: number;
  gstRate?: number;
};

export type LinePrice = {
  metalValue: number;
  makingCharge: number;
  makingDiscount: number;
  stoneValue: number;
  otherCharges: number;
  taxableValue: number;
  gst: number;
  total: number;
};

export const toPaise = (rupees: number) => Math.round(rupees * 100);
export const toRupees = (paise: number) => paise / 100;
const toMilligrams = (grams: number) => Math.round(grams * 1000);

export class PricingError extends Error {}

/** Prices one piece. All arithmetic in paise and milligrams. */
export function priceLine(input: LineInput): LinePrice {
  if (!(input.netWeight > 0)) throw new PricingError("Net weight must be above zero.");
  if (!(input.ratePerGram > 0)) throw new PricingError("There is no rate for this purity.");
  const mg = toMilligrams(input.netWeight);
  const metal = input.metalValue !== undefined ? toPaise(input.metalValue) : Math.round((mg * toPaise(input.ratePerGram)) / 1000);

  let making: number;
  switch (input.making.type) {
    case "per_gram":
      making = Math.round((mg * toPaise(input.making.value)) / 1000);
      break;
    case "percent":
      making = Math.round((metal * input.making.value) / 100);
      break;
    case "fixed":
      making = toPaise(input.making.value);
      break;
    default:
      throw new PricingError("Unknown making charge type.");
  }

  const discount = toPaise(input.makingDiscount ?? 0);
  if (discount < 0) throw new PricingError("A discount cannot be negative.");
  if (discount > making) throw new PricingError("The discount is more than the making charge.");
  const stones = toPaise(input.stoneValue ?? 0);
  const other = toPaise(input.otherCharges ?? 0);
  const taxable = metal + making - discount + stones + other;
  const gst = Math.round(taxable * (input.gstRate ?? GST_RATE_JEWELLERY));

  return {
    metalValue: toRupees(metal),
    makingCharge: toRupees(making),
    makingDiscount: toRupees(discount),
    stoneValue: toRupees(stones),
    otherCharges: toRupees(other),
    taxableValue: toRupees(taxable),
    gst: toRupees(gst),
    total: toRupees(taxable + gst),
  };
}

/** Rounds a bill to the nearest rupee, as printed. */
export function roundBill(total: number): { rounded: number; roundOff: number } {
  const paise = toPaise(total);
  const rounded = Math.round(paise / 100) * 100;
  return { rounded: toRupees(rounded), roundOff: toRupees(rounded - paise) };
}

/**
 * Splits a line's GST into central and state halves for an intra-state sale.
 * Any odd paisa goes to the central half so the halves always add back up.
 */
export function splitGst(gst: number): { cgst: number; sgst: number } {
  const paise = toPaise(gst);
  const sgst = Math.floor(paise / 2);
  return { cgst: toRupees(paise - sgst), sgst: toRupees(sgst) };
}

export type OldGoldInput = {
  grossWeight: number;
  /** Stones, wax, dirt and anything else that is not metal. */
  lessWeight: number;
  /** Tested purity as parts per thousand of pure metal, e.g. 916. */
  fineness: number;
  /** Today's rate for pure metal (24KT or silver 999), rupees per gram. */
  pureRate: number;
  /** Melting loss and margin, as a percentage of value. */
  deductionPercent: number;
};

/** Value of old gold or silver bought from a customer: pure weight × pure rate, less the deduction. */
export function valueOldMetal(input: OldGoldInput) {
  if (!(input.grossWeight > 0)) throw new PricingError("Weight must be above zero.");
  if (input.lessWeight < 0 || input.lessWeight >= input.grossWeight) throw new PricingError("Less weight must be below the gross weight.");
  if (!(input.fineness > 0 && input.fineness <= 1000)) throw new PricingError("Tested purity must be between 1 and 1000.");
  if (input.deductionPercent < 0 || input.deductionPercent >= 100) throw new PricingError("Deduction must be between 0 and 100%.");
  const netMg = toMilligrams(input.grossWeight) - toMilligrams(input.lessWeight);
  const fineMg = Math.round((netMg * input.fineness) / 1000);
  const gross = Math.round((fineMg * toPaise(input.pureRate)) / 1000);
  const value = Math.round((gross * (100 - input.deductionPercent)) / 100);
  return { netWeight: netMg / 1000, fineWeight: fineMg / 1000, value: toRupees(value) };
}

/** Financial year label for India (April to March): 2026-11-04 → "2627". */
export function financialYear(date: Date): string {
  const year = date.getUTCFullYear();
  const start = date.getUTCMonth() >= 3 ? year : year - 1;
  return `${String(start).slice(2)}${String(start + 1).slice(2)}`;
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowHundred(n: number): string {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`;
}

function belowThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return [hundreds ? `${ONES[hundreds]} Hundred` : "", rest ? belowHundred(rest) : ""].filter(Boolean).join(" ");
}

/** ₹5,08,699 → "Rupees Five Lakh Eight Thousand Six Hundred Ninety Nine Only", in the Indian system. */
export function rupeesInWords(amount: number): string {
  const paiseTotal = toPaise(Math.abs(amount));
  let rupees = Math.floor(paiseTotal / 100);
  const paise = paiseTotal % 100;
  if (rupees === 0 && paise === 0) return "Rupees Zero Only";

  const parts: string[] = [];
  const crore = Math.floor(rupees / 10_000_000);
  rupees %= 10_000_000;
  const lakh = Math.floor(rupees / 100_000);
  rupees %= 100_000;
  const thousand = Math.floor(rupees / 1000);
  rupees %= 1000;
  if (crore) parts.push(`${crore >= 1000 ? belowThousand(Math.floor(crore / 1000)) + " Thousand " + belowThousand(crore % 1000) : crore >= 100 ? belowThousand(crore) : belowHundred(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (rupees) parts.push(belowThousand(rupees));

  const words = parts.join(" ").replace(/\s+/g, " ").trim();
  return `Rupees ${words || "Zero"}${paise ? ` and ${belowHundred(paise)} Paise` : ""} Only`;
}
