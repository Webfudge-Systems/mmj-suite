"use client";

import { useEffect, useMemo, useState } from "react";
import { errorMessage, useApi, useBranch, useResource } from "@webfudge/auth/components";
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState, Field, Input, PageHeader, Table, Td, Th, Tr } from "@webfudge/ui";
import { PAYMENT_MODE_LABELS, type Customer, type OldGoldLine, type OldGoldRecord } from "@webfudge/utils/api";
import { formatDateTime, formatINR, formatWeight } from "@webfudge/utils/formatters";
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

  const lines = useMemo(() => toOldGold(rows), [rows]);

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

  async function save() {
    if (!branch || !shown) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ data: OldGoldRecord }>("/sales/old-gold", { branchId: branch.id, customerId: customer?.id, lines, idProof, payouts: toPayments(payouts) });
      setDone(data);
      setRows([newOldGoldRow()]);
      setPayouts([newPaymentRow("bank_transfer")]);
      setValuation(null);
      setIdProof("");
      history.reload();
    } catch (cause) {
      setError(errorMessage(cause));
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
              <Input id="og-id" value={idProof} onChange={(event) => setIdProof(event.target.value)} />
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
            <PaymentsEditor rows={payouts} onChange={setPayouts} due={shown.total} label={`Pay the customer ${formatINR(shown.total)}`} />
            {error && <Alert tone="risk">{error}</Alert>}
            <Button variant="gold" onClick={save} loading={busy} disabled={!customer || idProof.trim().length < 4 || paidPaise(payouts) !== Math.round(shown.total * 100)} className="justify-self-start">
              Record purchase and pay
            </Button>
            <p className="text-[12px] text-ash">Cash payouts above ₹10,000 to one person must go by bank transfer or UPI.</p>
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
