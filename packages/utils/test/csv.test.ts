import { describe, expect, it } from "vitest";
import { csvRecords, parseCsv } from "../src/csv";

describe("parseCsv", () => {
  it("handles quotes, commas, line breaks and BOM", () => {
    const text = '﻿tag,name,notes\r\nA1,"Kada, plain","said ""rush""\nby phone"\r\nA2,Ring,\r\n\r\n';
    expect(parseCsv(text)).toEqual([
      ["tag", "name", "notes"],
      ["A1", "Kada, plain", 'said "rush"\nby phone'],
      ["A2", "Ring", ""],
    ]);
  });

  it("reads a last line without a line break", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("csvRecords", () => {
  it("matches headers however they are written", () => {
    const rows = parseCsv("Old Tag,Gross Weight (g),Purity\nX1, 12.5 ,22KT");
    const { records, missing } = csvRecords(rows, {
      legacyTag: ["old_tag", "old tag"],
      grossWeight: ["gross_weight", "gross weight (g)", "gross"],
      purity: ["purity"],
      huid: ["huid"],
    });
    expect(records).toEqual([{ legacyTag: "X1", grossWeight: "12.5", purity: "22KT", huid: "" }]);
    expect(missing).toEqual(["huid"]);
  });
});
