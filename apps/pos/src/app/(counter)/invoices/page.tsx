"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, FilePlus2, IndianRupee, ReceiptText, TrendingUp, X } from "lucide-react";
import { errorMessage, useApi, useBranch, useResource } from "@webfudge/auth/components";
import {
  Badge,
  Card,
  CopyText,
  EmptyState,
  KpiCard,
  PageHeader,
  Pager,
  ResultsCount,
  Spinner,
  Table,
  Tabs,
  Td,
  Th,
  ToolbarActions,
  ToolbarExport,
  ToolbarLinkClass,
  ToolbarSearch,
  Tr,
  buttonClass,
} from "@webfudge/ui";
import type { InvoiceStats, InvoiceSummary, Page } from "@webfudge/utils/api";
import { downloadCsv } from "@webfudge/utils/csv";
import { formatDate, formatDateTime, formatRupees } from "@webfudge/utils/formatters";

type View = "all" | "paid" | "cancelled";

export default function InvoicesPage() {
  const router = useRouter();
  const api = useApi();
  const { branch } = useBranch();
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");
  const [view, setView] = useState<View>("all");
  const [page, setPage] = useState(1);
  const [exportError, setExportError] = useState<string | null>(null);

  const params = new URLSearchParams({ page: String(page), stats: "true" });
  if (branch) params.set("branchId", String(branch.id));
  if (q.trim()) params.set("q", q.trim());
  if (date) params.set("date", date);
  if (view !== "all") params.set("status", view);
  const invoices = useResource<Page<InvoiceSummary> & { meta: { stats?: InvoiceStats } }>(branch ? `/sales/invoices?${params}` : null);
  const stats = invoices.data?.meta.stats;
  const rows = invoices.data?.data ?? [];

  const go = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(1);
  };

  async function exportCsv() {
    setExportError(null);
    try {
      const all = new URLSearchParams(params);
      all.delete("stats");
      all.set("page", "1");
      all.set("pageSize", "500");
      const { data } = await api.get<Page<InvoiceSummary>>(`/sales/invoices?${all}`);
      downloadCsv(`invoices-${date || new Date().toISOString().slice(0, 10)}`, [
        ["Invoice", "Date", "Customer", "Mobile", "Pieces", "Total (₹)", "Status", "Salesperson", "Cashier"],
        ...data.map((invoice) => [invoice.number, invoice.invoiceDate.slice(0, 10), invoice.customer.name, invoice.customer.phone, invoice.pieces, invoice.total, invoice.status, invoice.salesperson, invoice.cashier]),
      ]);
    } catch (cause) {
      setExportError(errorMessage(cause));
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Invoices"
        description="Every bill from this counter. Search by invoice number, customer name or mobile."
        actions={
          <Link href="/" className={buttonClass("primary")}>
            <FilePlus2 className="size-4" aria-hidden />
            New bill
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard compact title="Sales today" value={stats ? formatRupees(stats.today.total) : "–"} icon={IndianRupee} tone="gold" subtitle={stats ? `${stats.today.count} ${stats.today.count === 1 ? "bill" : "bills"}` : " "} />
        <KpiCard compact title="This month" value={stats ? formatRupees(stats.month.total) : "–"} icon={TrendingUp} subtitle={stats ? `${stats.month.count} bills` : " "} />
        <KpiCard compact title="Average bill" value={stats ? formatRupees(stats.averageBill) : "–"} icon={ReceiptText} tone="ok" subtitle="Paid bills this month" />
        <KpiCard compact title="Cancelled" value={stats?.cancelledThisMonth ?? "–"} icon={X} tone={stats?.cancelledThisMonth ? "risk" : "navy"} subtitle="This month" />
      </div>

      <Tabs<View>
        label="Invoice status"
        active={view}
        onChange={go(setView)}
        tabs={[
          { key: "all", label: "All" },
          { key: "paid", label: "Paid" },
          { key: "cancelled", label: "Cancelled" },
        ]}
        actions={
          <ToolbarActions>
            <ToolbarSearch value={q} onChange={go(setQ)} placeholder="Invoice, name or mobile…" />
            <label className="relative">
              <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-500" aria-hidden />
              <input
                type="date"
                aria-label="Bills of one day"
                value={date}
                onChange={(event) => go(setDate)(event.target.value)}
                className="h-10 rounded-xl border border-gray-300 bg-white pr-3 pl-9 text-sm shadow-md outline-none focus:border-navy/50 focus:ring-2 focus:ring-navy/15"
              />
            </label>
            <ToolbarExport onExport={exportCsv} />
            <Link href="/" className={ToolbarLinkClass(true)} title="New bill" aria-label="New bill">
              <FilePlus2 className="size-[18px]" aria-hidden />
            </Link>
          </ToolbarActions>
        }
      />
      {exportError && <p className="text-[13px] text-risk">{exportError}</p>}
      {invoices.data && (
        <div className="flex flex-wrap items-center gap-2">
          <ResultsCount shown={rows.length} total={invoices.data.meta.pagination.total} noun="invoice" />
          {date && (
            <button type="button" onClick={() => go(setDate)("")} className="inline-flex items-center gap-1 rounded-full border border-navy-line bg-navy-soft px-2.5 py-0.5 text-[12px] font-semibold text-navy">
              {formatDate(date)}
              <X className="size-3" aria-hidden />
            </button>
          )}
        </div>
      )}

      <Card className="overflow-hidden">
        {invoices.loading && !invoices.data ? (
          <div className="grid place-items-center p-10 text-navy">
            <Spinner />
          </div>
        ) : invoices.error ? (
          <p className="p-5 text-[13px] text-risk">{invoices.error}</p>
        ) : !rows.length ? (
          <EmptyState icon={ReceiptText} title="No invoices" description={q || date ? "Nothing matches. Clear the search or the date." : "Bills you issue appear here."} />
        ) : (
          <>
            <Table minWidth={820}>
              <thead>
                <tr>
                  <Th>Invoice</Th>
                  <Th>Customer</Th>
                  <Th align="right">Pieces</Th>
                  <Th align="right">Total</Th>
                  <Th>Date</Th>
                  <Th>Sold by</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((invoice) => (
                  <Tr key={invoice.id} className="cursor-pointer" onClick={() => router.push(`/invoices/${invoice.id}`)}>
                    <Td>
                      <CopyText value={invoice.number} label="Copy invoice number">
                        <Link href={`/invoices/${invoice.id}`} className="font-mono font-semibold text-ink hover:underline" onClick={(event) => event.stopPropagation()}>
                          {invoice.number}
                        </Link>
                      </CopyText>
                    </Td>
                    <Td>
                      <Link href={`/customers/${invoice.customer.id}`} className="grid leading-tight" onClick={(event) => event.stopPropagation()}>
                        <span className="font-semibold text-ink hover:underline">{invoice.customer.name}</span>
                        <span className="text-[12px] text-ash tabular-nums">{invoice.customer.phone}</span>
                      </Link>
                    </Td>
                    <Td align="right">{invoice.pieces}</Td>
                    <Td align="right" className={invoice.status === "cancelled" ? "text-ash line-through" : "font-semibold text-ink"}>
                      {formatRupees(invoice.total)}
                    </Td>
                    <Td className="whitespace-nowrap">{formatDateTime(invoice.invoiceDate)}</Td>
                    <Td>
                      <span className="grid leading-tight">
                        <span>{invoice.salesperson ?? "—"}</span>
                        {invoice.cashier && <span className="text-[12px] text-ash">billed by {invoice.cashier}</span>}
                      </span>
                    </Td>
                    <Td>{invoice.status === "cancelled" ? <Badge tone="risk">Cancelled</Badge> : <Badge tone="ok">Paid</Badge>}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pager pagination={invoices.data?.meta.pagination} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
