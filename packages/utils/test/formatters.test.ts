import { describe, expect, it } from "vitest";
import { formatChange, formatDate, formatINR, formatPercent, formatRupees, formatWeight } from "../src/formatters";

describe("formatters", () => {
  it("groups rupees the Indian way", () => {
    expect(formatINR(508698.98)).toBe("₹5,08,698.98");
    expect(formatRupees(508698.98)).toBe("₹5,08,699");
  });

  it("shows weights to the milligram", () => {
    expect(formatWeight(40.25)).toBe("40.250 g");
  });

  it("signs changes", () => {
    expect(formatChange(85)).toBe("+₹85.00");
    expect(formatChange(-18)).toBe("−₹18.00");
    expect(formatPercent(1.256)).toBe("+1.26%");
  });

  it("formats dates in India time", () => {
    expect(formatDate("2026-11-01T20:00:00.000Z")).toBe("2 Nov 2026");
  });
});
