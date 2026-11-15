"use client";

import { use, useState, type FormEvent } from "react";
import { MessageCircle } from "lucide-react";
import { errorMessage, useApi, useAuth, useResource } from "@webfudge/auth/components";
import { Alert, Button, Card, CardBody, CardHeader, Field, Input, PageHeader, Select, Spinner, Table, Td, Th, Tr, cn } from "@webfudge/ui";
import type { OrderStatus, PaymentMode, ServiceOrder, Supplier } from "@webfudge/utils/api";
import { ORDER_STATUS_LABELS, PAYMENT_MODE_LABELS } from "@webfudge/utils/api";
import { formatDate, formatDateTime, formatINR, formatWeight } from "@webfudge/utils/formatters";
import { OrderBadge } from "@/components/order-badge";

const FLOW: OrderStatus[] = ["received", "in_work", "ready"];

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const api = useApi();
  const { hasRole } = useAuth();
  const { data, error, loading, reload } = useResource<{ data: ServiceOrder }>(`/orders/${id}`);
  const karigars = useResource<{ data: Supplier[] }>("/stock/suppliers?kind=karigar");
  const order = data?.data;
  const [charge, setCharge] = useState("");
  const [note, setNote] = useState("");
  const [karigarId, setKarigarId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<PaymentMode>("cash");
  const [reference, setReference] = useState("");
  const [weightOut, setWeightOut] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "risk"; text: string } | null>(null);

  if (loading && !order) return <Spinner className="text-navy" />;
  if (error || !order) return <p className="text-sm text-risk">{error ?? "Order not found."}</p>;
  const closed = order.status === "delivered" || order.status === "cancelled";
  const canMoney = hasRole("owner", "branch_manager", "cashier");
  const payments = Number(amount) > 0 ? [{ mode, amount: Number(amount), reference: reference || null }] : [];

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage({ tone: "ok", text: done });
      setNote("");
      setAmount("");
      setReference("");
      reload();
    } catch (cause) {
      setMessage({ tone: "risk", text: errorMessage(cause) });
    } finally {
      setBusy(false);
    }
  }

  function save(event: FormEvent) {
    event.preventDefault();
    run(
      () =>
        api.put(`/orders/${id}`, {
          ...(charge !== "" ? { charge: Number(charge) } : {}),
          ...(karigarId !== null ? { karigarId: karigarId ? Number(karigarId) : null } : {}),
          ...(note.trim() ? { note } : {}),
        }),
      "Saved.",
    );
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title={`${order.number} · ${order.customer?.name ?? ""}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>{order.kind === "repair" ? "Repair" : "Custom order"}</span>
            {order.dueOn && <span>· promised {formatDate(order.dueOn)}</span>}
            <OrderBadge status={order.status} />
          </span>
        }
        actions={
          order.whatsapp && (
            <a
              href={order.whatsapp}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#25d366]/40 bg-[#25d366]/10 px-4 text-[13px] font-semibold text-[#128c4b] hover:bg-[#25d366]/20"
            >
              <MessageCircle className="size-4" aria-hidden />
              Tell them it is ready
            </a>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader title="The work" />
            <CardBody className="grid gap-3 text-sm">
              <p className="whitespace-pre-line text-ink">{order.description}</p>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Piece", order.itemDescription ?? "—"],
                  ["Purity", order.purity ?? "—"],
                  ["Weight in", order.weightIn ? formatWeight(order.weightIn) : "—"],
                  ["Weight out", order.weightOut ? formatWeight(order.weightOut) : "—"],
                  ["Estimate", order.estimate !== null ? formatINR(order.estimate) : "—"],
                  ["Charge", order.charge !== null ? formatINR(order.charge) : "Not set"],
                  ["Paid", formatINR(order.paidTotal)],
                  ["Balance", order.balanceDue !== null ? formatINR(order.balanceDue) : "—"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[11.5px] font-bold tracking-wide text-gray-500 uppercase">{label}</dt>
                    <dd className="font-medium tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
              {order.karigar && <p className="text-ash">Karigar: {order.karigar.name}</p>}
            </CardBody>
          </Card>

          {!closed && (
            <Card>
              <CardHeader title="Move it along" />
              <CardBody className="grid gap-4">
                <div className="flex flex-wrap gap-2">
                  {FLOW.map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={busy || status === order.status}
                      onClick={() => run(() => api.put(`/orders/${id}`, { status }), `Marked ${ORDER_STATUS_LABELS[status].toLowerCase()}.`)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition-all",
                        status === order.status ? "border-transparent bg-navy text-white shadow-md" : "border-gray-200 bg-white text-gray-700 hover:shadow-sm",
                      )}
                    >
                      {ORDER_STATUS_LABELS[status]}
                    </button>
                  ))}
                </div>
                <form onSubmit={save} className="grid gap-3 sm:grid-cols-2" noValidate>
                  <Field label="Final charge (₹)" htmlFor="order-charge">
                    <Input id="order-charge" inputMode="decimal" value={charge} onChange={(event) => setCharge(event.target.value)} placeholder={order.charge !== null ? String(order.charge) : ""} />
                  </Field>
                  <Field label="Karigar" htmlFor="order-karigar">
                    <Select id="order-karigar" value={karigarId ?? String(order.karigar?.id ?? "")} onChange={(event) => setKarigarId(event.target.value)}>
                      <option value="">Not sent out</option>
                      {karigars.data?.data.map((karigar) => (
                        <option key={karigar.id} value={karigar.id}>
                          {karigar.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Note" htmlFor="order-note" className="sm:col-span-2">
                    <Input id="order-note" value={note} onChange={(event) => setNote(event.target.value)} />
                  </Field>
                  <Button type="submit" variant="secondary" loading={busy} className="justify-self-start">
                    Save
                  </Button>
                </form>
              </CardBody>
            </Card>
          )}

          {!closed && canMoney && (
            <Card>
              <CardHeader title={order.status === "ready" ? "Hand over" : "Take money"} description={order.status === "ready" ? "Collect what is left, then hand the piece over." : "An advance or part payment. Counted in today's day close."} />
              <CardBody className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Amount (₹)" htmlFor="pay-amount">
                    <Input id="pay-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={order.balanceDue ? String(order.balanceDue) : ""} />
                  </Field>
                  <Field label="Paid by" htmlFor="pay-mode">
                    <Select id="pay-mode" value={mode} onChange={(event) => setMode(event.target.value as PaymentMode)}>
                      {(Object.keys(PAYMENT_MODE_LABELS) as PaymentMode[]).map((entry) => (
                        <option key={entry} value={entry}>
                          {PAYMENT_MODE_LABELS[entry]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  {mode !== "cash" && (
                    <Field label="Reference" htmlFor="pay-ref">
                      <Input id="pay-ref" value={reference} onChange={(event) => setReference(event.target.value)} />
                    </Field>
                  )}
                </div>
                {order.status === "ready" && order.kind === "repair" && (
                  <Field label="Weight out (g)" htmlFor="weight-out">
                    <Input id="weight-out" inputMode="decimal" value={weightOut} onChange={(event) => setWeightOut(event.target.value)} className="max-w-40" />
                  </Field>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" loading={busy} disabled={!payments.length} onClick={() => run(() => api.post(`/orders/${id}/payments`, { payments }), "Money received.")}>
                    Receive money only
                  </Button>
                  {order.status === "ready" && (
                    <Button loading={busy} onClick={() => run(() => api.post(`/orders/${id}/deliver`, { payments, weightOut: weightOut || undefined }), "Delivered.")}>
                      {payments.length ? `Receive ${formatINR(Number(amount))} and deliver` : "Deliver"}
                    </Button>
                  )}
                </div>
                {order.kind === "custom" && <p className="text-[12.5px] text-ash">A finished custom piece is tagged in the Back Office and billed here like any piece. Use its advance against the bill.</p>}
              </CardBody>
            </Card>
          )}

          {!closed && (
            <details className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
              <summary className="cursor-pointer font-semibold text-ash">Cancel this order</summary>
              <div className="mt-3 flex flex-wrap gap-2">
                <Input id="cancel-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why it is cancelled" className="max-w-sm" />
                <Button variant="danger" loading={busy} disabled={reason.trim().length < 3} onClick={() => run(() => api.put(`/orders/${id}`, { status: "cancelled", note: reason }), "Cancelled.")}>
                  Cancel order
                </Button>
              </div>
              {order.paidTotal > 0 && <p className="mt-2 text-[12.5px] text-warn">{formatINR(order.paidTotal)} was paid. Refund it or move it to an advance at the counter.</p>}
            </details>
          )}
          {message && <Alert tone={message.tone}>{message.text}</Alert>}
        </div>

        <div className="grid content-start gap-6">
          <Card className="overflow-hidden">
            <CardHeader title="Money received" />
            {order.payments.length ? (
              <Table minWidth={360}>
                <thead>
                  <tr>
                    <Th>When</Th>
                    <Th>How</Th>
                    <Th align="right">Amount</Th>
                  </tr>
                </thead>
                <tbody>
                  {order.payments.map((payment, index) => (
                    <Tr key={`${payment.at}-${index}`}>
                      <Td className="whitespace-nowrap">{formatDateTime(payment.at)}</Td>
                      <Td>{PAYMENT_MODE_LABELS[payment.mode]}</Td>
                      <Td align="right">{formatINR(payment.amount)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <CardBody>
                <p className="text-sm text-ash">Nothing received yet.</p>
              </CardBody>
            )}
          </Card>
          <Card>
            <CardHeader title="History" />
            <ol className="grid px-6 py-4">
              {[...order.log].reverse().map((entry, index) => (
                <li key={`${entry.at}-${index}`} className="relative border-l-2 border-gray-100 pb-4 pl-5 last:pb-0">
                  <span className="absolute top-1 -left-[7px] size-3 rounded-full border-2 border-white bg-navy" aria-hidden />
                  <p className="text-sm">{entry.text}</p>
                  <p className="text-[12px] text-ash">
                    {formatDateTime(entry.at)}
                    {entry.by ? ` · ${entry.by}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
