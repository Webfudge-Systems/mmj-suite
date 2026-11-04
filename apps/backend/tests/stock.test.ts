import { describe, expect, it } from "vitest";
import {
  compareAudit,
  formatDesignCode,
  formatTagNumber,
  metalForPurity,
  netWeight,
  normaliseCode,
  normaliseHuid,
  StockRuleError,
} from "../src/utils/stock";

describe("netWeight", () => {
  it("subtracts stones to the milligram", () => {
    expect(netWeight(42.35, 2.1)).toBe(40.25);
    expect(netWeight(10.0005, 0)).toBe(10.001);
  });

  it("rejects impossible weights", () => {
    expect(() => netWeight(0, 0)).toThrow(StockRuleError);
    expect(() => netWeight(5, -1)).toThrow("Stone weight cannot be negative.");
    expect(() => netWeight(5, 5)).toThrow("Stone weight must be less than gross weight.");
  });
});

describe("codes", () => {
  it("formats tag and design numbers", () => {
    expect(formatTagNumber("MMJ", "gold", 104233)).toBe("MMJ-G-104233");
    expect(formatTagNumber("MMJ", "silver", 7)).toBe("MMJ-S-000007");
    expect(formatDesignCode("NK", 218)).toBe("D-NK-0218");
  });

  it("matches scanned codes however they are typed", () => {
    expect(normaliseCode("  mmj-g-000001 ")).toBe("MMJ-G-000001");
  });

  it("accepts only six-character HUIDs", () => {
    expect(normaliseHuid(" ab12c3 ")).toBe("AB12C3");
    expect(normaliseHuid("")).toBeNull();
    expect(() => normaliseHuid("AB12")).toThrow("must be six letters or digits");
  });

  it("knows the metal of each purity", () => {
    expect(metalForPurity("22KT")).toBe("gold");
    expect(metalForPurity("925")).toBe("silver");
    expect(() => metalForPurity("21KT")).toThrow(StockRuleError);
  });
});

describe("compareAudit", () => {
  const expected = [
    { id: 1, tagNumber: "MMJ-G-000001", locationId: 10 },
    { id: 2, tagNumber: "MMJ-G-000002", locationId: 10 },
    { id: 3, tagNumber: "MMJ-G-000003", locationId: 11 },
  ];

  it("finds matched, missing, misplaced and unknown pieces", () => {
    const result = compareAudit(expected, [
      { id: 1, code: "MMJ-G-000001", locationId: 10 },
      { id: 1, code: "MMJ-G-000001", locationId: 10 },
      { id: 9, code: "MMJ-G-000009", locationId: 12 },
      { id: null, code: "old-555", locationId: null },
      { id: 3, code: "MMJ-G-000003", locationId: 11 },
    ]);
    expect(result).toEqual({ matched: [1, 3], missing: [2], misplaced: [9], unknown: ["OLD-555"] });
  });
});
