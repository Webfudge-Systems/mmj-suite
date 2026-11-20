"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, HandCoins, Undo2, Wallet } from "lucide-react";
import { errorMessage, useApi, useAuth, useResource } from "@webfudge/auth/components";
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState, Field, Input, KpiCard, PageHeader, ResultsCount, Spinner, Table, Tabs, Td, Th, ToolbarActions, ToolbarExport, ToolbarSearch, Tr } from "@webfudge/ui";
import type { CreditNote, Invoice } from "@webfudge/utils/api";
import { downloadCsv } from "@webfudge/utils/csv";
import { formatDate, formatDateTime, formatINR } from "@webfudge/utils/formatters";
import { CREDIT_STATUS } from "@/components/credit-note";
import { InvoicePicker } from "@/components/invoice-picker";


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

type View = "open" | "used" | "refunded" | "all";

export default function ReturnsPage({ searchParams }: { searchParams: Promise<{ invoice?: string }> }) {
  const { invoice: invoiceParam } = use(searchParams);
  const router = useRouter();
  const api = useApi();
  const notes = useResource<{ data: CreditNote[] }>("/sales/credit-notes");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [issued, setIssued] = useState<CreditNote | null>(null);
  const [view, setView] = useState<View>("open");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!invoiceParam) return;
    let active = true;
    api.get<{ data: Invoice }>(`/sales/invoices/${invoiceParam}`).then(({ data }) => active && setInvoice(data)).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [api, invoiceParam]);

  const all = notes.data?.data ?? [];
  const open = all.filter((note) => note.status === "open");
  const monthStart = `${new Date().toISOString().slice(0, 7)}-01`;
  const thisMonth = all.filter((note) => note.createdAt.slice(0, 10) >= monthStart);
  const paidOut = all.filter((note) => note.status === "refunded").reduce((sum, note) => sum + note.amount, 0);
  const needle = q.trim().toLowerCase();
  const rows = all.filter((note) => {
    if (view !== "all" && note.status !== view) return false;
    if (!needle) return true;
    return [note.number, note.customer?.name, note.customer?.phone, note.invoice?.number, note.reason].some((value) => value?.toLowerCase().includes(needle));
  });

  function exportCsv() {
    downloadCsv(`credit-notes-${new Date().toISOString().slice(0, 10)}`, [
      ["Number", "Date", "Customer", "Mobile", "From invoice", "Amount (₹)", "Left (₹)", "Deduction %", "Reason", "Status"],
      ...rows.map((note) => [note.number, note.createdAt.slice(0, 10), note.customer?.name, note.customer?.phone, note.invoice?.number, note.amount, note.balance, note.deductionPercent, note.reason, CREDIT_STATUS[note.status].label]),
    ]);
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="Returns & credit notes" description="Take pieces back from an invoice. The customer gets a credit note to use on a new bill or to be paid out, and a printed copy as proof." />
      {issued && (
        <Alert tone="ok" title={`${issued.number} issued for ${formatINR(issued.amount)}`}>
          The pieces are back in stock and need a tray.{" "}
          <Link href={`/returns/${issued.id}`} className="font-semibold underline">
            Open and print the credit note
          </Link>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard compact title="Open credit notes" value={open.length} icon={CreditCard} subtitle="Waiting to be used or paid out" />
        <KpiCard compact title="Owed to customers" value={formatINR(open.reduce((sum, note) => sum + note.balance, 0))} icon={Wallet} tone="gold" subtitle="Left on open credit notes" />
        <KpiCard compact title="Returns this month" value={thisMonth.length} icon={Undo2} tone="navy" subtitle={formatINR(thisMonth.reduce((sum, note) => sum + note.amount, 0))} />
        <KpiCard compact title="Paid out" value={formatINR(paidOut)} icon={HandCoins} tone="ok" subtitle="Credit notes refunded in all" />
      </div>

      <Card>
        <CardHeader title="Take pieces back" description="Find the invoice the pieces were sold on." />
        <CardBody className="grid gap-4">
          {invoice ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-navy-line bg-navy-soft/60 px-4 py-3">
                <span className="text-sm">
                  <span className="font-mono font-semibold text-ink">{invoice.number}</span> · {invoice.customer.name} · {formatDateTime(invoice.invoiceDate)} · {formatINR(invoice.total)}
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
            <InvoicePicker onChoose={async (match) => setInvoice((await api.get<{ data: Invoice }>(`/sales/invoices/${match.id}`)).data)} />
          )}
        </CardBody>
      </Card>

      <Tabs<View>
        label="Credit note status"
        active={view}
        onChange={setView}
        tabs={[
          { key: "open", label: "Open", count: open.length },
          { key: "used", label: "Used", count: all.filter((note) => note.status === "used").length },
          { key: "refunded", label: "Paid out", count: all.filter((note) => note.status === "refunded").length },
          { key: "all", label: "All", count: all.length },
        ]}
        actions={
          <ToolbarActions>
            <ToolbarSearch value={q} onChange={setQ} placeholder="Number, customer or invoice…" />
            <ToolbarExport onExport={exportCsv} />
          </ToolbarActions>
        }
      />
      {notes.data && <ResultsCount shown={rows.length} total={all.length} noun="credit note" />}

      <Card className="overflow-hidden">
        {notes.loading && !notes.data ? (
          <div className="grid place-items-center py-12 text-navy">
            <Spinner />
          </div>
        ) : !rows.length ? (
          <EmptyState icon={CreditCard} title="No credit notes here" description={needle ? "Nothing matches the search." : "Credit notes from returns appear here."} />
        ) : (
          <Table minWidth={820}>
            <thead>
              <tr>
                <Th>Credit note</Th>
                <Th>Customer</Th>
                <Th>From invoice</Th>
                <Th align="right">Amount</Th>
                <Th align="right">Left</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((note) => (
                <Tr key={note.id} className="cursor-pointer" onClick={() => router.push(`/returns/${note.id}`)}>
                  <Td>
                    <Link href={`/returns/${note.id}`} className="grid leading-tight" onClick={(event) => event.stopPropagation()}>
                      <span className="font-mono font-semibold text-ink hover:underline">{note.number}</span>
                      <span className="text-[12px] text-ash">
                        {formatDate(note.createdAt)}
                        {note.reason ? ` · ${note.reason}` : ""}
                      </span>
                    </Link>
                  </Td>
                  <Td>
                    <span className="grid leading-tight">
                      <span className="font-semibold text-ink">{note.customer?.name}</span>
                      <span className="text-[12px] text-ash tabular-nums">{note.customer?.phone}</span>
                    </span>
                  </Td>
                  <Td>
                    {note.invoice ? (
                      <Link href={`/invoices/${note.invoice.id}`} className="font-mono text-[12.5px] text-navy hover:underline" onClick={(event) => event.stopPropagation()}>
                        {note.invoice.number}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td align="right">{formatINR(note.amount)}</Td>
                  <Td align="right" className="font-semibold text-ink">
                    {formatINR(note.balance)}
                  </Td>
                  <Td>
                    <Badge tone={CREDIT_STATUS[note.status].tone} dot>
                      {CREDIT_STATUS[note.status].label}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

