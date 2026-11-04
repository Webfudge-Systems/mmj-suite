"use client";

import { Fragment, use, useEffect, useState } from "react";
import Link from "next/link";
import { errorMessage, useApi, useAuth, useResource } from "@webfudge/auth/components";
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState, Field, Input, PageHeader, Table, Td, Th, Tr } from "@webfudge/ui";
import type { CreditNote, Invoice, InvoiceSummary, Page } from "@webfudge/utils/api";
import { formatDateTime, formatINR } from "@webfudge/utils/formatters";
import { PaymentsEditor, newPaymentRow, paidPaise, toPayments, type PaymentRow } from "@/components/payments";

const STATUS = { open: { label: "Open", tone: "gold" }, used: { label: "Used", tone: "ok" }, refunded: { label: "Paid out", tone: "neutral" } } as const;

function ReturnForm({ invoice, onDone }: { invoice: Invoice; onDone: (note: CreditNote) => void }) {
  const api = useApi();
  const { hasRole } = useAuth();
  const [chosen, setChosen] = useState<number[]>([]);
  const [reason, setReason] = useState("");
  const [deduction, setDeduction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = invoice.lines.filter((line) => !line.returnedAt);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ data: CreditNote }>("/sales/returns", {
        invoiceId: invoice.id,
        itemIds: chosen,
        reason,
        ...(deduction !== "" ? { deductionPercent: Number(deduction) } : {}),
      });
      onDone(data);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <ul className="grid gap-2">
        {invoice.lines.map((line) => (
          <li key={line.itemId}>
            <label className={`flex flex-wrap items-center gap-3 rounded-[var(--radius-control)] border border-line px-3 py-2 text-sm ${line.returnedAt ? "opacity-50" : ""}`}>
              <input
                type="checkbox"
                disabled={!!line.returnedAt}
                checked={chosen.includes(line.itemId)}
                onChange={(event) => setChosen((ids) => (event.target.checked ? [...ids, line.itemId] : ids.filter((id) => id !== line.itemId)))}
              />
              <span className="font-mono font-semibold">{line.tagNumber}</span>
              <span>{line.description}</span>
              <span className="ml-auto tabular-nums">{line.returnedAt ? `Returned on ${line.creditNoteNumber}` : `Paid ${formatINR(line.total)}`}</span>
            </label>
          </li>
        ))}
      </ul>
      {!open.length && <p className="text-sm text-ash">Every piece on this invoice has been returned.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Why it is coming back" htmlFor="return-reason">
          <Input id="return-reason" value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>
        {hasRole("owner", "branch_manager") && (
          <Field label="Deduction %" htmlFor="return-deduction" hint="Leave empty for the shop's usual return deduction.">
            <Input id="return-deduction" inputMode="decimal" value={deduction} onChange={(event) => setDeduction(event.target.value)} />
          </Field>
        )}
      </div>
      {error && <Alert tone="risk">{error}</Alert>}
      <Button loading={busy} disabled={!chosen.length || !reason.trim()} onClick={submit} className="justify-self-start">
        Take back {chosen.length || ""} and issue credit note
      </Button>
    </div>
  );
}

function PayOut({ note, onDone }: { note: CreditNote; onDone: () => void }) {
  const api = useApi();
  const [payouts, setPayouts] = useState<PaymentRow[]>(() => [newPaymentRow("bank_transfer")]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function pay() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/sales/credit-notes/${note.id}/refund`, { payouts: toPayments(payouts) });
      onDone();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid max-w-md gap-3 py-2">
      <PaymentsEditor rows={payouts} onChange={setPayouts} due={note.balance} label={`Pay out ${formatINR(note.balance)}`} />
      {error && <Alert tone="risk">{error}</Alert>}
      <Button size="sm" variant="danger" loading={busy} disabled={paidPaise(payouts) !== Math.round(note.balance * 100)} onClick={pay} className="justify-self-start">
        Pay out
      </Button>
    </div>
  );
}

export default function ReturnsPage({ searchParams }: { searchParams: Promise<{ invoice?: string }> }) {
  const { invoice: invoiceParam } = use(searchParams);
  const api = useApi();
  const { hasRole } = useAuth();
  const notes = useResource<{ data: CreditNote[] }>("/sales/credit-notes");
  const [q, setQ] = useState("");
  const [matches, setMatches] = useState<InvoiceSummary[]>([]);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [issued, setIssued] = useState<CreditNote | null>(null);
  const [paying, setPaying] = useState<number | null>(null);

  useEffect(() => {
    if (!invoiceParam) return;
    let active = true;
    api.get<{ data: Invoice }>(`/sales/invoices/${invoiceParam}`).then(({ data }) => active && setInvoice(data)).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [api, invoiceParam]);

  useEffect(() => {
    if (q.trim().length < 3) return;
    let active = true;
    const timer = window.setTimeout(() => {
      api
        .get<Page<InvoiceSummary>>(`/sales/invoices?q=${encodeURIComponent(q.trim())}`)
        .then(({ data }) => active && setMatches(data.filter((entry) => entry.status === "paid")))
        .catch(() => active && setMatches([]));
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [api, q]);

  return (
    <div className="grid gap-6">
      <PageHeader title="Returns & credit notes" description="Take pieces back from an invoice. The customer gets a credit note to use on a new bill or to be paid out." />
      {issued && <Alert tone="ok" title={`${issued.number} issued for ${formatINR(issued.amount)}`}>The pieces are back in stock and need a tray.</Alert>}

      <Card>
        <CardHeader title="Take pieces back" />
        <CardBody className="grid gap-4">
          {invoice ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-mono font-semibold">{invoice.number}</span> · {invoice.customer.name} · {formatDateTime(invoice.invoiceDate)}
                </span>
                <Button size="sm" variant="ghost" onClick={() => setInvoice(null)}>
                  Different invoice
                </Button>
              </div>
              <ReturnForm
                key={invoice.id}
                invoice={invoice}
                onDone={(note) => {
                  setIssued(note);
                  setInvoice(null);
                  notes.reload();
                }}
              />
            </>
          ) : (
            <>
              <Input id="return-search" placeholder="Invoice number, customer name or mobile" value={q} onChange={(event) => setQ(event.target.value)} />
              {q.trim().length >= 3 && (
                <ul className="grid divide-y divide-line rounded-[var(--radius-control)] border border-line">
                  {matches.map((match) => (
                    <li key={match.id}>
                      <button
                        type="button"
                        className="flex w-full flex-wrap justify-between gap-2 px-4 py-2.5 text-left text-sm hover:bg-sunk"
                        onClick={async () => setInvoice((await api.get<{ data: Invoice }>(`/sales/invoices/${match.id}`)).data)}
                      >
                        <span className="font-mono font-semibold">{match.number}</span>
                        <span>
                          {match.customer.name} · {formatINR(match.total)}
                        </span>
                      </button>
                    </li>
                  ))}
                  {!matches.length && <li className="px-4 py-2.5 text-[13px] text-ash">No paid invoice matches.</li>}
                </ul>
              )}
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Credit notes" />
        {!notes.data?.data.length ? (
          <EmptyState title="No credit notes" />
        ) : (
          <Table minWidth={720}>
            <thead>
              <tr>
                <Th>Number</Th>
                <Th>Customer</Th>
                <Th>From</Th>
                <Th align="right">Amount</Th>
                <Th align="right">Left</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {notes.data.data.map((note) => (
                <Fragment key={note.id}>
                  <Tr>
                    <Td>
                      <span className="font-mono font-semibold">{note.number}</span>
                      <span className="block text-[12px] text-ash">{note.reason}</span>
                    </Td>
                    <Td>{note.customer?.name}</Td>
                    <Td>
                      {note.invoice ? (
                        <Link href={`/invoices/${note.invoice.id}`} className="font-mono text-[12px] underline">
                          {note.invoice.number}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td align="right">{formatINR(note.amount)}</Td>
                    <Td align="right">{formatINR(note.balance)}</Td>
                    <Td>
                      <Badge tone={STATUS[note.status].tone}>{STATUS[note.status].label}</Badge>
                    </Td>
                    <Td>
                      {note.status === "open" && hasRole("owner", "branch_manager") && paying !== note.id && (
                        <Button size="sm" variant="ghost" onClick={() => setPaying(note.id)}>
                          Pay out
                        </Button>
                      )}
                    </Td>
                  </Tr>
                  {paying === note.id && (
                    <Tr>
                      <Td colSpan={7}>
                        <PayOut
                          note={note}
                          onDone={() => {
                            setPaying(null);
                            notes.reload();
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
