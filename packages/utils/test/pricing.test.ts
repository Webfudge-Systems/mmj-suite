import { describe, expect, it } from "vitest";
import { calculatePrice, percentChange, rateFor } from "../src/pricing";

describe("calculatePrice", () => {
  it("matches the blueprint's worked example to the paisa", () => {
    const price = calculatePrice({
      netWeight: 40.25,
      ratePerGram: 11500,
      making: { type: "per_gram", amount: 650 },
      stoneValue: 4800,
      otherCharges: 45,
    });

    expect(price).toEqual({
      metalValue: 462875,
      makingCharge: 26162.5,
      stoneValue: 4800,
      otherCharges: 45,
      discount: 0,
      taxableValue: 493882.5,
      gst: 14816.48,
      total: 508698.98,
      roundedTotal: 508699,
      roundOff: 0.02,
    });
  });

  it("charges making as a percentage of metal value", () => {
    const price = calculatePrice({
      netWeight: 10,
      ratePerGram: 10000,
      making: { type: "percent", percent: 12 },
    });
    expect(price.metalValue).toBe(100000);
    expect(price.makingCharge).toBe(12000);
    expect(price.gst).toBe(3360);
    expect(price.total).toBe(115360);
  });

  it("charges a fixed making amount", () => {
    const price = calculatePrice({ netWeight: 2, ratePerGram: 150, making: { type: "fixed", amount: 500 } });
    expect(price.makingCharge).toBe(500);
    expect(price.taxableValue).toBe(800);
  });

  it("avoids floating-point drift on milligram weights", () => {
    const price = calculatePrice({ netWeight: 0.1 + 0.2, ratePerGram: 10000, making: { type: "fixed", amount: 0 } });
    expect(price.metalValue).toBe(3000);
  });

  it("takes the discount off before tax", () => {
    const price = calculatePrice({
      netWeight: 10,
      ratePerGram: 10000,
      making: { type: "per_gram", amount: 500 },
      discount: 1000,
    });
    expect(price.taxableValue).toBe(104000);
    expect(price.gst).toBe(3120);
  });

  it("rounds the total down when the paise are under fifty", () => {
    const price = calculatePrice({ netWeight: 1, ratePerGram: 100.1, making: { type: "fixed", amount: 0 }, gstRate: 0 });
    expect(price.roundedTotal).toBe(100);
    expect(price.roundOff).toBe(-0.1);
  });

  it("rejects a discount larger than the price", () => {
    expect(() =>
      calculatePrice({ netWeight: 1, ratePerGram: 100, making: { type: "fixed", amount: 0 }, discount: 500 }),
    ).toThrow("Discount is larger than the price");
  });
});

describe("rateFor", () => {
  it("finds the rate for a purity", () => {
    const rates = [
      { purity: "24KT" as const, ratePerGram: 12500 },
      { purity: "22KT" as const, ratePerGram: 11500 },
    ];
    expect(rateFor(rates, "22KT")).toBe(11500);
    expect(rateFor(rates, "925")).toBeUndefined();
  });
});

describe("percentChange", () => {
  it("returns the move as a percentage", () => {
    expect(percentChange(10000, 10300)).toBeCloseTo(3);
    expect(percentChange(null, 10300)).toBe(0);
  });
});
