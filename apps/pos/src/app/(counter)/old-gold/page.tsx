"use client";

import { useEffect, useMemo, useState } from "react";
import { errorMessage, useApi, useBranch, useResource } from "@webfudge/auth/components";
import { CASH_PAYOUT_LIMIT } from "@webfudge/config";
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState, Field, Input, MissingHints, PageHeader, Table, Td, Th, Tr } from "@webfudge/ui";
import { PAYMENT_MODE_LABELS, type Customer, type OldGoldLine, type OldGoldRecord } from "@webfudge/utils/api";
import { formatDateTime, formatINR, formatWeight } from "@webfudge/utils/formatters";
import { CashOverrideNotice, useCashOverride } from "@/components/cash-override";
import { CustomerPicker } from "@/components/customer-picker";
import { OldGoldEditor, newOldGoldRow, toOldGold, type OldGoldRow } from "@/components/old-gold-lines";
import { PaymentsEditor, newPaymentRow, paidPaise, toPayments, type PaymentRow } from "@/components/payments";

export default function OldGoldPage() {
  const api = useApi();
  const { branch } = useBranch();
  const history = useResource<{ data: OldGoldRecord[] }>("/sales/old-gold");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [rows, setRows] = useState<OldGoldRow[]>(() => [newOldGoldRow()]);
  const [idProof, setIdProof] = useState("");
  const [payouts, setPayouts] = useState<PaymentRow[]>(() => [newPaymentRow("bank_transfer")]);
  const [valuation, setValuation] = useState<{ lines: OldGoldLine[]; total: number } | null>(null);
  const [valueError, setValueError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<OldGoldRecord | null>(null);
  const cashPaise = payouts.filter((row) => row.mode === "cash").reduce((sum, row) => sum + Math.round((Number(row.amount) || 0) * 100), 0);
  const override = useCashOverride(cashPaise / 100);

  const lines = useMemo(() => toOldGold(rows), [rows]);

  // A changed payout makes any earlier refusal stale: clear it, and the cash warning with it.
  function changePayouts(next: PaymentRow[]) {
    setPayouts(next);
    setError(null);
    override.reset();
  }

  // The server values the metal at today's rate as soon as it is weighed and tested.
  useEffect(() => {
    if (!lines.length) return;
    let active = true;
    const timer = window.setTimeout(() => {
      api
        .post<{ data: { lines: OldGoldLine[]; total: number } }>("/sales/old-gold/quote", { lines })
        .then(({ data }) => {
          if (!active) return;
          setValuation(data);
          setValueError(null);
        })
        .catch((cause) => active && setValueError(errorMessage(cause)));
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [api, lines]);

  const shown = lines.length ? valuation : null;
  const left = shown ? Math.round(shown.total * 100) - paidPaise(payouts) : 0;
  // Everything still needed before the purchase can be recorded, said plainly next to the button.
  const missing = [
    !customer && "Choose who is selling, at the top left.",
    idProof.trim().length < 4 && "Enter their ID proof, like Aadhaar ending 1234.",
    left > 0 && `Payments are ${formatINR(left / 100)} short of the total.`,
    left < 0 && `Payments are ${formatINR(-left / 100)} more than the total.`,
    override.blocking && "Approve the cash above, or pay part of it by UPI or bank transfer.",
  ];

  async function save() {
    if (!branch || !shown) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ data: OldGoldRecord }>("/sales/old-gold", {
        branchId: branch.id,
        customerId: customer?.id,
        lines,
        idProof,
        payouts: toPayments(payouts),
        ...(override.value ? { cashOverride: override.value } : {}),
      });
      setDone(data);
      setRows([newOldGoldRow()]);
      setPayouts([newPaymentRow("bank_transfer")]);
      override.reset();
      setValuation(null);
      setIdProof("");
      history.reload();
    } catch (cause) {
      if (!override.catchLimit(cause)) setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Old gold" description="Buy old gold or silver outright. Old gold taken against a bill is entered on the bill itself." />
      {done && <Alert tone="ok" title={`${done.number} recorded`}>Paid {formatINR(done.totalValue)} to {done.customer?.name}.</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Seller" />
          <CardBody className="grid gap-4">
            <CustomerPicker value={customer} onChange={setCustomer} />
            <Field label="ID proof" htmlFor="og-id" hint="Required for every purchase, like Aadhaar ending 1234.">
              <Input id="og-id" value={idProof} onChange={(event) => setIdProof(event.target.value)} placeholder="Aadhaar ending 1234" className={shown && idProof.trim().length < 4 ? "border-warn ring-2 ring-warn/20" : undefined} />
            </Field>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="What they are selling" description="Valued at today's 24KT (or 999 silver) rate on the tested purity, less the shop's deduction." />
          <CardBody className="grid gap-3">
            <OldGoldEditor rows={rows} onChange={setRows} values={shown?.lines.map((line) => line.value)} />
            {valueError && <Alert tone="risk">{valueError}</Alert>}
          </CardBody>
        </Card>
      </div>

      {shown && (
        <Card>
          <CardBody className="grid max-w-xl gap-4">
            <PaymentsEditor rows={payouts} onChange={changePayouts} due={shown.total} label={`Pay the customer ${formatINR(shown.total)}`} />
            <CashOverrideNotice state={override} />
            {error && <Alert tone="risk">{error}</Alert>}
            <Button
              variant="gold"
              onClick={save}
              loading={busy}
              disabled={missing.some(Boolean)}
              className="justify-self-start"
            >
              {override.value ? "Approve cash and record purchase" : "Record purchase and pay"}
            </Button>
            <MissingHints items={missing} />
            {!override.limit && <p className="text-[12px] text-ash">Cash up to {formatINR(CASH_PAYOUT_LIMIT)} goes straight through. Above that, the owner or a branch manager approves it right here.</p>}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Recent" />
        {!history.data?.data.length ? (
          <EmptyState title="Nothing yet" />
        ) : (
          <Table minWidth={720}>
            <thead>
              <tr>
                <Th>Number</Th>
                <Th>Type</Th>
                <Th>Customer</Th>
                <Th align="right">Fine weight</Th>
                <Th align="right">Value</Th>
                <Th>When</Th>
              </tr>
            </thead>
            <tbody>
              {history.data.data.map((record) => (
                <Tr key={record.id}>
                  <Td className="font-mono font-semibold">{record.number}</Td>
                  <Td>
                    <Badge tone={record.kind === "exchange" ? "navy" : "gold"}>{record.kind === "exchange" ? `Against ${record.invoice?.number ?? "a bill"}` : "Bought"}</Badge>
                  </Td>
                  <Td>{record.customer?.name}</Td>
                  <Td align="right">{formatWeight(record.lines.reduce((sum, line) => sum + line.fineWeight, 0))}</Td>
                  <Td align="right">
                    {formatINR(record.totalValue)}
                    {record.payouts.length > 0 && <span className="block text-[11px] text-ash">{record.payouts.map((payout) => PAYMENT_MODE_LABELS[payout.mode]).join(", ")}</span>}
                  </Td>
                  <Td>{formatDateTime(record.createdAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
