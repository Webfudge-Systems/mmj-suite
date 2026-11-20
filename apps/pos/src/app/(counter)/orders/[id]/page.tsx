"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Ban,
  CalendarClock,
  Camera,
  CircleCheckBig,
  Gem,
  Hammer,
  History,
  IndianRupee,
  MessageCircle,
  PackageCheck,
  Phone,
  Scale,
  UserRound,
  Wallet,
  Wrench,
} from "lucide-react";
import { errorMessage, useApi, useAuth, useResource } from "@webfudge/auth/components";
import {
  ActivityLog,
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  DetailHero,
  Field,
  HeroFact,
  InfoGrid,
  InfoRow,
  InfoSection,
  Input,
  KpiCard,
  PageHeader,
  Select,
  Spinner,
  StatusPill,
  StatusSteps,
  Table,
  Td,
  Th,
  Tr,
} from "@webfudge/ui";
import type { ImageRef, OrderStatus, PaymentMode, ServiceOrder, Supplier } from "@webfudge/utils/api";
import { ORDER_STATUS_LABELS, PAYMENT_MODE_LABELS } from "@webfudge/utils/api";
import { formatDate, formatDateTime, formatINR, formatWeight } from "@webfudge/utils/formatters";
import { PhotoStrip } from "@/components/photos";
import { mediaUrl } from "@/lib/env";

const FLOW: OrderStatus[] = ["received", "in_work", "ready"];
const PILL: Record<OrderStatus, { tone: "navy" | "gold" | "ok" | "neutral" | "risk"; icon: typeof Wrench }> = {
  received: { tone: "navy", icon: PackageCheck },
  in_work: { tone: "gold", icon: Hammer },
  ready: { tone: "ok", icon: CircleCheckBig },
  delivered: { tone: "neutral", icon: CircleCheckBig },
  cancelled: { tone: "risk", icon: Ban },
};

export default function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = use(params);
  const { new: justSaved } = use(searchParams);
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
  const [viewing, setViewing] = useState<ImageRef | null>(null);

  if (loading && !order) return <Spinner className="text-navy" />;
  if (error || !order) return <p className="text-sm text-risk">{error ?? "Order not found."}</p>;
  const closed = order.status === "delivered" || order.status === "cancelled";
  const canMoney = hasRole("owner", "branch_manager", "cashier");
  const payments = Number(amount) > 0 ? [{ mode, amount: Number(amount), reference: reference || null }] : [];
  const repair = order.kind === "repair";
  const today = new Date().toISOString().slice(0, 10);
  const late = Boolean(order.dueOn && order.dueOn < today && !closed);
  const pill = PILL[order.status];

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

  const steps = [
    { key: "received", label: "Taken in", icon: PackageCheck, note: formatDate(order.createdAt) },
    { key: "in_work", label: order.karigar ? `With ${order.karigar.name.replace(/^Demo\s*[–-]\s*/, "").split(",")[0]}` : "In work", icon: Hammer },
    { key: "ready", label: "Ready to collect", icon: CircleCheckBig, note: order.dueOn ? `Promised ${formatDate(order.dueOn)}` : undefined },
    { key: "delivered", label: "Delivered", icon: Gem, note: order.deliveredAt ? formatDate(order.deliveredAt) : undefined },
  ];
  const cancelledAt = order.log.filter((entry) => /cancel/i.test(entry.text)).at(-1);
  const stoppedAt = order.status === "cancelled" ? (order.log.some((entry) => /ready/i.test(entry.text)) ? "ready" : order.log.some((entry) => /in work/i.test(entry.text)) ? "in_work" : "received") : null;

  return (
    <div className="grid gap-6">
      <PageHeader title={<span className="font-mono">{order.number}</span>} description={`${repair ? "Repair" : "Custom order"} for ${order.customer?.name ?? "a customer"}`} />
      {justSaved && (
        <Alert tone="ok" title={`${order.number} saved`}>
          Give the customer this number. Move it to In work when it goes to the karigar.
        </Alert>
      )}

      <DetailHero
        image={
          order.photos[0] ? (
            <button type="button" onClick={() => setViewing(order.photos[0])} className="size-16 shrink-0 overflow-hidden rounded-2xl border-2 border-white shadow-lg" title="View photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(order.photos[0].thumbnailUrl)} alt="" className="size-full object-cover" />
            </button>
          ) : undefined
        }
        icon={repair ? Wrench : Gem}
        title={<span className="font-mono">{order.number}</span>}
        badges={
          <>
            <StatusPill tone={pill.tone} icon={pill.icon}>
              {ORDER_STATUS_LABELS[order.status]}
            </StatusPill>
            {late && <StatusPill tone="risk">Late</StatusPill>}
          </>
        }
        meta={
          <>
            <HeroFact icon={repair ? Wrench : Gem}>{repair ? "Repair" : "Custom order"}</HeroFact>
            {order.customer && (
              <HeroFact icon={UserRound}>
                <Link href={`/customers/${order.customer.id}`} className="font-semibold text-ink hover:text-navy">
                  {order.customer.name}
                </Link>
              </HeroFact>
            )}
            {order.customer && (
              <HeroFact icon={Phone}>
                <a href={`tel:${order.customer.phone}`} className="tabular-nums hover:text-navy">
                  {order.customer.phone}
                </a>
              </HeroFact>
            )}
            {order.dueOn && <HeroFact icon={CalendarClock}>Promised {formatDate(order.dueOn)}</HeroFact>}
          </>
        }
        stat={{ label: "Balance due", value: order.balanceDue === null ? "—" : formatINR(order.balanceDue), note: order.charge === null ? "Charge not set yet" : `of ${formatINR(order.charge)}` }}
      />

      <Card>
        <CardBody className="grid gap-4">
          <StatusSteps steps={steps} current={order.status === "cancelled" ? stoppedAt ?? "received" : order.status} stopped={order.status === "cancelled" ? `Cancelled${cancelledAt ? ` on ${formatDate(cancelledAt.at)}` : ""}` : undefined} />
          {order.whatsapp && (
            <a
              href={order.whatsapp}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-1.5 justify-self-center rounded-full border border-[#25d366]/40 bg-[#25d366]/10 px-4 text-[13px] font-semibold text-[#128c4b] hover:bg-[#25d366]/20"
            >
              <MessageCircle className="size-4" aria-hidden />
              Tell {order.customer?.name.replace(/^Demo\s*[–-]\s*/, "").split(" ")[0]} it is ready on WhatsApp
            </a>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard compact title="Estimate" value={order.estimate !== null ? formatINR(order.estimate) : "—"} icon={IndianRupee} subtitle="Told to the customer" />
        <KpiCard compact title="Final charge" value={order.charge !== null ? formatINR(order.charge) : "Not set"} icon={IndianRupee} tone="gold" subtitle={order.charge === null ? "Set it when the work is done" : "What they pay in all"} />
        <KpiCard compact title="Paid so far" value={formatINR(order.paidTotal)} icon={Wallet} tone="ok" subtitle={`${order.payments.length} ${order.payments.length === 1 ? "payment" : "payments"}`} />
        <KpiCard
          compact
          title={repair ? "Weight in → out" : "Purity"}
          value={repair ? (order.weightIn ? `${order.weightIn.toFixed(3)} g` : "—") : (order.purity ?? "—")}
          icon={Scale}
          tone="navy"
          subtitle={repair ? (order.weightOut ? `Out ${formatWeight(order.weightOut)}` : "Weighed out on delivery") : "Metal to make it in"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader title={repair ? "The piece and the work" : "What to make"} />
            <CardBody className="grid gap-5">
              <InfoSection title="Work" icon={repair ? Wrench : Gem} first>
                <p className="text-[15px] whitespace-pre-line text-ink">{order.description}</p>
              </InfoSection>
              <InfoSection title="Details" icon={Scale}>
                <InfoGrid columns={3}>
                  {repair && <InfoRow label="Their piece">{order.itemDescription}</InfoRow>}
                  <InfoRow label="Purity">{order.purity}</InfoRow>
                  {repair && <InfoRow label="Weight in">{order.weightIn ? formatWeight(order.weightIn) : null}</InfoRow>}
                  {repair && <InfoRow label="Weight out">{order.weightOut ? formatWeight(order.weightOut) : null}</InfoRow>}
                  <InfoRow label="Karigar" icon={Hammer}>
                    {order.karigar?.name ?? "Done in the shop"}
                  </InfoRow>
                  <InfoRow label="Taken in by">{order.by}</InfoRow>
                </InfoGrid>
              </InfoSection>
              <InfoSection title="Photos" icon={Camera}>
                {closed ? (
                  order.photos.length ? (
                    <div className="flex flex-wrap gap-2">
                      {order.photos.map((photo) => (
                        <button key={photo.id} type="button" onClick={() => setViewing(photo)} className="size-24 overflow-hidden rounded-xl border border-gray-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={mediaUrl(photo.thumbnailUrl)} alt="" className="size-full object-cover" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-ash">No photos.</p>
                  )
                ) : (
                  <PhotoStrip id="order-photos" photos={order.photos} onChange={(next) => run(() => api.put(`/orders/${id}`, { photoIds: next.map((photo) => photo.id) }), "Photos saved.")} />
                )}
              </InfoSection>
            </CardBody>
          </Card>

          {!closed && (
            <Card>
              <CardHeader title="Move it along" description="Change the stage, send it to a karigar, set the final charge." />
              <CardBody className="grid gap-4">
                <div className="flex flex-wrap gap-2">
                  {FLOW.map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={status === order.status ? "primary" : "secondary"}
                      disabled={busy || status === order.status}
                      onClick={() => run(() => api.put(`/orders/${id}`, { status }), `Marked ${ORDER_STATUS_LABELS[status].toLowerCase()}.`)}
                    >
                      {ORDER_STATUS_LABELS[status]}
                    </Button>
                  ))}
                </div>
                <form onSubmit={save} className="grid gap-3 sm:grid-cols-2" noValidate>
                  <Field label="Final charge (₹)" htmlFor="order-charge">
                    <Input id="order-charge" inputMode="decimal" value={charge} onChange={(event) => setCharge(event.target.value)} placeholder={order.charge !== null ? String(order.charge) : ""} />
                  </Field>
                  <Field label="Karigar" htmlFor="order-karigar">
                    <Select id="order-karigar" value={karigarId ?? String(order.karigar?.id ?? "")} onChange={(event) => setKarigarId(event.target.value)}>
                      <option value="">Done in the shop</option>
                      {karigars.data?.data.map((karigar) => (
                        <option key={karigar.id} value={karigar.id}>
                          {karigar.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Note for the history" htmlFor="order-note" className="sm:col-span-2">
                    <Input id="order-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Like: karigar says 2 more days" />
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
              <CardHeader title={order.status === "ready" ? "Hand over" : "Take money"} description={order.status === "ready" ? "Collect what is left, weigh it out, then hand the piece over." : "An advance or part payment. Counted in today's day close."} />
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
                {order.status === "ready" && repair && (
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
                {!repair && <p className="text-[12.5px] text-ash">A finished custom piece is tagged in the Back Office and billed here like any piece. Use its advance against the bill.</p>}
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
            <CardHeader title="Money received" description={order.paidTotal ? `${formatINR(order.paidTotal)} in all` : undefined} />
            {order.payments.length ? (
              <Table minWidth={340}>
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
                      <Td align="right" className="font-semibold text-ink">
                        {formatINR(payment.amount)}
                      </Td>
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
            <CardHeader title={<span className="flex items-center gap-2"><History className="size-4 text-gold" aria-hidden />History</span>} />
            <CardBody>
              <ActivityLog
                formatTime={formatDateTime}
                entries={[...order.log].reverse().map((entry) => ({
                  at: entry.at,
                  by: entry.by,
                  text: entry.text,
                  tone: /cancel/i.test(entry.text) ? "risk" : /deliver|ready/i.test(entry.text) ? "ok" : /paid|received ₹|advance/i.test(entry.text) ? "gold" : "navy",
                }))}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      {viewing && (
        <button type="button" onClick={() => setViewing(null)} className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-6" aria-label="Close photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl(viewing.url)} alt="" className="max-h-full max-w-full rounded-xl shadow-2xl" />
        </button>
      )}
    </div>
  );
}
