"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApi } from "@webfudge/auth/components";
import { Badge, Card, CardBody, CardHeader, EmptyState, PageHeader, Table, Td, Th, Tr, buttonClass } from "@webfudge/ui";
import type { Customer, CustomerDetail } from "@webfudge/utils/api";
import { formatDate, formatINR } from "@webfudge/utils/formatters";
import { CustomerPicker } from "@/components/customer-picker";

export default function CustomersPage() {
  const api = useApi();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);

  useEffect(() => {
    if (!customer) return;
    let active = true;
    api.get<{ data: CustomerDetail }>(`/sales/customers/${customer.id}`).then(({ data }) => active && setDetail(data)).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [api, customer]);

  const shown = customer ? detail : null;

  return (
    <div className="grid gap-6">
      <PageHeader title="Customers" description="Look someone up by mobile number to see their bills, advances and credit notes. Full customer records arrive with the CRM." />
      <Card>
        <CardBody>
          <CustomerPicker value={customer} onChange={(next) => { setCustomer(next); setDetail(null); }} />
        </CardBody>
      </Card>
      {shown && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader title="Bills" />
            {!shown.invoices.length ? (
              <EmptyState title="No bills yet" />
            ) : (
              <Table minWidth={420}>
                <thead>
                  <tr>
                    <Th>Invoice</Th>
                    <Th>Date</Th>
                    <Th align="right">Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {shown.invoices.map((invoice) => (
                    <Tr key={invoice.id}>
                      <Td>
                        <Link href={`/invoices/${invoice.id}`} className="font-mono font-semibold hover:underline">
                          {invoice.number}
                        </Link>
                        {invoice.status === "cancelled" && <Badge tone="risk" className="ml-2">Cancelled</Badge>}
                      </Td>
                      <Td>{formatDate(invoice.invoiceDate)}</Td>
                      <Td align="right">{formatINR(invoice.total)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
          <Card>
            <CardHeader title="On account" />
            <CardBody className="grid gap-2 text-sm">
              {shown.advances.map((advance) => (
                <div key={advance.id} className="flex justify-between gap-3">
                  <span>Advance {advance.number}</span>
                  <span className="tabular-nums">{formatINR(advance.balance)}</span>
                </div>
              ))}
              {shown.creditNotes.map((note) => (
                <div key={note.id} className="flex justify-between gap-3">
                  <span>Credit note {note.number}</span>
                  <span className="tabular-nums">{formatINR(note.balance)}</span>
                </div>
              ))}
              {!shown.advances.length && !shown.creditNotes.length && <p className="text-ash">Nothing on account.</p>}
              <Link href="/" className={buttonClass("primary", "sm", "mt-2 justify-self-start")}>
                Start a bill
              </Link>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
