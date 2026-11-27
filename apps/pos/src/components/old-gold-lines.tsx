"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button, Input, Select } from "@webfudge/ui";
import type { OldGoldLine } from "@webfudge/utils/api";

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

const label = "mb-1 block text-[12px] font-semibold text-ash";

/**
 * Lines of old gold or silver as weighed and tested at the counter. Values come from the server:
 * pass `values` for the value alone, or `valued` for the net and fine weight as well.
 */
export function OldGoldEditor({ rows, onChange, values, valued }: { rows: OldGoldRow[]; onChange: (rows: OldGoldRow[]) => void; values?: number[]; valued?: OldGoldLine[] }) {
  const update = (key: number, patch: Partial<OldGoldRow>) => onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  // Server lines come back only for weighed rows, in the same order.
  const weighed = rows.filter((row) => Number(row.grossWeight) > 0 && Number(row.fineness) > 0).map((row) => row.key);
  return (
    <div className="grid gap-3">
      {rows.map((row, index) => {
        const at = weighed.indexOf(row.key);
        const line = at >= 0 ? valued?.[at] : undefined;
        const value = line?.value ?? (at >= 0 ? values?.[at] : undefined);
        const custom = row.metal === "gold" && !FINENESS.some(([option]) => option === row.fineness);
        return (
          <div key={row.key} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-bold tracking-wide text-navy uppercase">Item {index + 1}</span>
              {rows.length > 1 && (
                <button type="button" className="rounded-md p-1.5 text-ash hover:bg-risk/10 hover:text-risk" onClick={() => onChange(rows.filter((entry) => entry.key !== row.key))} aria-label={`Remove item ${index + 1}`}>
                  <Trash2 className="size-4" aria-hidden />
                </button>
              )}
            </div>
            <label className="block">
              <span className={label}>What it is</span>
              <Input id={`og-desc-${row.key}`} placeholder="Like old bangle, broken chain" value={row.description} onChange={(event) => update(row.key, { description: event.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <label className="block">
                <span className={label}>Metal</span>
                <Select id={`og-metal-${row.key}`} value={row.metal} onChange={(event) => update(row.key, { metal: event.target.value as OldGoldRow["metal"], fineness: event.target.value === "silver" ? "925" : "916" })}>
                  <option value="gold">Gold</option>
                  <option value="silver">Silver</option>
                </Select>
              </label>
              <label className="block">
                <span className={label}>Gross (g)</span>
                <Input id={`og-gross-${row.key}`} placeholder="0.000" inputMode="decimal" value={row.grossWeight} onChange={(event) => update(row.key, { grossWeight: event.target.value })} className="tabular-nums" />
              </label>
              <label className="block">
                <span className={label}>Less (g)</span>
                <Input id={`og-less-${row.key}`} placeholder="Stones, dirt" inputMode="decimal" value={row.lessWeight} onChange={(event) => update(row.key, { lessWeight: event.target.value })} className="tabular-nums" />
              </label>
              <label className="block">
                <span className={label}>Tested purity</span>
                {row.metal === "gold" ? (
                  <Select id={`og-fine-${row.key}`} value={custom ? "custom" : row.fineness} onChange={(event) => update(row.key, { fineness: event.target.value === "custom" ? "" : event.target.value })}>
                    {FINENESS.map(([option, text]) => (
                      <option key={option} value={option}>
                        {text}
                      </option>
                    ))}
                    <option value="custom">Other…</option>
                  </Select>
                ) : (
                  <Input id={`og-fine-${row.key}`} placeholder="925" inputMode="numeric" value={row.fineness} onChange={(event) => update(row.key, { fineness: event.target.value })} className="tabular-nums" />
                )}
              </label>
            </div>
            {custom && (
              <label className="block">
                <span className={label}>Tester reading, per thousand</span>
                <Input id={`og-fine-custom-${row.key}`} placeholder="Like 905" inputMode="numeric" value={row.fineness} onChange={(event) => update(row.key, { fineness: event.target.value })} className="tabular-nums" />
              </label>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-[13px] tabular-nums">
              {value !== undefined ? (
                <>
                  <span className="text-ash">{line ? `Net ${line.netWeight.toFixed(3)} g · fine ${line.fineWeight.toFixed(3)} g · less ${line.deductionPercent}%` : "Valued at today's rate"}</span>
                  <span className="font-semibold text-ink">₹{value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </>
              ) : (
                <span className="text-ash">The value appears once it is weighed.</span>
              )}
            </div>
          </div>
        );
      })}
      <Button variant="secondary" size="sm" className="justify-self-start" onClick={() => onChange([...rows, newOldGoldRow()])}>
        <Plus className="size-4" aria-hidden />
        Add another item
      </Button>
    </div>
  );
}
