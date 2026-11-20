"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Cake,
  CalendarHeart,
  Coins,
  CreditCard,
  FilePlus2,
  Gem,
  IdCard,
  IndianRupee,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ReceiptText,
  ShoppingBag,
  Sparkles,
  StickyNote,
  UserRound,
  Wallet,
  Wrench,
} from "lucide-react";
import { errorMessage, useApi, useResource } from "@webfudge/auth/components";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DetailHero,
  EmptyState,
  Field,
  HeroFact,
  InfoGrid,
  InfoRow,
  InfoSection,
  Input,
  KpiCard,
  PageHeader,
  Spinner,
  Table,
  Tabs,
  Td,
  Textarea,
  Th,
  Tr,
  buttonClass,
} from "@webfudge/ui";
import type { CustomerDetail, ServiceOrder } from "@webfudge/utils/api";
import { formatDate, formatINR } from "@webfudge/utils/formatters";
import { initials } from "@/components/customer-avatar";
import { OrderBadge } from "@/components/order-badge";

type Tab = "overview" | "bills" | "account" | "orders";

function EditDetails({ customer, onSaved, onCancel }: { customer: CustomerDetail; onSaved: () => void; onCancel: () => void }) {
  const api = useApi();
  const [form, setForm] = useState({
    name: customer.name,
    phone: customer.phone,
    altPhone: customer.altPhone ?? "",
    email: customer.email ?? "",
    address: customer.address ?? "",
    city: customer.city ?? "",
    pan: customer.pan ?? "",
    gstin: customer.gstin ?? "",
    birthDate: customer.birthDate ?? "",
    anniversaryDate: customer.anniversaryDate ?? "",
    notes: customer.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.put(`/sales/customers/${customer.id}`, { ...form, birthDate: form.birthDate || null, anniversaryDate: form.anniversaryDate || null });
      onSaved();
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  const field = (key: keyof typeof form, label: string, props: Record<string, unknown> = {}) => (
    <Field label={label} htmlFor={`cust-${key}`}>
      <Input id={`cust-${key}`} value={form[key]} onChange={(event) => set(key)(event.target.value)} {...props} />
    </Field>
  );

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      {field("name", "Name")}
      {field("phone", "Mobile", { inputMode: "tel" })}
      {field("altPhone", "Other number", { inputMode: "tel" })}
      {field("email", "Email", { type: "email" })}
      <Field label="Address" htmlFor="cust-address" className="sm:col-span-2">
        <Textarea id="cust-address" value={form.address} onChange={(event) => set("address")(event.target.value)} className="min-h-14" />
      </Field>
      {field("city", "City")}
      {field("pan", "PAN", { maxLength: 10, className: "font-mono uppercase" })}
      {field("gstin", "GSTIN", { maxLength: 15, className: "font-mono uppercase" })}
      <span className="hidden sm:block" aria-hidden />
      {field("birthDate", "Birthday", { type: "date" })}
      {field("anniversaryDate", "Wedding anniversary", { type: "date" })}
      <Field label="Notes" htmlFor="cust-notes" className="sm:col-span-2">
        <Textarea id="cust-notes" value={form.notes} onChange={(event) => set("notes")(event.target.value)} className="min-h-14" />
      </Field>
      {error && <Alert tone="risk" className="sm:col-span-2">{error}</Alert>}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" loading={busy} disabled={!form.name.trim() || form.phone.replace(/\D/g, "").length < 10}>
          Save changes
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, error, loading, reload } = useResource<{ data: CustomerDetail }>(`/sales/customers/${id}`);
  const orders = useResource<{ data: ServiceOrder[] }>(`/orders?customerId=${id}`);
  const customer = data?.data;
  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);

  if (loading && !customer) return <Spinner className="text-navy" />;
  if (error || !customer) return <p className="text-sm text-risk">{error ?? "Customer not found."}</p>;

  const summary = customer.summary ?? { bills: customer.invoices.length, spent: 0, averageBill: 0, pieces: 0, firstBillAt: null, lastBillAt: null };
  const onAccount = customer.advances.reduce((sum, row) => sum + row.balance, 0) + customer.creditNotes.reduce((sum, row) => sum + row.balance, 0);
  const openOrders = (orders.data?.data ?? []).filter((order) => !["delivered", "cancelled"].includes(order.status));
  const accountCount = customer.advances.length + customer.creditNotes.length + (customer.oldGold?.length ?? 0);

  return (
    <div className="grid gap-6">
      <PageHeader
        title={customer.name}
        description="Their details, bills, money on account and repairs."
        actions={
          <>
            <Link href={`/?customer=${customer.id}`} className={buttonClass("primary")}>
              <FilePlus2 className="size-4" aria-hidden />
              Start a bill
            </Link>
            <Link href={`/advances/new?customer=${customer.id}`} className={buttonClass("secondary")}>
              <Wallet className="size-4" aria-hidden />
              Advance
            </Link>
            <Link href={`/orders/new?customer=${customer.id}`} className={buttonClass("secondary")}>
              <Wrench className="size-4" aria-hidden />
              Repair or order
            </Link>
          </>
        }
      />
      <DetailHero
        image={
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl border-2 border-white bg-gradient-to-br from-navy to-navy-deep text-xl font-bold text-gold shadow-lg">{initials(customer.name)}</span>
        }
        title={customer.name}
        badges={
          <>
            {summary.bills > 3 && <Badge tone="gold">Regular</Badge>}
            {customer.loyaltyPoints > 0 && <Badge tone="navy">{customer.loyaltyPoints} points</Badge>}
            {customer.pan && <Badge>PAN on file</Badge>}
          </>
        }
        meta={
          <>
            <HeroFact icon={Phone}>
              <a href={`tel:${customer.phone}`} className="tabular-nums hover:text-navy">
                {customer.phone}
              </a>
            </HeroFact>
            {customer.city && <HeroFact icon={MapPin}>{customer.city}</HeroFact>}
            {customer.birthDate && <HeroFact icon={Cake}>{formatDate(customer.birthDate)}</HeroFact>}
          </>
        }
        stat={{ label: "Total bought", value: formatINR(summary.spent), note: summary.firstBillAt ? `Customer since ${formatDate(summary.firstBillAt)}` : "No bills yet" }}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard compact title="Bills" value={summary.bills} icon={ReceiptText} subtitle={`${summary.pieces} pieces bought`} />
        <KpiCard compact title="Average bill" value={formatINR(summary.averageBill)} icon={IndianRupee} tone="gold" subtitle={summary.lastBillAt ? `Last on ${formatDate(summary.lastBillAt)}` : "No bills yet"} />
        <KpiCard compact title="On account" value={formatINR(onAccount)} icon={Wallet} tone={onAccount ? "ok" : "navy"} subtitle="Advances and credit notes to use" />
        <KpiCard compact title="Open orders" value={openOrders.length} icon={Wrench} tone={openOrders.length ? "warn" : "navy"} subtitle="Repairs and custom pieces" />
      </div>

      <Tabs<Tab>
        variant="pill"
        label="Customer sections"
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "overview", label: "Overview" },
          { key: "bills", label: "Bills", count: customer.invoices.length },
          { key: "account", label: "Money on account", count: accountCount },
          { key: "orders", label: "Repairs & orders", count: orders.data?.data.length },
        ]}
      />

      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              title="Customer details"
              description="Contact details, IDs and the dates the CRM uses for wishes."
              action={
                !editing && (
                  <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                    <Pencil className="size-3.5" aria-hidden />
                    Edit
                  </Button>
                )
              }
            />
            <CardBody className="grid gap-5">
              {editing ? (
                <EditDetails
                  customer={customer}
                  onSaved={() => {
                    setEditing(false);
                    reload();
                  }}
                  onCancel={() => setEditing(false)}
                />
              ) : (
                <>
                  <InfoSection title="Contact" icon={UserRound} first>
                    <InfoGrid>
                      <InfoRow label="Mobile" icon={Phone}>
                        {customer.phone}
                      </InfoRow>
                      <InfoRow label="Other number" icon={Phone}>
                        {customer.altPhone}
                      </InfoRow>
                      <InfoRow label="Email" icon={Mail}>
                        {customer.email}
                      </InfoRow>
                      <InfoRow label="City" icon={MapPin}>
                        {customer.city}
                      </InfoRow>
                      <InfoRow label="Address" icon={MapPin} className="sm:col-span-2">
                        {customer.address && <span className="whitespace-pre-line">{customer.address}</span>}
                      </InfoRow>
                    </InfoGrid>
                  </InfoSection>
                  <InfoSection title="Tax IDs" icon={IdCard}>
                    <InfoGrid>
                      <InfoRow label="PAN" mono>
                        {customer.pan}
                      </InfoRow>
                      <InfoRow label="GSTIN" mono>
                        {customer.gstin}
                      </InfoRow>
                    </InfoGrid>
                  </InfoSection>
                  <InfoSection title="Dates to remember" icon={CalendarHeart}>
                    <InfoGrid>
                      <InfoRow label="Birthday" icon={Cake}>
                        {customer.birthDate && formatDate(customer.birthDate)}
                      </InfoRow>
                      <InfoRow label="Wedding anniversary" icon={CalendarHeart}>
                        {customer.anniversaryDate && formatDate(customer.anniversaryDate)}
                      </InfoRow>
                    </InfoGrid>
                  </InfoSection>
                  {customer.notes && (
                    <InfoSection title="Notes" icon={StickyNote}>
                      <p className="rounded-lg bg-gray-50 p-3 text-sm whitespace-pre-line text-ink">{customer.notes}</p>
                    </InfoSection>
                  )}
                </>
              )}
            </CardBody>
          </Card>

          <div className="grid content-start gap-6">
            <Card>
              <CardHeader title="Loyalty" />
              <CardBody className="flex items-center gap-4">
                <span className="grid size-12 place-items-center rounded-xl bg-gold-soft text-gold-deep">
                  <Sparkles className="size-6" aria-hidden />
                </span>
                <div>
                  <p className="text-2xl font-bold text-ink tabular-nums">{customer.loyaltyPoints}</p>
                  <p className="text-[13px] text-ash">points · redeem from the CRM</p>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Latest bills" action={customer.invoices.length > 3 && <button type="button" onClick={() => setTab("bills")} className="text-[13px] font-semibold text-navy hover:underline">See all</button>} />
              {customer.invoices.length ? (
                <ul className="divide-y divide-gray-100">
                  {customer.invoices.slice(0, 4).map((invoice) => (
                    <li key={invoice.id}>
                      <Link href={`/invoices/${invoice.id}`} className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-navy-soft/40">
                        <span className="grid leading-tight">
                          <span className="font-mono text-[13px] font-semibold text-ink">{invoice.number}</span>
                          <span className="text-[12px] text-ash">{formatDate(invoice.invoiceDate)}</span>
                        </span>
                        <span className={`text-sm font-semibold tabular-nums ${invoice.status === "cancelled" ? "text-ash line-through" : "text-ink"}`}>{formatINR(invoice.total)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <CardBody>
                  <p className="text-sm text-ash">No bills yet.</p>
                </CardBody>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === "bills" && (
        <Card className="overflow-hidden">
          {customer.invoices.length ? (
            <Table minWidth={680}>
              <thead>
                <tr>
                  <Th>Invoice</Th>
                  <Th>Date</Th>
                  <Th>What they bought</Th>
                  <Th align="right">Pieces</Th>
                  <Th align="right">Total</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {customer.invoices.map((invoice) => (
                  <Tr key={invoice.id} className="cursor-pointer" onClick={() => router.push(`/invoices/${invoice.id}`)}>
                    <Td className="font-mono font-semibold text-ink">{invoice.number}</Td>
                    <Td className="whitespace-nowrap">{formatDate(invoice.invoiceDate)}</Td>
                    <Td className="max-w-72 text-[13px]">
                      <span className="line-clamp-1">{invoice.items?.join(", ") || "—"}</span>
                    </Td>
                    <Td align="right">{invoice.pieces ?? "—"}</Td>
                    <Td align="right" className="font-semibold text-ink">
                      {formatINR(invoice.total)}
                    </Td>
                    <Td>{invoice.status === "cancelled" ? <Badge tone="risk">Cancelled</Badge> : <Badge tone="ok">Paid</Badge>}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState icon={ShoppingBag} title="No bills yet" description="Start a bill for this customer from the button above." />
          )}
        </Card>
      )}

      {tab === "account" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <CardHeader title="Advances" description="Money paid ahead. Used automatically on their next bill." />
            {customer.advances.length ? (
              <ul className="divide-y divide-gray-100">
                {customer.advances.map((advance) => (
                  <li key={advance.id}>
                    <Link href={`/advances/${advance.id}`} className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-navy-soft/40">
                      <span className="grid leading-tight">
                        <span className="font-mono text-[13px] font-semibold text-ink">{advance.number}</span>
                        <span className="text-[12px] text-ash">
                          {advance.lockedPurity ? `${advance.lockedPurity} locked at ${formatINR(advance.lockedRate ?? 0)}/g` : "No rate lock"}
                          {advance.validUntil ? ` · until ${formatDate(advance.validUntil)}` : ""}
                        </span>
                      </span>
                      <span className="text-sm font-semibold text-ok tabular-nums">{formatINR(advance.balance)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <CardBody>
                <p className="text-sm text-ash">No open advances.</p>
              </CardBody>
            )}
          </Card>
          <Card className="overflow-hidden">
            <CardHeader title="Credit notes" description="From returned pieces. Used on a bill or paid out by a manager." />
            {customer.creditNotes.length ? (
              <ul className="divide-y divide-gray-100">
                {customer.creditNotes.map((note) => (
                  <li key={note.id}>
                    <Link href={`/returns/${note.id}`} className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-navy-soft/40">
                      <span className="flex items-center gap-2 font-mono text-[13px] font-semibold text-ink">
                        <CreditCard className="size-4 text-gray-400" aria-hidden />
                        {note.number}
                      </span>
                      <span className="text-sm font-semibold text-ok tabular-nums">{formatINR(note.balance)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <CardBody>
                <p className="text-sm text-ash">No open credit notes.</p>
              </CardBody>
            )}
          </Card>
          <Card className="overflow-hidden lg:col-span-2">
            <CardHeader title="Old gold from this customer" />
            {customer.oldGold?.length ? (
              <Table minWidth={480}>
                <thead>
                  <tr>
                    <Th>Number</Th>
                    <Th>Date</Th>
                    <Th>Kind</Th>
                    <Th align="right">Value</Th>
                  </tr>
                </thead>
                <tbody>
                  {customer.oldGold.map((record) => (
                    <Tr key={record.id}>
                      <Td className="flex items-center gap-2 font-mono font-semibold text-ink">
                        <Coins className="size-4 text-gold" aria-hidden />
                        {record.number}
                      </Td>
                      <Td>{formatDate(record.createdAt)}</Td>
                      <Td>{record.kind === "exchange" ? "Taken against a bill" : "Bought for cash"}</Td>
                      <Td align="right">{formatINR(record.totalValue)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <CardBody>
                <p className="text-sm text-ash">None.</p>
              </CardBody>
            )}
          </Card>
        </div>
      )}

      {tab === "orders" && (
        <Card className="overflow-hidden">
          {orders.data?.data.length ? (
            <Table minWidth={640}>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Work</Th>
                  <Th>Promised</Th>
                  <Th align="right">Balance due</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {orders.data.data.map((order) => (
                  <Tr key={order.id} className="cursor-pointer" onClick={() => router.push(`/orders/${order.id}`)}>
                    <Td>
                      <span className="grid leading-tight">
                        <span className="font-mono font-semibold text-ink">{order.number}</span>
                        <span className="text-[12px] text-ash">{order.kind === "repair" ? "Repair" : "Custom"}</span>
                      </span>
                    </Td>
                    <Td className="max-w-72 text-[13px]">
                      <span className="line-clamp-2">{order.description}</span>
                    </Td>
                    <Td>{order.dueOn ? formatDate(order.dueOn) : "—"}</Td>
                    <Td align="right">{order.balanceDue === null ? "—" : formatINR(order.balanceDue)}</Td>
                    <Td>
                      <OrderBadge status={order.status} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState icon={Gem} title="No repairs or orders" description="Repairs and custom pieces for this customer appear here." />
          )}
        </Card>
      )}
    </div>
  );
}
