/**
 * Pure stock rules, kept free of Strapi so they can be unit tested.
 */

import { METAL_LETTERS, PURITIES, type Metal } from "./constants";

const round3 = (value: number) => Math.round(value * 1000) / 1000;

export class StockRuleError extends Error {}

/** Net (metal) weight is gross minus stones, to the milligram. */
export function netWeight(gross: number, stone: number): number {
  if (!Number.isFinite(gross) || gross <= 0) throw new StockRuleError("Gross weight must be above zero.");
  if (!Number.isFinite(stone) || stone < 0) throw new StockRuleError("Stone weight cannot be negative.");
  const net = round3(gross - stone);
  if (net <= 0) throw new StockRuleError("Stone weight must be less than gross weight.");
  return net;
}

export function metalForPurity(purity: string): Metal {
  const info = PURITIES.find((entry) => entry.code === purity);
  if (!info) throw new StockRuleError(`${purity || "That"} is not a purity the suite knows.`);
  return info.metal;
}

/** MMJ-G-000123: organization prefix, metal letter, six-digit running number. */
export function formatTagNumber(prefix: string, metal: Metal, sequence: number): string {
  return `${prefix}-${METAL_LETTERS[metal]}-${String(sequence).padStart(6, "0")}`;
}

/** D-NK-0218: design numbers run per category. */
export function formatDesignCode(categoryCode: string, sequence: number): string {
  return `D-${categoryCode}-${String(sequence).padStart(4, "0")}`;
}

/** Scanners and people type codes differently. Compare them case- and space-insensitively. */
export function normaliseCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

/** BIS HUID: exactly six letters or digits. */
export function normaliseHuid(huid: string | null | undefined): string | null {
  if (huid === null || huid === undefined || huid.trim() === "") return null;
  const value = normaliseCode(huid);
  if (!/^[A-Z0-9]{6}$/.test(value)) throw new StockRuleError(`HUID ${huid} must be six letters or digits.`);
  return value;
}

export type AuditExpected = { id: number; tagNumber: string; locationId: number | null };
export type AuditScan = { id: number | null; code: string; locationId: number | null };

export type AuditResult = {
  matched: number[];
  /** Expected here but not scanned. */
  missing: number[];
  /** Scanned here but the system has them elsewhere in the branch. */
  misplaced: number[];
  /** Codes that match no piece in stock at this branch. */
  unknown: string[];
};

/**
 * Compares what the system expects in the audited area with what was scanned.
 * A piece scanned twice counts once.
 */
export function compareAudit(expected: AuditExpected[], scans: AuditScan[]): AuditResult {
  const expectedIds = new Set(expected.map((entry) => entry.id));
  const scannedIds = new Set<number>();
  const unknown = new Set<string>();

  for (const scan of scans) {
    if (scan.id === null) unknown.add(normaliseCode(scan.code));
    else scannedIds.add(scan.id);
  }

  const matched = [...scannedIds].filter((id) => expectedIds.has(id));
  const misplaced = [...scannedIds].filter((id) => !expectedIds.has(id));
  const missing = expected.filter((entry) => !scannedIds.has(entry.id)).map((entry) => entry.id);

  return { matched, missing, misplaced, unknown: [...unknown] };
}

export function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
