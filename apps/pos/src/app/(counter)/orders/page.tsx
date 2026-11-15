"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Wrench } from "lucide-react";
import { errorMessage, useApi, useBranch, useResource } from "@webfudge/auth/components";
import { PURITIES } from "@webfudge/config";
import { Alert, Button, Card, CardBody, CardHeader, EmptyState, Field, Input, PageHeader, Select, Spinner, Table, Tabs, Td, Textarea, Th, Tr, cn } from "@webfudge/ui";
import type { Customer, OrderKind, PaymentMode, ServiceOrder } from "@webfudge/utils/api";
import { PAYMENT_MODE_LABELS } from "@webfudge/utils/api";
import { formatDate, formatINR } from "@webfudge/utils/formatters";
import { CustomerPicker } from "@/components/customer-picker";
import { OrderBadge } from "@/components/order-badge";

type View = "open" | "ready" | "delivered" | "all";

function NewOrder({ onSaved, onCancel }: { onSaved: (order: ServiceOrder) => void; onCancel: () => void }) {
  const api = useApi();
  const { branch } = useBranch();
  const [kind, setKind] = useState<OrderKind>("repair");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({ description: "", itemDescription: "", purity: "22KT", weightIn: "", estimate: "", dueOn: "", advance: "", mode: "cash" as PaymentMode, reference: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ data: ServiceOrder }>("/orders", {
        branchId: branch?.id,
        kind,
        customerId: customer?.id,
        description: form.description,
        itemDescription: form.itemDescription,
        purity: form.purity,
        weightIn: form.weightIn,
        estimate: form.estimate,
        dueOn: form.dueOn || null,
        payments: Number(form.advance) > 0 ? [{ mode: form.mode, amount: Number(form.advance), reference: form.reference || null }] : [],
      });
      onSaved(data);
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Take in a repair or order" description="Give the customer the order number. Weigh repairs in front of them." />
      <CardBody>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <div className="flex gap-2">
            {(["repair", "custom"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setKind(value)}
                className={cn("rounded-lg border px-3 py-1.5 text-[13px] font-semibold", kind === value ? "border-transparent bg-navy text-white shadow-md" : "border-gray-200 text-gray-700")}
              >
                {value === "repair" ? "Repair of their piece" : "Custom piece to make"}
              </button>
            ))}
          </div>
          <Field label="Customer" htmlFor="customer-search">
            <CustomerPicker value={customer} onChange={setCustomer} />
          </Field>
          <Field label={kind === "repair" ? "What needs doing" : "What to make"} htmlFor="order-description">
            <Textarea
              id="order-description"
              value={form.description}
              onChange={(event) => set("description")(event.target.value)}
              placeholder={kind === "repair" ? "Like: solder broken link, replace clasp, polish" : "Like: name pendant 'Aarav' in 22KT, about 5 g, by 1 Feb"}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kind === "repair" && (
              <Field label="Their piece" htmlFor="order-item">
                <Input id="order-item" value={form.itemDescription} onChange={(event) => set("itemDescription")(event.target.value)} placeholder="Gold chain with pendant" />
              </Field>
            )}
            <Field label="Purity" htmlFor="order-purity">
              <Select id="order-purity" value={form.purity} onChange={(event) => set("purity")(event.target.value)}>
                {PURITIES.map((purity) => (
                  <option key={purity.code} value={purity.code}>
                    {purity.label}
                  </option>
                ))}
              </Select>
            </Field>
            {kind === "repair" && (
              <Field label="Weight taken in (g)" htmlFor="order-weight">
                <Input id="order-weight" inputMode="decimal" value={form.weightIn} onChange={(event) => set("weightIn")(event.target.value)} />
              </Field>
            )}
            <Field label="Estimate (₹)" htmlFor="order-estimate">
              <Input id="order-estimate" inputMode="decimal" value={form.estimate} onChange={(event) => set("estimate")(event.target.value)} />
            </Field>
            <Field label="Promised for" htmlFor="order-due">
              <Input id="order-due" type="date" value={form.dueOn} onChange={(event) => set("dueOn")(event.target.value)} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Advance received (₹)" htmlFor="order-advance" hint="Optional. Counted in today's day close.">
              <Input id="order-advance" inputMode="decimal" value={form.advance} onChange={(event) => set("advance")(event.target.value)} />
            </Field>
            {Number(form.advance) > 0 && (
              <>
                <Field label="Paid by" htmlFor="order-mode">
                  <Select id="order-mode" value={form.mode} onChange={(event) => set("mode")(event.target.value)}>
                    {(Object.keys(PAYMENT_MODE_LABELS) as PaymentMode[]).map((mode) => (
                      <option key={mode} value={mode}>
                        {PAYMENT_MODE_LABELS[mode]}
                      </option>
                    ))}
                  </Select>
                </Field>
                {form.mode !== "cash" && (
                  <Field label="Reference" htmlFor="order-reference">
                    <Input id="order-reference" value={form.reference} onChange={(event) => set("reference")(event.target.value)} />
                  </Field>
                )}
              </>
            )}
          </div>
          {error && <Alert tone="risk">{error}</Alert>}
          <div className="flex gap-2">
            <Button type="submit" loading={busy} disabled={!customer || !form.description.trim()}>
              Save order
            </Button>
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

export default function OrdersPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const params = use(searchParams);
  const router = useRouter();
  const [view, setView] = useState<View>("open");
  const [adding, setAdding] = useState(params.new === "1");
  const status = view === "all" ? "" : view;
  const orders = useResource<{ data: ServiceOrder[] }>(`/orders?status=${status}`);
  const rows = orders.data?.data ?? [];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Repairs & custom orders"
        description="From the counter to the karigar and back. The customer collects and pays here."
        actions={
          <Button onClick={() => setAdding((value) => !value)}>
            <Plus className="size-4" aria-hidden />
            New
          </Button>
        }
      />
      {adding && <NewOrder onSaved={(order) => router.push(`/orders/${order.id}`)} onCancel={() => setAdding(false)} />}

      <Tabs<View>
        label="Order status"
        active={view}
        onChange={setView}
        tabs={[
          { key: "open", label: "In progress" },
          { key: "ready", label: "Ready to collect" },
          { key: "delivered", label: "Delivered" },
          { key: "all", label: "All" },
        ]}
      />

      <Card className="overflow-hidden">
        {orders.loading && !orders.data ? (
          <div className="grid place-items-center py-12 text-navy">
            <Spinner />
          </div>
        ) : orders.error ? (
          <p className="p-5 text-sm text-risk">{orders.error}</p>
        ) : !rows.length ? (
          <EmptyState icon={Wrench} title="Nothing here" description="Repairs and custom orders you take in appear here." />
        ) : (
          <Table minWidth={820}>
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Work</Th>
                <Th>Promised</Th>
                <Th align="right">Balance due</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => {
                const late = order.dueOn && order.dueOn < today && !["delivered", "cancelled"].includes(order.status);
                return (
                  <Tr key={order.id} className="cursor-pointer" onClick={() => router.push(`/orders/${order.id}`)}>
                    <Td>
                      <Link href={`/orders/${order.id}`} className="grid leading-tight" onClick={(event) => event.stopPropagation()}>
                        <span className="font-mono font-semibold hover:underline">{order.number}</span>
                        <span className="text-[12px] text-ash">{order.kind === "repair" ? "Repair" : "Custom"}</span>
                      </Link>
                    </Td>
                    <Td>
                      <span className="grid leading-tight">
                        <span className="font-semibold">{order.customer?.name}</span>
                        <span className="text-[12.5px] text-ash">{order.customer?.phone}</span>
                      </span>
                    </Td>
                    <Td className="max-w-72">
                      <span className="line-clamp-2 text-[13px]">{order.description}</span>
                    </Td>
                    <Td className={late ? "font-semibold text-risk" : undefined}>{order.dueOn ? formatDate(order.dueOn) : "—"}</Td>
                    <Td align="right">{order.balanceDue === null ? "—" : formatINR(order.balanceDue)}</Td>
                    <Td>
                      <OrderBadge status={order.status} />
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
