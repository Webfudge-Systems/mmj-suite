import type { Purity, Valuable } from "@/types";
import { rateFor } from "@/data/rates";

/** GST is 3% on the metal and making, 18% on stones and labour services. */
export const GST_METAL = 0.03;
export const GST_STONE = 0.18;

/** BIS hallmarking is billed per piece at the government-notified rate. */
export const HALLMARK_CHARGE = 45;

export const FREE_SHIPPING_THRESHOLD = 25_000;
export const SHIPPING_FEE = 250;

/** Karat purity expressed as a fraction of pure metal. */
const fineness: Record<Purity, number> = {
  "24KT": 24 / 24,
  "22KT": 22 / 24,
  "18KT": 18 / 24,
  "14KT": 14 / 24,
  "950PT": 0.95,
  "925": 0.925,
};

export type PriceBreakup = {
  metalValue: number;
  makingCharge: number;
  stoneCost: number;
  hallmarkCharge: number;
  gst: number;
  total: number;
};

/**
 * The valuation the showroom quotes at the counter. Metal is valued on net
 * weight at the day's rate scaled by purity; making is a percentage of that;
 * stones are billed flat and taxed at the higher rate.
 */
export function priceBreakup(product: Valuable): PriceBreakup {
  const ratePerGram = rateFor(product.metal, product.purity);
  const metalValue = product.netWeight * ratePerGram * fineness[product.purity];
  const makingCharge = metalValue * (product.makingChargePercent / 100);
  const stoneCost = product.stoneCost ?? 0;
  const gst = (metalValue + makingCharge) * GST_METAL + stoneCost * GST_STONE;

  return {
    metalValue,
    makingCharge,
    stoneCost,
    hallmarkCharge: HALLMARK_CHARGE,
    gst,
    total: metalValue + makingCharge + stoneCost + HALLMARK_CHARGE + gst,
  };
}

export function shippingFor(subtotal: number) {
  return subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FEE;
}
