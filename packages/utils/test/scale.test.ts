import { describe, expect, it } from "vitest";
import { parseScaleLine } from "../src/scale";

describe("parseScaleLine", () => {
  it("reads the common scale formats", () => {
    expect(parseScaleLine("  12.345 g")).toBe(12.345);
    expect(parseScaleLine("ST,GS,+0012.345g")).toBe(12.345);
    expect(parseScaleLine("42.35")).toBe(42.35);
  });

  it("ignores lines without a usable weight", () => {
    expect(parseScaleLine("OL")).toBeNull();
    expect(parseScaleLine("-0.002 g")).toBeNull();
  });
});
