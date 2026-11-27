"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IndianRupee, Lock, NotebookPen, UserRound, Wallet } from "lucide-react";
import { errorMessage, useApi, useBranch } from "@webfudge/auth/components";
import { PURITIES } from "@webfudge/config";
import { useCurrentRates } from "@webfudge/hooks";
import { Alert, Button, Card, CardBody, CardHeader, Field, Input, PageHeader, Select } from "@webfudge/ui";
import type { Advance, Customer } from "@webfudge/utils/api";
import { formatINR } from "@webfudge/utils/formatters";
import { CustomerPicker } from "@/components/customer-picker";
import { PaymentsEditor, newPaymentRow, paidPaise, toPayments, type PaymentRow } from "@/components/payments";
import { API_URL } from "@/lib/env";

export default function NewAdvancePage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const params = use(searchParams);
  const router = useRouter();
  const api = useApi();
  const { branch } = useBranch();
  const { card } = useCurrentRates(API_URL);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [amount, setAmount] = useState("");
  const [payments, setPayments] = useState<PaymentRow[]>(() => [newPaymentRow()]);
  const [lockPurity, setLockPurity] = useState("");
  const [lockWeight, setLockWeight] = useState("");
  const [validDays, setValidDays] = useState("30");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.customer) return;
    api
      .get<{ data: Customer }>(`/sales/customers/${params.customer}`)
      .then(({ data }) => setCustomer(data))
      .catch(() => undefined);
  }, [api, params.customer]);

  const total = Number(amount) || 0;
  const lockRate = card?.rates.find((line) => line.purity === lockPurity)?.ratePerGram;
  const lockValue = lockRate && Number(lockWeight) > 0 ? lockRate * Number(lockWeight) : 0;
  const ready = Boolean(customer) && total > 0 && paidPaise(payments) === Math.round(total * 100) && (!lockPurity || Number(lockWeight) > 0);

  async function save() {
    if (!branch) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ data: Advance }>("/sales/advances", {
        branchId: branch.id,
        customerId: customer?.id,
        payments: toPayments(payments),
        note,
        validDays: Number(validDays) || 30,
        ...(lockPurity ? { lockedPurity: lockPurity, lockedWeight: Number(lockWeight) } : {}),
      });
      router.push(`/advances/${data.id}?new=1`);
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Take an advance" description="Money paid ahead of a purchase. You can print the receipt as soon as it is saved." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader icon={UserRound} title="Customer" />
            <CardBody>
              <CustomerPicker value={customer} onChange={setCustomer} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={Lock} title="Book today&apos;s rate" description="Optional. Protects the customer if gold rises before they buy." />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Field label="Purity" htmlFor="adv-purity">
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
                <Field label="Weight (g)" htmlFor="adv-weight" hint={lockRate ? `At ${formatINR(lockRate)}/g. The advance must be at least 10% of the value.` : undefined}>
                  <Input id="adv-weight" inputMode="decimal" value={lockWeight} onChange={(event) => setLockWeight(event.target.value)} className="tabular-nums" />
                </Field>
              )}
              {lockValue > 0 && (
                <p className="rounded-lg bg-gold-soft px-3 py-2 text-[13px] text-ink sm:col-span-2">
                  {Number(lockWeight).toFixed(3)} g of {lockPurity} is worth about <b>{formatINR(lockValue)}</b> today. Take at least <b>{formatINR(Math.ceil(lockValue * 0.1))}</b>.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={NotebookPen} title="Details" />
            <CardBody className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
              <Field label="What it is for" htmlFor="adv-note" hint="Like the design or piece they are waiting for.">
                <Input id="adv-note" value={note} onChange={(event) => setNote(event.target.value)} />
              </Field>
              <Field label="Valid for (days)" htmlFor="adv-days">
                <Input id="adv-days" inputMode="numeric" value={validDays} onChange={(event) => setValidDays(event.target.value.replace(/\D/g, ""))} />
              </Field>
            </CardBody>
          </Card>
        </div>

        <Card className="self-start lg:sticky lg:top-4">
          <CardHeader icon={IndianRupee} title="Payment" />
          <CardBody className="grid gap-4">
            <Field label="Advance amount (₹)" htmlFor="adv-amount">
              <Input id="adv-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="h-12 text-lg font-semibold tabular-nums" />
            </Field>
            {total > 0 && <PaymentsEditor rows={payments} onChange={setPayments} due={total} />}
            {error && <Alert tone="risk">{error}</Alert>}
            <Button variant="gold" size="lg" loading={busy} disabled={!ready} onClick={save}>
              <Wallet className="size-4" aria-hidden />
              Take advance and print receipt
            </Button>
            {!customer && <p className="text-[12.5px] text-ash">Choose the customer first.</p>}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
