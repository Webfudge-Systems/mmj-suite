"use client";

import { Button, Input, Select } from "@webfudge/ui";
import { PAYMENT_MODE_LABELS, type PaymentMode } from "@webfudge/utils/api";
import { formatINR } from "@webfudge/utils/formatters";

export type PaymentRow = { key: number; mode: PaymentMode; amount: string; reference: string };

let nextKey = 1;
export const newPaymentRow = (mode: PaymentMode = "upi", amount = ""): PaymentRow => ({ key: nextKey++, mode, amount, reference: "" });

export const paidPaise = (rows: PaymentRow[]) => rows.reduce((sum, row) => sum + Math.round((Number(row.amount) || 0) * 100), 0);

/** Split payment editor. "Rest by …" fills the remaining amount in one tap. */
export function PaymentsEditor({ rows, onChange, due, label = "Payments" }: { rows: PaymentRow[]; onChange: (rows: PaymentRow[]) => void; due: number; label?: string }) {
  const remaining = Math.round(due * 100) - paidPaise(rows);
  const update = (key: number, patch: Partial<PaymentRow>) => onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  function fillRest(mode: PaymentMode) {
    if (remaining <= 0) return;
    const amount = (remaining / 100).toFixed(2);
    const empty = rows.find((row) => !Number(row.amount));
    if (empty) update(empty.key, { mode, amount });
    else onChange([...rows, newPaymentRow(mode, amount)]);
  }

  return (
    <div className="grid gap-3">
      <span className="text-[13px] font-semibold">{label}</span>
      {rows.map((row) => (
        <div key={row.key} className="grid grid-cols-[120px_1fr] gap-2">
          <Select id={`pay-mode-${row.key}`} aria-label="Method" value={row.mode} onChange={(event) => update(row.key, { mode: event.target.value as PaymentMode })}>
            {Object.entries(PAYMENT_MODE_LABELS).map(([mode, text]) => (
              <option key={mode} value={mode}>
                {text}
              </option>
            ))}
          </Select>
          <Input id={`pay-amount-${row.key}`} aria-label="Amount" inputMode="decimal" value={row.amount} onChange={(event) => update(row.key, { amount: event.target.value })} placeholder="₹" className="tabular-nums" />
          {row.mode !== "cash" && (
            <Input
              id={`pay-ref-${row.key}`}
              aria-label="Reference"
              value={row.reference}
              onChange={(event) => update(row.key, { reference: event.target.value })}
              placeholder={row.mode === "upi" ? "UPI reference (optional)" : row.mode === "card" ? "Card slip number" : "Reference"}
              className="col-span-2"
            />
          )}
          {rows.length > 1 && (
            <button type="button" className="col-span-2 justify-self-end text-[12px] text-ash hover:text-risk" onClick={() => onChange(rows.filter((entry) => entry.key !== row.key))}>
              Remove
            </button>
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        {(["cash", "upi", "card", "bank_transfer"] as PaymentMode[]).map((mode) => (
          <Button key={mode} size="sm" variant="secondary" disabled={remaining <= 0} onClick={() => fillRest(mode)}>
            Rest by {PAYMENT_MODE_LABELS[mode]}
          </Button>
        ))}
      </div>
      <div className={`flex justify-between text-sm font-semibold tabular-nums ${remaining === 0 ? "text-ok" : remaining < 0 ? "text-risk" : "text-warn"}`}>
        <span>{remaining === 0 ? "Fully paid" : remaining > 0 ? "Still to collect" : "Paid too much by"}</span>
        <span>{formatINR(Math.abs(remaining) / 100)}</span>
      </div>
    </div>
  );
}

export const toPayments = (rows: PaymentRow[]) =>
  rows.filter((row) => Number(row.amount)).map((row) => ({ mode: row.mode, amount: Number(row.amount), reference: row.reference.trim() || null }));
