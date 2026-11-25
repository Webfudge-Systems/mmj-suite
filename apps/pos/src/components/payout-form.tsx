"use client";

import { useState } from "react";
import { errorMessage } from "@webfudge/auth/components";
import { Alert, Button } from "@webfudge/ui";
import { CashOverrideNotice, useCashOverride } from "./cash-override";
import { PaymentsEditor, newPaymentRow, paidPaise, toPayments, type PaymentRow } from "./payments";

type Payout = ReturnType<typeof toPayments>;

/**
 * Pays money back to a customer (an advance refund, a credit note payout):
 * split across methods, with the cash limit warning and a manager's override.
 */
export function PayoutForm({
  due,
  label,
  submitLabel,
  onSubmit,
}: {
  due: number;
  label: string;
  submitLabel: string;
  onSubmit: (payouts: Payout, cashOverride?: { reason: string }) => Promise<unknown>;
}) {
  const [payouts, setPayouts] = useState<PaymentRow[]>(() => [newPaymentRow("bank_transfer")]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cash = payouts.filter((row) => row.mode === "cash").reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const override = useCashOverride(cash);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(toPayments(payouts), override.value);
    } catch (cause) {
      if (!override.catchLimit(cause)) setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid max-w-md gap-3 py-2">
      <PaymentsEditor
        rows={payouts}
        onChange={(next) => {
          setPayouts(next);
          setError(null);
          override.reset();
        }}
        due={due}
        label={label}
      />
      <CashOverrideNotice state={override} />
      {error && <Alert tone="risk">{error}</Alert>}
      <Button variant="danger" size="sm" loading={busy} disabled={paidPaise(payouts) !== Math.round(due * 100) || override.blocking} onClick={pay} className="justify-self-start">
        {override.value ? `Approve cash and ${submitLabel.toLowerCase()}` : submitLabel}
      </Button>
    </div>
  );
}
