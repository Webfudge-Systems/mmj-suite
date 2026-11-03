import { GST_RATE_JEWELLERY, type Purity } from "@webfudge/config";

/**
 * The one price calculation used by the website, tablets and billing counter.
 *
 * Everything is worked in whole paise and milligrams so the same inputs give
 * the same rupee figure on every screen, with no floating-point drift.
 */

export type MakingCharge =
  | { type: "per_gram"; amount: number }
  | { type: "percent"; percent: number }
  | { type: "fixed"; amount: number };

export type PriceInput = {
  /** Metal-only weight in grams, up to three decimals. */
  netWeight: number;
  /** Rate for this piece's purity, in rupees per gram. */
  ratePerGram: number;
  making: MakingCharge;
  /** Value of stones set in the piece, in rupees. */
  stoneValue?: number;
  /** Hallmark and other per-piece charges, in rupees. */
  otherCharges?: number;
  /** Discount taken off before tax, in rupees. */
  discount?: number;
  gstRate?: number;
};

export type PriceBreakdown = {
  metalValue: number;
  makingCharge: number;
  stoneValue: number;
  otherCharges: number;
  discount: number;
  taxableValue: number;
  gst: number;
  total: number;
  /** Total rounded to the nearest rupee, as printed on the bill. */
  roundedTotal: number;
  roundOff: number;
};

const toPaise = (rupees: number) => Math.round(rupees * 100);
const toRupees = (paise: number) => paise / 100;
const toMilligrams = (grams: number) => Math.round(grams * 1000);

export function calculatePrice(input: PriceInput): PriceBreakdown {
  if (input.netWeight < 0) throw new Error("Net weight cannot be negative");
  if (input.ratePerGram < 0) throw new Error("Rate cannot be negative");

  const milligrams = toMilligrams(input.netWeight);
  const ratePaise = toPaise(input.ratePerGram);
  const metal = Math.round((milligrams * ratePaise) / 1000);

  let making: number;
  switch (input.making.type) {
    case "per_gram":
      making = Math.round((milligrams * toPaise(input.making.amount)) / 1000);
      break;
    case "percent":
      making = Math.round((metal * input.making.percent) / 100);
      break;
    case "fixed":
      making = toPaise(input.making.amount);
      break;
  }

  const stones = toPaise(input.stoneValue ?? 0);
  const other = toPaise(input.otherCharges ?? 0);
  const discount = toPaise(input.discount ?? 0);
  const taxable = metal + making + stones + other - discount;
  if (taxable < 0) throw new Error("Discount is larger than the price");

  const gst = Math.round(taxable * (input.gstRate ?? GST_RATE_JEWELLERY));
  const total = taxable + gst;
  const rounded = Math.round(total / 100) * 100;

  return {
    metalValue: toRupees(metal),
    makingCharge: toRupees(making),
    stoneValue: toRupees(stones),
    otherCharges: toRupees(other),
    discount: toRupees(discount),
    taxableValue: toRupees(taxable),
    gst: toRupees(gst),
    total: toRupees(total),
    roundedTotal: toRupees(rounded),
    roundOff: toRupees(rounded - total),
  };
}

export type RateLike = { purity: Purity; ratePerGram: number };

/** The rate for a purity from a rate card, or undefined if it was not quoted. */
export function rateFor(rates: readonly RateLike[], purity: Purity): number | undefined {
  return rates.find((rate) => rate.purity === purity)?.ratePerGram;
}

/** Percentage move from one rate to the next; 0 when there is nothing to compare. */
export function percentChange(previous: number | null | undefined, next: number): number {
  if (!previous) return 0;
  return ((next - previous) / previous) * 100;
}
