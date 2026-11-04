"use client";

import { useState } from "react";
import Link from "next/link";
import { useBranch, useResource } from "@webfudge/auth/components";
import { Badge, Card, EmptyState, Input, PageHeader, Pager, Spinner, Table, Td, Th, Tr } from "@webfudge/ui";
import type { InvoiceSummary, Page } from "@webfudge/utils/api";
import { formatDateTime, formatRupees } from "@webfudge/utils/formatters";

export default function InvoicesPage() {
  const { branch } = useBranch();
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page) });
  if (branch) params.set("branchId", String(branch.id));
  if (q.trim()) params.set("q", q.trim());
  if (date) params.set("date", date);
  const invoices = useResource<Page<InvoiceSummary>>(branch ? `/sales/invoices?${params}` : null);

  return (
    <div className="grid gap-6">
      <PageHeader title="Invoices" description="Search by invoice number, customer name or mobile number." />
      <div className="flex flex-wrap gap-3">
        <Input id="invoice-search" placeholder="Invoice, name or mobile" value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} className="max-w-xs" />
        <Input id="invoice-date" type="date" aria-label="Date" value={date} onChange={(event) => { setDate(event.target.value); setPage(1); }} className="max-w-[180px]" />
      </div>
      <Card>
        {invoices.loading ? (
          <div className="grid place-items-center p-10 text-navy">
            <Spinner />
          </div>
        ) : invoices.error ? (
          <p className="p-5 text-[13px] text-risk">{invoices.error}</p>
        ) : !invoices.data?.data.length ? (
          <EmptyState title="No invoices" />
        ) : (
          <>
            <Table minWidth={720}>
              <thead>
                <tr>
                  <Th>Invoice</Th>
                  <Th>Customer</Th>
                  <Th align="right">Pieces</Th>
                  <Th align="right">Total</Th>
                  <Th>Date</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {invoices.data.data.map((invoice) => (
                  <Tr key={invoice.id} className="hover:bg-sunk/60">
                    <Td>
                      <Link href={`/invoices/${invoice.id}`} className="font-mono font-semibold hover:underline">
                        {invoice.number}
                      </Link>
                    </Td>
                    <Td>
                      {invoice.customer.name}
                      <span className="block text-[12px] text-ash tabular-nums">{invoice.customer.phone}</span>
                    </Td>
                    <Td align="right">{invoice.pieces}</Td>
                    <Td align="right">{formatRupees(invoice.total)}</Td>
                    <Td>
                      {formatDateTime(invoice.invoiceDate)}
                      {invoice.cashier && <span className="block text-[12px] text-ash">by {invoice.cashier}</span>}
                    </Td>
                    <Td>{invoice.status === "cancelled" && <Badge tone="risk">Cancelled</Badge>}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pager pagination={invoices.data.meta.pagination} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
