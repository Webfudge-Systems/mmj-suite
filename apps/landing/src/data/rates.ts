import type { Metal, MetalRate, Purity } from "@/types";

/**
 * Indicative counter rates per gram. A jeweller updates these each trading
 * morning; here they are static so the dummy catalogue stays deterministic.
 */
export const rateUpdatedOn = "2026-09-23";

export const metalRates: MetalRate[] = [
  {
    label: "Gold 24KT",
    purity: "24KT",
    metal: "gold",
    ratePerGram: 10_420,
    changePerGram: 85,
  },
  {
    label: "Gold 22KT",
    purity: "22KT",
    metal: "gold",
    ratePerGram: 10_420,
    changePerGram: 85,
  },
  {
    label: "Gold 18KT",
    purity: "18KT",
    metal: "gold",
    ratePerGram: 10_420,
    changePerGram: 85,
  },
  {
    label: "Gold 14KT",
    purity: "14KT",
    metal: "gold",
    ratePerGram: 10_420,
    changePerGram: 85,
  },
  {
    label: "Platinum 950",
    purity: "950PT",
    metal: "platinum",
    ratePerGram: 3_640,
    changePerGram: -18,
  },
  {
    label: "Silver 925",
    purity: "925",
    metal: "silver",
    ratePerGram: 132,
    changePerGram: 2.4,
  },
];

/**
 * Diamond and bullion pieces are still valued on their carrier metal, so the
 * lookup falls back to the gold rate rather than inventing a separate one.
 */
export function rateFor(metal: Metal, purity: Purity) {
  const exact = metalRates.find((rate) => rate.purity === purity);
  if (exact) return exact.ratePerGram;

  const byMetal = metalRates.find((rate) => rate.metal === metal);
  return byMetal?.ratePerGram ?? 10_420;
}

export function rateByPurity(purity: Purity) {
  return metalRates.find((rate) => rate.purity === purity);
}
