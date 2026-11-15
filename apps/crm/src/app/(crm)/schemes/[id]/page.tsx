"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import { CircleCheck, Wallet } from "lucide-react";
import { errorMessage, useApi, useAuth, useBranch, useResource } from "@webfudge/auth/components";
import { Alert, Button, Card, CardBody, CardHeader, Field, Input, KpiCard, PageHeader, Select, Spinner, Table, Td, Th, Tr, cn } from "@webfudge/ui";
import type { PaymentMode, SchemeAccountDetail } from "@webfudge/utils/api";
import { PAYMENT_MODE_LABELS } from "@webfudge/utils/api";
import { formatDate, formatDateTime, formatINR, formatRupees } from "@webfudge/utils/formatters";
import { PaymentPicker, SchemeBadge, WhatsAppButton, bonusLabel } from "@/components/crm";

function whatsappFor(account: SchemeAccountDetail) {
  if (!account.customer) return null;
  const first = account.customer.name.replace(/^Demo\s*[–-]\s*/, "").split(" ")[0];
  const text =
    account.status === "matured"
      ? `Namaste ${first}, your gold savings scheme ${account.number} has matured: ${formatINR(account.paidTotal)} saved plus ${formatINR(account.bonusOnMaturity)} from us. Visit the showroom to choose your jewellery. – Mukund Maid Jewellers`
      : `Namaste ${first}, a reminder that instalment ${account.nextInstalment} (${formatINR(account.monthlyAmount)}) of your gold savings scheme ${account.number} is due${account.nextDueOn ? ` on ${formatDate(account.nextDueOn)}` : ""}. – Mukund Maid Jewellers`;
  return `https://wa.me/91${account.customer.phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(text)}`;
}

export default function SchemePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const api = useApi();
  const { hasRole } = useAuth();
  const { branch } = useBranch();
  const { data, error, loading, reload } = useResource<{ data: SchemeAccountDetail }>(`/crm/schemes/${id}`);
  const account = data?.data;
  const [count, setCount] = useState("1");
  const [mode, setMode] = useState<PaymentMode>("cash");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "risk"; text: string } | null>(null);

  if (loading && !account) return <Spinner className="text-navy" />;
  if (error || !account) return <p className="text-sm text-risk">{error ?? "Scheme not found."}</p>;

  const canTakeMoney = hasRole("owner", "branch_manager", "cashier");
  const remaining = account.months - account.instalmentsPaid;
  const amount = account.monthlyAmount * Number(count);

  async function pay(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api.post(`/crm/schemes/${id}/payments`, { branchId: branch?.id, instalments: Number(count), payments: [{ mode, amount, reference: reference || null }] });
      setMessage({ tone: "ok", text: `${formatINR(amount)} received.` });
      setReference("");
      setCount("1");
      reload();
    } catch (cause) {
      setMessage({ tone: "risk", text: errorMessage(cause) });
    } finally {
      setBusy(false);
    }
  }

  async function redeem() {
    setBusy(true);
    setMessage(null);
    try {
      const { data: result } = await api.post<{ data: SchemeAccountDetail & { advanceNumber: string } }>(`/crm/schemes/${id}/redeem`, account!.status === "active" ? { reason } : {});
      setMessage({ tone: "ok", text: `Done. Advance ${result.advanceNumber} for ${formatINR(result.booking?.balance ?? 0)} is ready at the billing counter.` });
      setClosing(false);
      reload();
    } catch (cause) {
      setMessage({ tone: "risk", text: errorMessage(cause) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title={account.customer?.name ?? account.number}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{account.number}</span>
            <span>
              · {account.plan?.name} · {bonusLabel(account)} · started {formatDate(account.startDate)}
            </span>
            <SchemeBadge status={account.status} behind={account.behind} />
          </span>
        }
        actions={
          <>
            {account.customer && (
              <Link href={`/customers/${account.customer.id}`} className="text-sm font-semibold text-navy hover:underline">
                Customer profile
              </Link>
            )}
            {(account.status === "active" || account.status === "matured") && <WhatsAppButton href={whatsappFor(account)} label={account.status === "matured" ? "Tell them" : "Remind"} />}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard compact title="Saved so far" value={formatRupees(account.paidTotal)} icon={Wallet} subtitle={`${account.instalmentsPaid} of ${account.months} instalments`} />
        <KpiCard compact title="Monthly" value={formatRupees(account.monthlyAmount)} icon={Wallet} tone="navy" subtitle={account.nextDueOn ? `Next due ${formatDate(account.nextDueOn)}` : account.status === "matured" ? "All paid" : "No more instalments"} />
        <KpiCard compact title="Shop adds at the end" value={formatRupees(account.bonusAmount ?? account.bonusOnMaturity)} icon={CircleCheck} tone="gold" subtitle={bonusLabel(account)} />
        <KpiCard
          compact
          title={account.status === "redeemed" || account.status === "closed" ? "Turned into" : "Behind"}
          value={account.status === "redeemed" || account.status === "closed" ? account.redeemedAs ?? "—" : account.behind}
          icon={CircleCheck}
          tone={account.behind ? "warn" : "ok"}
          subtitle={account.status === "redeemed" || account.status === "closed" ? (account.redeemedAt ? formatDate(account.redeemedAt) : undefined) : account.behind ? "instalments overdue" : "On track"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader title="Instalments" />
            <CardBody>
              <ol className="grid grid-cols-6 gap-2 sm:grid-cols-12 lg:grid-cols-6 xl:grid-cols-12">
                {Array.from({ length: account.months }, (_, index) => {
                  const paid = index < account.instalmentsPaid;
                  const due = !paid && index < account.expected;
                  return (
                    <li
                      key={index}
                      title={`Instalment ${index + 1}`}
                      className={cn(
                        "grid aspect-square place-items-center rounded-lg border text-[12px] font-semibold",
                        paid ? "border-transparent bg-navy text-white" : due ? "border-warn-line bg-warn-soft text-warn" : "border-gray-200 text-gray-400",
                      )}
                    >
                      {index + 1}
                    </li>
                  );
                })}
              </ol>
            </CardBody>
          </Card>

          {account.status === "active" && canTakeMoney && (
            <Card>
              <CardHeader title="Take an instalment" description="Counted in today's day close, like any money at the counter." />
              <CardBody>
                <form onSubmit={pay} className="grid gap-4" noValidate>
                  <Field label="How many months" htmlFor="months">
                    <Select id="months" value={count} onChange={(event) => setCount(event.target.value)} className="max-w-56">
                      {Array.from({ length: remaining }, (_, index) => index + 1).map((value) => (
                        <option key={value} value={value}>
                          {value} {value === 1 ? "month" : "months"} · {formatINR(account.monthlyAmount * value)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Paid by" htmlFor="instalment-mode">
                    <PaymentPicker id="instalment" mode={mode} reference={reference} onMode={setMode} onReference={setReference} />
                  </Field>
                  <Button type="submit" loading={busy}>
                    Receive {formatINR(amount)}
                  </Button>
                </form>
              </CardBody>
            </Card>
          )}

          {(account.status === "matured" || (account.status === "active" && account.instalmentsPaid > 0 && hasRole("owner", "branch_manager"))) && canTakeMoney && (
            <Card>
              <CardHeader
                title={account.status === "matured" ? "Redeem the scheme" : "Close early"}
                description={
                  account.status === "matured"
                    ? `Turns ${formatINR(account.paidTotal)} plus the ${formatINR(account.bonusOnMaturity)} bonus into an advance for the customer's purchase.`
                    : "Only if the customer cannot continue. What was paid becomes an advance, without the bonus."
                }
              />
              <CardBody className="grid gap-3">
                {account.status === "active" &&
                  (closing ? (
                    <Field label="Why is it closing early" htmlFor="close-reason">
                      <Input id="close-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Like: moving away, needs the money now" />
                    </Field>
                  ) : (
                    <Button variant="secondary" onClick={() => setClosing(true)} className="justify-self-start">
                      Close this scheme early
                    </Button>
                  ))}
                {(account.status === "matured" || closing) && (
                  <Button variant={account.status === "matured" ? "gold" : "danger"} loading={busy} onClick={redeem} disabled={account.status === "active" && reason.trim().length < 3} className="justify-self-start">
                    {account.status === "matured" ? `Redeem ${formatINR(account.paidTotal + account.bonusOnMaturity)}` : `Close and move ${formatINR(account.paidTotal)} to an advance`}
                  </Button>
                )}
              </CardBody>
            </Card>
          )}

          {account.booking && (
            <Alert tone="ok" title={`Advance ${account.booking.number}`}>
              {formatINR(account.booking.balance)} is left to use at the billing counter.
            </Alert>
          )}
          {message && <Alert tone={message.tone}>{message.text}</Alert>}
        </div>

        <Card>
          <CardHeader title="Receipts" />
          {account.payments.length ? (
            <Table minWidth={480}>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Receipt</Th>
                  <Th>When</Th>
                  <Th>Paid by</Th>
                  <Th align="right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {account.payments.map((payment) => (
                  <Tr key={payment.id}>
                    <Td>{payment.instalmentNo}</Td>
                    <Td className="font-mono">{payment.number}</Td>
                    <Td className="whitespace-nowrap">{formatDateTime(payment.createdAt)}</Td>
                    <Td>{payment.payments.map((entry) => PAYMENT_MODE_LABELS[entry.mode]).join(", ")}</Td>
                    <Td align="right">{formatINR(payment.amount)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <CardBody>
              <p className="text-sm text-ash">No instalments yet.</p>
            </CardBody>
          )}
        </Card>
      </div>
    </div>
  );
}
