import { describe, expect, it } from "vitest";
import {
  PricingError,
  financialYear,
  priceLine,
  roundBill,
  rupeesInWords,
  splitGst,
  valueOldMetal,
} from "../src/utils/pricing";

describe("priceLine", () => {
  it("matches the blueprint's worked example (same as the shared package)", () => {
    const line = priceLine({ netWeight: 40.25, ratePerGram: 11500, making: { type: "per_gram", value: 650 }, stoneValue: 4800, otherCharges: 45 });
    expect(line.taxableValue).toBe(493882.5);
    expect(line.gst).toBe(14816.48);
    expect(line.total).toBe(508698.98);
    expect(roundBill(line.total)).toEqual({ rounded: 508699, roundOff: 0.02 });
  });

  it("takes a making discount before tax", () => {
    const line = priceLine({ netWeight: 10, ratePerGram: 10000, making: { type: "percent", value: 12 }, makingDiscount: 2000 });
    expect(line.makingCharge).toBe(12000);
    expect(line.taxableValue).toBe(110000);
    expect(line.gst).toBe(3300);
  });

  it("refuses a discount larger than the making charge", () => {
    expect(() => priceLine({ netWeight: 1, ratePerGram: 100, making: { type: "fixed", value: 50 }, makingDiscount: 60 })).toThrow(PricingError);
  });
});

describe("splitGst", () => {
  it("halves GST and keeps odd paise", () => {
    expect(splitGst(14816.48)).toEqual({ cgst: 7408.24, sgst: 7408.24 });
    expect(splitGst(0.03)).toEqual({ cgst: 0.02, sgst: 0.01 });
  });
});

describe("valueOldMetal", () => {
  it("values old gold on pure weight less the deduction", () => {
    const result = valueOldMetal({ grossWeight: 10.5, lessWeight: 0.5, fineness: 916, pureRate: 12700, deductionPercent: 2 });
    expect(result.netWeight).toBe(10);
    expect(result.fineWeight).toBe(9.16);
    expect(result.value).toBe(114005.36);
  });

  it("rejects impossible tests", () => {
    expect(() => valueOldMetal({ grossWeight: 5, lessWeight: 5, fineness: 916, pureRate: 1, deductionPercent: 0 })).toThrow(PricingError);
    expect(() => valueOldMetal({ grossWeight: 5, lessWeight: 0, fineness: 1200, pureRate: 1, deductionPercent: 0 })).toThrow(PricingError);
  });
});

describe("metalValue override", () => {
  it("prices making on the metal value it is given", () => {
    // 4 g booked at 11,000 and 6 g at today's 12,000 = 116,000.
    const line = priceLine({ netWeight: 10, ratePerGram: 12000, metalValue: 116000, making: { type: "percent", value: 10 } });
    expect(line.metalValue).toBe(116000);
    expect(line.makingCharge).toBe(11600);
  });
});

describe("financialYear", () => {
  it("runs April to March", () => {
    expect(financialYear(new Date("2026-11-04T10:00:00Z"))).toBe("2627");
    expect(financialYear(new Date("2027-03-31T10:00:00Z"))).toBe("2627");
    expect(financialYear(new Date("2027-04-01T10:00:00Z"))).toBe("2728");
  });
});

describe("rupeesInWords", () => {
  it("uses lakh and crore", () => {
    expect(rupeesInWords(508699)).toBe("Rupees Five Lakh Eight Thousand Six Hundred Ninety Nine Only");
    expect(rupeesInWords(12500000)).toBe("Rupees One Crore Twenty Five Lakh Only");
    expect(rupeesInWords(45.5)).toBe("Rupees Forty Five and Fifty Paise Only");
    expect(rupeesInWords(0)).toBe("Rupees Zero Only");
  });
});
