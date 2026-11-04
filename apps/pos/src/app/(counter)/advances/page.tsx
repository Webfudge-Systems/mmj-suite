"use client";

import { Fragment, useState } from "react";
import { errorMessage, useApi, useAuth, useBranch, useResource } from "@webfudge/auth/components";
import { PURITIES } from "@webfudge/config";
import { useCurrentRates } from "@webfudge/hooks";
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState, Field, Input, PageHeader, Select, Table, Td, Th, Tr } from "@webfudge/ui";
import type { Advance, Customer } from "@webfudge/utils/api";
import { formatDate, formatINR, formatWeight } from "@webfudge/utils/formatters";
import { CustomerPicker } from "@/components/customer-picker";
import { PaymentsEditor, newPaymentRow, paidPaise, toPayments, type PaymentRow } from "@/components/payments";
import { API_URL } from "@/lib/env";

const STATUS = { open: { label: "Open", tone: "gold" }, used: { label: "Used", tone: "ok" }, refunded: { label: "Refunded", tone: "neutral" } } as const;

function RefundForm({ advance, onDone }: { advance: Advance; onDone: () => void }) {
  const api = useApi();
  const [payouts, setPayouts] = useState<PaymentRow[]>(() => [newPaymentRow("bank_transfer")]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function refund() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/sales/advances/${advance.id}/refund`, { payouts: toPayments(payouts) });
      onDone();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid max-w-md gap-3 py-2">
      <PaymentsEditor rows={payouts} onChange={setPayouts} due={advance.balance} label={`Refund ${formatINR(advance.balance)}`} />
      {error && <Alert tone="risk">{error}</Alert>}
      <Button variant="danger" size="sm" loading={busy} disabled={paidPaise(payouts) !== Math.round(advance.balance * 100)} onClick={refund} className="justify-self-start">
        Refund advance
      </Button>
    </div>
  );
}

export default function AdvancesPage() {
  const api = useApi();
  const { hasRole } = useAuth();
  const { branch } = useBranch();
  const { card } = useCurrentRates(API_URL);
  const list = useResource<{ data: Advance[] }>("/sales/advances");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [amount, setAmount] = useState("");
  const [payments, setPayments] = useState<PaymentRow[]>(() => [newPaymentRow()]);
  const [lockPurity, setLockPurity] = useState("");
  const [lockWeight, setLockWeight] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refunding, setRefunding] = useState<number | null>(null);

  const total = Number(amount) || 0;
  const lockRate = card?.rates.find((line) => line.purity === lockPurity)?.ratePerGram;

  async function save() {
    if (!branch) return;
    setBusy(true);
    setError(null);
    try {
      await api.post("/sales/advances", {
        branchId: branch.id,
        customerId: customer?.id,
        payments: toPayments(payments),
        note,
        ...(lockPurity ? { lockedPurity: lockPurity, lockedWeight: Number(lockWeight) } : {}),
      });
      setAmount("");
      setPayments([newPaymentRow()]);
      setLockPurity("");
      setLockWeight("");
      setNote("");
      list.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Advances & bookings" description="Money paid ahead of a purchase. Booking a rate protects the customer if gold rises before they buy." />

      <Card>
        <CardHeader title="Take an advance" />
        <CardBody className="grid gap-5 lg:grid-cols-2">
          <div className="grid content-start gap-4">
            <CustomerPicker value={customer} onChange={setCustomer} />
            <Field label="Advance amount (₹)" htmlFor="adv-amount">
              <Input id="adv-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="tabular-nums" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Book today's rate for" htmlFor="adv-purity" hint="Optional">
                <Select id="adv-purity" value={lockPurity} onChange={(event) => setLockPurity(event.target.value)}>
                  <option value="">No rate booking</option>
                  {PURITIES.map((purity) => (
                    <option key={purity.code} value={purity.code}>
                      {purity.label}
                    </option>
                  ))}
                </Select>
              </Field>
              {lockPurity && (
                <Field label="Weight (g)" htmlFor="adv-weight" hint={lockRate ? `At ${formatINR(lockRate)}/g. Needs at least 10% of the value as advance.` : undefined}>
                  <Input id="adv-weight" inputMode="decimal" value={lockWeight} onChange={(event) => setLockWeight(event.target.value)} className="tabular-nums" />
                </Field>
              )}
            </div>
            <Field label="Note" htmlFor="adv-note" hint="Like the design they are waiting for.">
              <Input id="adv-note" value={note} onChange={(event) => setNote(event.target.value)} />
            </Field>
          </div>
          <div className="grid content-start gap-4">
            {total > 0 && <PaymentsEditor rows={payments} onChange={setPayments} due={total} />}
            {error && <Alert tone="risk">{error}</Alert>}
            <Button variant="gold" loading={busy} disabled={!customer || total <= 0 || paidPaise(payments) !== Math.round(total * 100) || (!!lockPurity && !(Number(lockWeight) > 0))} onClick={save} className="justify-self-start">
              Take advance
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Advances" />
        {!list.data?.data.length ? (
          <EmptyState title="No advances yet" />
        ) : (
          <Table minWidth={760}>
            <thead>
              <tr>
                <Th>Number</Th>
                <Th>Customer</Th>
                <Th align="right">Paid</Th>
                <Th align="right">Left</Th>
                <Th>Rate booked</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {list.data.data.map((advance) => (
                <Fragment key={advance.id}>
                  <Tr>
                    <Td>
                      <span className="font-mono font-semibold">{advance.number}</span>
                      {advance.validUntil && <span className="block text-[12px] text-ash">until {formatDate(advance.validUntil)}</span>}
                    </Td>
                    <Td>{advance.customer?.name}</Td>
                    <Td align="right">{formatINR(advance.amount)}</Td>
                    <Td align="right">{formatINR(advance.balance)}</Td>
                    <Td>
                      {advance.lockedPurity && advance.lockedRate
                        ? `${advance.lockedPurity} at ${formatINR(advance.lockedRate)}/g, ${formatWeight((advance.lockedWeight ?? 0) - advance.lockedWeightUsed)} left`
                        : "—"}
                    </Td>
                    <Td>
                      <Badge tone={STATUS[advance.status].tone}>{STATUS[advance.status].label}</Badge>
                    </Td>
                    <Td>
                      {advance.status === "open" && hasRole("owner", "branch_manager") && refunding !== advance.id && (
                        <Button size="sm" variant="ghost" onClick={() => setRefunding(advance.id)}>
                          Refund
                        </Button>
                      )}
                    </Td>
                  </Tr>
                  {refunding === advance.id && (
                    <Tr>
                      <Td colSpan={7}>
                        <RefundForm
                          advance={advance}
                          onDone={() => {
                            setRefunding(null);
                            list.reload();
                          }}
                        />
                      </Td>
                    </Tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
