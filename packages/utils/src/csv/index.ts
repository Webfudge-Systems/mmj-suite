/**
 * Reads CSV as exported by Excel, Tally and most billing software: comma
 * separated, double quotes around fields that contain commas, quotes or line
 * breaks, "" for a literal quote, CRLF or LF line ends, optional BOM.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^﻿/, "");

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

/** "Gross Weight (g)" → "grossweightg". Lets people keep their own column spelling. */
export function headerKey(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Turns CSV rows into records keyed by the field names the caller asks for.
 * `fields` maps each field to the header spellings it accepts.
 */
export function csvRecords<F extends string>(rows: string[][], fields: Record<F, string[]>) {
  const [header = [], ...body] = rows;
  const keys = header.map(headerKey);
  const columns = {} as Record<F, number>;
  const missing: F[] = [];
  for (const [field, names] of Object.entries(fields) as [F, string[]][]) {
    const index = keys.findIndex((key) => names.map(headerKey).includes(key));
    if (index === -1) missing.push(field);
    columns[field] = index;
  }
  const records = body.map((cells) => {
    const record = {} as Record<F, string>;
    for (const field of Object.keys(fields) as F[]) {
      const index = columns[field];
      record[field] = index >= 0 ? (cells[index] ?? "").trim() : "";
    }
    return record;
  });
  return { records, missing };
}

/** One CSV cell: quoted when it holds a comma, quote or line break. */
function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Rows to CSV text that Excel opens directly (with a BOM so ₹ and Marathi survive). */
export function toCsv(rows: unknown[][]): string {
  return "﻿" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
}

/** Downloads rows as a .csv file in the browser. The first row is the header. */
export function downloadCsv(filename: string, rows: unknown[][]): void {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
