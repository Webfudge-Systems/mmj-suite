"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FilePlus2, Search, UserPlus, Users, X } from "lucide-react";
import { useApi, useResource } from "@webfudge/auth/components";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Input, PageHeader, Pager, Spinner, Table, Td, Th, Tr, buttonClass } from "@webfudge/ui";
import type { Customer, CustomerDetail, CustomerWithStats, Pagination } from "@webfudge/utils/api";
import { formatDate, formatINR } from "@webfudge/utils/formatters";
import { CustomerPicker } from "@/components/customer-picker";

type ListResult = { data: CustomerWithStats[]; meta: { pagination: Pagination } };

function initials(name: string) {
  const parts = name.replace(/^Demo\s*[–-]\s*/, "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

/** One customer's bills and money on account, with a button to bill them. */
function CustomerView({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const api = useApi();
  const [detail, setDetail] = useState<CustomerDetail | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get<{ data: CustomerDetail }>(`/sales/customers/${customer.id}`)
      .then(({ data }) => active && setDetail(data))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [api, customer.id]);

  return (
    <div className="grid gap-6">
      <Card>
        <CardBody className="flex flex-wrap items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-navy to-navy-deep text-lg font-bold text-gold shadow-lg">
            {initials(customer.name)}
          </span>
          <div className="grid min-w-0 flex-1 leading-tight">
            <span className="truncate text-xl font-semibold text-ink">{customer.name}</span>
            <span className="text-sm text-ash tabular-nums">
              {customer.phone}
              {customer.city ? ` · ${customer.city}` : ""}
              {customer.pan ? ` · PAN ${customer.pan}` : ""}
            </span>
          </div>
          <Link href={`/?customer=${customer.id}`} className={buttonClass("primary")}>
            <FilePlus2 className="size-4" aria-hidden />
            Start a bill
          </Link>
          <Button variant="secondary" onClick={onClose}>
            <X className="size-4" aria-hidden />
            All customers
          </Button>
        </CardBody>
      </Card>

      {!detail ? (
        <Spinner className="text-navy" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader title="Bills" description={detail.invoices.length ? `${detail.invoices.length} so far` : undefined} />
            {!detail.invoices.length ? (
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
                  {detail.invoices.map((invoice) => (
                    <Tr key={invoice.id}>
                      <Td>
                        <Link href={`/invoices/${invoice.id}`} className="font-mono font-semibold hover:underline">
                          {invoice.number}
                        </Link>
                        {invoice.status === "cancelled" && (
                          <Badge tone="risk" className="ml-2">
                            Cancelled
                          </Badge>
                        )}
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
              {detail.advances.map((advance) => (
                <div key={advance.id} className="flex justify-between gap-3">
                  <span>Advance {advance.number}</span>
                  <span className="tabular-nums">{formatINR(advance.balance)}</span>
                </div>
              ))}
              {detail.creditNotes.map((note) => (
                <div key={note.id} className="flex justify-between gap-3">
                  <span>Credit note {note.number}</span>
                  <span className="tabular-nums">{formatINR(note.balance)}</span>
                </div>
              ))}
              {!detail.advances.length && !detail.creditNotes.length && <p className="text-ash">Nothing on account.</p>}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function CustomersPage() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [adding, setAdding] = useState(false);

  // Search a moment after typing stops, from the first letter.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const list = useResource<ListResult>(`/sales/customers?stats=true&pageSize=25&page=${page}${search ? `&q=${encodeURIComponent(search)}` : ""}`);
  const rows = list.data?.data ?? [];

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Customers"
        description="Everyone who has bought or booked with you. Search by name or mobile number, open a customer to see their bills, or start a bill for them."
        actions={
          !selected && (
            <Button onClick={() => setAdding((value) => !value)}>
              <UserPlus className="size-4" aria-hidden />
              New customer
            </Button>
          )
        }
      />

      {selected ? (
        <CustomerView customer={selected} onClose={() => setSelected(null)} />
      ) : (
        <>
          {adding && (
            <Card>
              <CardHeader title="New customer" description="Type the mobile number first. If they are already on file, they open instead." />
              <CardBody>
                <CustomerPicker
                  value={null}
                  onChange={(customer) => {
                    if (!customer) return;
                    setAdding(false);
                    setSelected(customer);
                    list.reload();
                  }}
                />
              </CardBody>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
                <Input
                  id="customer-list-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name or mobile number"
                  inputMode="search"
                  autoComplete="off"
                  className="rounded-full border-navy/40 pl-11"
                />
              </div>
              {list.data && (
                <span className="text-[13px] text-ash">
                  {list.data.meta.pagination.total} {list.data.meta.pagination.total === 1 ? "customer" : "customers"}
                </span>
              )}
            </div>

            {list.loading && !list.data ? (
              <div className="grid place-items-center py-12 text-navy">
                <Spinner />
              </div>
            ) : list.error ? (
              <p className="p-5 text-sm text-risk">{list.error}</p>
            ) : rows.length === 0 ? (
              <EmptyState
                icon={Users}
                title={search ? `No one matches “${search}”` : "No customers yet"}
                description={search ? "Check the spelling or number, or add them as a new customer." : "Customers are saved the first time you bill or book for them."}
                action={
                  <Button variant="secondary" onClick={() => setAdding(true)}>
                    <UserPlus className="size-4" aria-hidden />
                    New customer
                  </Button>
                }
              />
            ) : (
              <>
                <Table minWidth={720}>
                  <thead>
                    <tr>
                      <Th>Customer</Th>
                      <Th>Mobile</Th>
                      <Th>City</Th>
                      <Th align="right">Bills</Th>
                      <Th align="right">Total bought</Th>
                      <Th>Last bill</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((customer) => (
                      <Tr key={customer.id} className="cursor-pointer" onClick={() => setSelected(customer)}>
                        <Td>
                          <span className="flex items-center gap-3">
                            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-navy to-navy-deep text-[12px] font-bold text-gold">
                              {initials(customer.name)}
                            </span>
                            <button type="button" className="text-left font-semibold text-ink hover:underline" onClick={() => setSelected(customer)}>
                              {customer.name}
                            </button>
                            {customer.pan && <Badge>PAN</Badge>}
                          </span>
                        </Td>
                        <Td className="tabular-nums">{customer.phone}</Td>
                        <Td>{customer.city ?? "—"}</Td>
                        <Td align="right">{customer.stats.bills}</Td>
                        <Td align="right">{customer.stats.spent ? formatINR(customer.stats.spent) : "—"}</Td>
                        <Td>{customer.stats.lastBillAt ? formatDate(customer.stats.lastBillAt) : "—"}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
                <Pager pagination={list.data?.meta.pagination} onPage={setPage} />
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
