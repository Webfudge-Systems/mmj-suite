"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import { Gift, Inbox, PencilLine, PiggyBank, ReceiptText, ShoppingBag } from "lucide-react";
import { errorMessage, useApi, useAuth, useBranch, useResource } from "@webfudge/auth/components";
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState, Field, Input, KpiCard, PageHeader, Spinner, Table, Td, Textarea, Th, Tr, buttonClass } from "@webfudge/ui";
import type { CustomerProfile, LoyaltyRules } from "@webfudge/utils/api";
import { LOYALTY_KIND_LABELS } from "@webfudge/utils/api";
import { formatDate, formatDateTime, formatINR } from "@webfudge/utils/formatters";
import { Avatar, EnquiryBadge, SchemeBadge, WhatsAppButton } from "@/components/crm";

function EditCustomer({ customer, onSaved, onCancel }: { customer: CustomerProfile; onSaved: () => void; onCancel: () => void }) {
  const api = useApi();
  const [form, setForm] = useState({
    name: customer.name,
    phone: customer.phone,
    altPhone: customer.altPhone ?? "",
    email: customer.email ?? "",
    city: customer.city ?? "",
    address: customer.address ?? "",
    birthDate: customer.birthDate ?? "",
    anniversaryDate: customer.anniversaryDate ?? "",
    tags: customer.tags.join(", "),
    notes: customer.notes ?? "",
    marketingOptIn: customer.marketingOptIn,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.put(`/sales/customers/${customer.id}`, {
        ...form,
        // Fields the counter owns are sent back unchanged so nothing is lost.
        pan: customer.pan,
        gstin: customer.gstin,
        birthDate: form.birthDate || null,
        anniversaryDate: form.anniversaryDate || null,
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      });
      onSaved();
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Edit details" description="Birthdays and anniversaries drive the reminders. Only send offers to customers who agreed." />
      <CardBody>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" noValidate>
          <Field label="Name" htmlFor="c-name">
            <Input id="c-name" value={form.name} onChange={(event) => set("name")(event.target.value)} />
          </Field>
          <Field label="Mobile" htmlFor="c-phone">
            <Input id="c-phone" inputMode="tel" value={form.phone} onChange={(event) => set("phone")(event.target.value)} />
          </Field>
          <Field label="Other number" htmlFor="c-alt">
            <Input id="c-alt" inputMode="tel" value={form.altPhone} onChange={(event) => set("altPhone")(event.target.value)} />
          </Field>
          <Field label="Email" htmlFor="c-email">
            <Input id="c-email" type="email" value={form.email} onChange={(event) => set("email")(event.target.value)} />
          </Field>
          <Field label="City" htmlFor="c-city">
            <Input id="c-city" value={form.city} onChange={(event) => set("city")(event.target.value)} />
          </Field>
          <Field label="Tags" htmlFor="c-tags" hint="Comma separated, like bridal 2027, VIP">
            <Input id="c-tags" value={form.tags} onChange={(event) => set("tags")(event.target.value)} />
          </Field>
          <Field label="Birthday" htmlFor="c-birth">
            <Input id="c-birth" type="date" value={form.birthDate} onChange={(event) => set("birthDate")(event.target.value)} />
          </Field>
          <Field label="Wedding anniversary" htmlFor="c-anniv">
            <Input id="c-anniv" type="date" value={form.anniversaryDate} onChange={(event) => set("anniversaryDate")(event.target.value)} />
          </Field>
          <Field label="Address" htmlFor="c-address">
            <Input id="c-address" value={form.address} onChange={(event) => set("address")(event.target.value)} />
          </Field>
          <Field label="Notes" htmlFor="c-notes" className="sm:col-span-2 lg:col-span-3">
            <Textarea id="c-notes" value={form.notes} onChange={(event) => set("notes")(event.target.value)} placeholder="Ring size, preferences, family occasions coming up" />
          </Field>
          <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm sm:col-span-2 lg:col-span-3">
            <input type="checkbox" checked={form.marketingOptIn} onChange={(event) => set("marketingOptIn")(event.target.checked)} className="size-5 accent-navy" />
            <span>
              <span className="font-semibold text-ink">Happy to receive offers</span>
              <span className="block text-[12.5px] text-ash">Tick only if the customer said yes. Campaigns go only to these customers.</span>
            </span>
          </label>
          {error && <Alert tone="risk" className="sm:col-span-2 lg:col-span-3">{error}</Alert>}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <Button type="submit" loading={busy}>
              Save
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

function Points({ customer, rules, onChanged }: { customer: CustomerProfile; rules: LoyaltyRules | undefined; onChanged: () => void }) {
  const api = useApi();
  const { hasRole } = useAuth();
  const { branch } = useBranch();
  const [mode, setMode] = useState<"redeem" | "adjust" | null>(null);
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "risk"; text: string } | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "redeem") {
        const { data } = await api.post<{ data: { advanceNumber: string; amount: number } }>(`/crm/customers/${customer.id}/points/redeem`, { points: Number(points), branchId: branch?.id });
        setMessage({ tone: "ok", text: `Redeemed. Advance ${data.advanceNumber} for ${formatINR(data.amount)} is ready at the billing counter.` });
      } else {
        await api.post(`/crm/customers/${customer.id}/points/adjust`, { points: Number(points), note });
        setMessage({ tone: "ok", text: "Points corrected." });
      }
      setMode(null);
      setPoints("");
      setNote("");
      onChanged();
    } catch (cause) {
      setMessage({ tone: "risk", text: errorMessage(cause) });
    } finally {
      setBusy(false);
    }
  }

  const value = rules ? Math.round(Number(points || 0) * rules.pointValue) : 0;

  return (
    <Card>
      <CardHeader
        title="Loyalty points"
        description={rules?.enabled ? `1 point for every ${formatINR(rules.rupeesPerPoint)} billed · 1 point = ${formatINR(rules.pointValue)}` : "Loyalty is switched off in settings"}
        action={
          <div className="flex gap-2">
            {hasRole("owner", "branch_manager", "cashier") && rules?.enabled && (
              <Button size="sm" onClick={() => setMode(mode === "redeem" ? null : "redeem")} disabled={customer.loyaltyPoints < (rules?.minRedeem ?? 1)}>
                Redeem
              </Button>
            )}
            {hasRole("owner", "branch_manager") && (
              <Button size="sm" variant="secondary" onClick={() => setMode(mode === "adjust" ? null : "adjust")}>
                Correct
              </Button>
            )}
          </div>
        }
      />
      <CardBody className="grid gap-4">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-ink tabular-nums">{customer.loyaltyPoints.toLocaleString("en-IN")}</span>
          <span className="text-sm text-ash">points · worth {formatINR(customer.summary.pointsValue)}</span>
        </div>
        {mode && (
          <form onSubmit={submit} className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-4" noValidate>
            <Field
              label={mode === "redeem" ? "Points to redeem" : "Points to add (use a minus sign to take away)"}
              htmlFor="points"
              hint={mode === "redeem" ? `Becomes an advance of ${formatINR(value)} the counter takes off the next bill. At least ${rules?.minRedeem} points.` : undefined}
            >
              <Input id="points" inputMode="numeric" value={points} onChange={(event) => setPoints(event.target.value)} className="max-w-48" autoFocus />
            </Field>
            {mode === "adjust" && (
              <Field label="Reason" htmlFor="points-note">
                <Input id="points-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Like: welcome bonus, or points from the old system" />
              </Field>
            )}
            <div className="flex gap-2">
              <Button type="submit" size="sm" loading={busy} disabled={!points}>
                {mode === "redeem" ? "Redeem points" : "Save correction"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setMode(null)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
        {message && <Alert tone={message.tone}>{message.text}</Alert>}
      </CardBody>
      {customer.loyalty.length > 0 && (
        <Table minWidth={460}>
          <thead>
            <tr>
              <Th>When</Th>
              <Th>What</Th>
              <Th align="right">Points</Th>
              <Th align="right">Balance</Th>
            </tr>
          </thead>
          <tbody>
            {customer.loyalty.slice(0, 15).map((entry) => (
              <Tr key={entry.id}>
                <Td className="whitespace-nowrap">{formatDate(entry.createdAt)}</Td>
                <Td>
                  <span className="grid leading-tight">
                    <span>{LOYALTY_KIND_LABELS[entry.kind]}{entry.reference ? ` · ${entry.reference}` : ""}</span>
                    {entry.note && <span className="text-[12px] text-ash">{entry.note}</span>}
                  </span>
                </Td>
                <Td align="right" className={entry.points > 0 ? "text-ok" : "text-risk"}>
                  {entry.points > 0 ? `+${entry.points}` : entry.points}
                </Td>
                <Td align="right">{entry.balance}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

export default function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, loading, reload } = useResource<{ data: CustomerProfile }>(`/crm/customers/${id}`);
  const settings = useResource<{ data: { loyalty: LoyaltyRules } }>("/crm/settings");
  const [editing, setEditing] = useState(false);
  const customer = data?.data;

  if (loading && !customer) return <Spinner className="text-navy" />;
  if (error || !customer) return <p className="text-sm text-risk">{error ?? "Customer not found."}</p>;

  const activeSchemes = customer.schemes.filter((scheme) => scheme.status === "active" || scheme.status === "matured");
  const openAdvances = customer.advances.filter((advance) => advance.status === "open" && advance.balance > 0);

  return (
    <div className="grid gap-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-4">
            <Avatar name={customer.name} size="lg" />
            <span>{customer.name}</span>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="tabular-nums">{customer.phone}</span>
            {customer.city && <span>· {customer.city}</span>}
            {customer.birthDate && <span>· Birthday {formatDate(customer.birthDate).replace(/ \d{4}$/, "")}</span>}
            {customer.marketingOptIn ? <Badge tone="ok">Offers OK</Badge> : <Badge>No offers</Badge>}
            {customer.tags.map((tag) => (
              <Badge key={tag} tone="navy">
                {tag}
              </Badge>
            ))}
          </span>
        }
        actions={
          <>
            <WhatsAppButton href={customer.whatsapp} />
            <Button variant="secondary" onClick={() => setEditing((value) => !value)}>
              <PencilLine className="size-4" aria-hidden />
              Edit
            </Button>
          </>
        }
      />

      {editing && (
        <EditCustomer
          customer={customer}
          onSaved={() => {
            setEditing(false);
            reload();
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard compact title="Bills" value={customer.summary.bills} icon={ReceiptText} subtitle={customer.summary.lastBillAt ? `Last on ${formatDate(customer.summary.lastBillAt)}` : "No bills yet"} />
        <KpiCard compact title="Total bought" value={formatINR(customer.summary.spent)} icon={ShoppingBag} tone="ok" subtitle={`${customer.summary.pieces} pieces`} />
        <KpiCard compact title="Points" value={customer.loyaltyPoints.toLocaleString("en-IN")} icon={Gift} tone="gold" subtitle={`Worth ${formatINR(customer.summary.pointsValue)}`} />
        <KpiCard
          compact
          title="Gold schemes"
          value={activeSchemes.length}
          icon={PiggyBank}
          tone={activeSchemes.some((scheme) => scheme.behind > 0) ? "warn" : "navy"}
          subtitle={activeSchemes.length ? `${formatINR(activeSchemes.reduce((sum, scheme) => sum + scheme.paidTotal, 0))} saved` : "Not enrolled"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Points customer={customer} rules={settings.data?.data.loyalty} onChanged={reload} />

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader
              title="Gold schemes"
              action={
                <Link href={`/schemes?enrol=1&customer=${customer.id}`} className={buttonClass("secondary", "sm")}>
                  Enrol
                </Link>
              }
            />
            {customer.schemes.length ? (
              <ul className="divide-y divide-gray-100">
                {customer.schemes.map((scheme) => (
                  <li key={scheme.id}>
                    <Link href={`/schemes/${scheme.id}`} className="flex items-center gap-3 px-6 py-3.5 hover:bg-navy-soft/40">
                      <span className="grid min-w-0 flex-1 leading-tight">
                        <span className="font-semibold text-ink">
                          {scheme.number} · {scheme.plan?.name}
                        </span>
                        <span className="text-[13px] text-ash">
                          {scheme.instalmentsPaid} of {scheme.months} paid · {formatINR(scheme.paidTotal)}
                        </span>
                      </span>
                      <SchemeBadge status={scheme.status} behind={scheme.behind} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <CardBody>
                <p className="text-sm text-ash">Not in any scheme yet.</p>
              </CardBody>
            )}
          </Card>

          {openAdvances.length > 0 && (
            <Card>
              <CardHeader title="Money on account" description="Usable at the billing counter." />
              <ul className="divide-y divide-gray-100 text-sm">
                {openAdvances.map((advance) => (
                  <li key={advance.id} className="flex justify-between gap-3 px-6 py-3">
                    <span className="grid leading-tight">
                      <span className="font-semibold">{advance.number}</span>
                      {advance.note && <span className="text-[12px] text-ash">{advance.note}</span>}
                    </span>
                    <span className="tabular-nums">{formatINR(advance.balance)}</span>
                  </li>
                ))}
                {customer.creditNotes.map((note) => (
                  <li key={note.id} className="flex justify-between gap-3 px-6 py-3">
                    <span className="font-semibold">Credit note {note.number}</span>
                    <span className="tabular-nums">{formatINR(note.balance)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Bills" />
          {customer.invoices.length ? (
            <Table minWidth={420}>
              <thead>
                <tr>
                  <Th>Invoice</Th>
                  <Th>Date</Th>
                  <Th align="right">Pieces</Th>
                  <Th align="right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {customer.invoices.map((invoice) => (
                  <Tr key={invoice.id}>
                    <Td className="font-mono font-semibold">
                      {invoice.number}
                      {invoice.status === "cancelled" && (
                        <Badge tone="risk" className="ml-2">
                          Cancelled
                        </Badge>
                      )}
                    </Td>
                    <Td>{formatDate(invoice.invoiceDate)}</Td>
                    <Td align="right">{invoice.pieces}</Td>
                    <Td align="right">{formatINR(invoice.total)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState icon={ReceiptText} title="No bills yet" />
          )}
        </Card>

        <Card>
          <CardHeader
            title="Enquiries"
            action={
              <Link href={`/enquiries?new=1&name=${encodeURIComponent(customer.name)}&phone=${customer.phone}`} className={buttonClass("secondary", "sm")}>
                Add
              </Link>
            }
          />
          {customer.enquiries.length ? (
            <ul className="divide-y divide-gray-100">
              {customer.enquiries.map((enquiry) => (
                <li key={enquiry.id}>
                  <Link href={`/enquiries/${enquiry.id}`} className="flex items-center gap-3 px-6 py-3.5 hover:bg-navy-soft/40">
                    <span className="grid min-w-0 flex-1 leading-tight">
                      <span className="font-semibold text-ink">{enquiry.number}</span>
                      <span className="truncate text-[13px] text-ash">
                        {formatDateTime(enquiry.createdAt)} · {enquiry.items.map((item) => item.name).join(", ") || enquiry.message || "No details"}
                      </span>
                    </span>
                    <EnquiryBadge status={enquiry.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Inbox} title="No enquiries" />
          )}
        </Card>
      </div>

      {customer.notes && (
        <Card>
          <CardHeader title="Notes" />
          <CardBody>
            <p className="text-sm whitespace-pre-line text-ink">{customer.notes}</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
