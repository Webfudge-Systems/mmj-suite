"use client";

import { Button, Input, Select } from "@webfudge/ui";

export type OldGoldRow = { key: number; description: string; metal: "gold" | "silver"; grossWeight: string; lessWeight: string; fineness: string };

let nextKey = 1;
export const newOldGoldRow = (): OldGoldRow => ({ key: nextKey++, description: "", metal: "gold", grossWeight: "", lessWeight: "", fineness: "916" });

/** Fineness the purity tester reports, with the usual karat equivalents. */
const FINENESS = [
  ["999", "999 (24K)"],
  ["916", "916 (22K)"],
  ["875", "875 (21K)"],
  ["750", "750 (18K)"],
  ["585", "585 (14K)"],
];

export const toOldGold = (rows: OldGoldRow[]) =>
  rows
    .filter((row) => Number(row.grossWeight) > 0 && Number(row.fineness) > 0)
    .map((row) => ({
      description: row.description,
      metal: row.metal,
      grossWeight: Number(row.grossWeight),
      lessWeight: Number(row.lessWeight || 0),
      fineness: Number(row.fineness),
    }));

/** Lines of old gold or silver as weighed and tested at the counter. Values come from the server. */
export function OldGoldEditor({ rows, onChange, values }: { rows: OldGoldRow[]; onChange: (rows: OldGoldRow[]) => void; values?: number[] }) {
  const update = (key: number, patch: Partial<OldGoldRow>) => onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  return (
    <div className="grid gap-3">
      {rows.map((row, index) => (
        <div key={row.key} className="grid gap-2 rounded-[var(--radius-control)] border border-line p-3 sm:grid-cols-6">
          <Input id={`og-desc-${row.key}`} aria-label="Description" placeholder="What it is, like old bangle" value={row.description} onChange={(event) => update(row.key, { description: event.target.value })} className="sm:col-span-2" />
          <Select id={`og-metal-${row.key}`} aria-label="Metal" value={row.metal} onChange={(event) => update(row.key, { metal: event.target.value as OldGoldRow["metal"], fineness: event.target.value === "silver" ? "925" : "916" })}>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
          </Select>
          <Input id={`og-gross-${row.key}`} aria-label="Gross weight in grams" placeholder="Gross g" inputMode="decimal" value={row.grossWeight} onChange={(event) => update(row.key, { grossWeight: event.target.value })} className="tabular-nums" />
          <Input id={`og-less-${row.key}`} aria-label="Less weight in grams" placeholder="Less g" inputMode="decimal" value={row.lessWeight} onChange={(event) => update(row.key, { lessWeight: event.target.value })} className="tabular-nums" />
          {row.metal === "gold" ? (
            <Select id={`og-fine-${row.key}`} aria-label="Tested purity" value={FINENESS.some(([value]) => value === row.fineness) ? row.fineness : "custom"} onChange={(event) => update(row.key, { fineness: event.target.value === "custom" ? "" : event.target.value })}>
              {FINENESS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
              <option value="custom">Other…</option>
            </Select>
          ) : (
            <Input id={`og-fine-${row.key}`} aria-label="Tested purity per thousand" placeholder="925" inputMode="numeric" value={row.fineness} onChange={(event) => update(row.key, { fineness: event.target.value })} />
          )}
          {row.metal === "gold" && !FINENESS.some(([value]) => value === row.fineness) && (
            <Input id={`og-fine-custom-${row.key}`} aria-label="Tested purity per thousand" placeholder="Tester reading, like 905" inputMode="numeric" value={row.fineness} onChange={(event) => update(row.key, { fineness: event.target.value })} className="sm:col-span-2" />
          )}
          <div className="flex items-center justify-between gap-2 sm:col-span-6">
            <span className="text-[13px] text-ash tabular-nums">{values?.[index] !== undefined ? `Value ₹${values[index].toLocaleString("en-IN")}` : "Value appears once weighed"}</span>
            <button type="button" className="text-[12px] text-ash hover:text-risk" onClick={() => onChange(rows.filter((entry) => entry.key !== row.key))}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <Button variant="secondary" size="sm" className="justify-self-start" onClick={() => onChange([...rows, newOldGoldRow()])}>
        Add old gold
      </Button>
    </div>
  );
}
