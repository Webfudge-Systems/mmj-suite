"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, UserPlus, Users } from "lucide-react";
import { useResource } from "@webfudge/auth/components";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Input, PageHeader, Pager, Spinner, Table, Td, Th, Tr } from "@webfudge/ui";
import type { CustomerWithStats, Pagination } from "@webfudge/utils/api";
import { formatDate, formatINR } from "@webfudge/utils/formatters";
import { Avatar } from "@/components/crm";
import { CustomerPicker } from "@/components/customer-picker";

type ListResult = { data: CustomerWithStats[]; meta: { pagination: Pagination } };

export default function CustomersPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);

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
        description="Everyone who has bought, booked, saved in a scheme or asked about a piece."
        actions={
          <Button onClick={() => setAdding((value) => !value)}>
            <UserPlus className="size-4" aria-hidden />
            New customer
          </Button>
        }
      />

      {adding && (
        <Card>
          <CardHeader title="New customer" description="Type the mobile number first. If they are already on file, they open instead." />
          <CardBody>
            <CustomerPicker value={null} onChange={(customer) => customer && router.push(`/customers/${customer.id}`)} />
          </CardBody>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <Input
              id="crm-customer-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or mobile number"
              inputMode="search"
              autoComplete="off"
              className="rounded-full border-navy/40 pl-11"
            />
          </div>
          {list.data && <span className="text-[13px] text-ash">{list.data.meta.pagination.total} customers</span>}
        </div>

        {list.loading && !list.data ? (
          <div className="grid place-items-center py-12 text-navy">
            <Spinner />
          </div>
        ) : list.error ? (
          <p className="p-5 text-sm text-risk">{list.error}</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={Users} title={search ? `No one matches “${search}”` : "No customers yet"} description="Customers are saved the first time you bill, book or enquire for them." />
        ) : (
          <>
            <Table minWidth={820}>
              <thead>
                <tr>
                  <Th>Customer</Th>
                  <Th>Mobile</Th>
                  <Th>City</Th>
                  <Th align="right">Bills</Th>
                  <Th align="right">Total bought</Th>
                  <Th align="right">Points</Th>
                  <Th>Last bill</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((customer) => (
                  <Tr key={customer.id} className="cursor-pointer" onClick={() => router.push(`/customers/${customer.id}`)}>
                    <Td>
                      <span className="flex items-center gap-3">
                        <Avatar name={customer.name} size="sm" />
                        <Link href={`/customers/${customer.id}`} className="font-semibold text-ink hover:underline" onClick={(event) => event.stopPropagation()}>
                          {customer.name}
                        </Link>
                        {customer.marketingOptIn && <Badge tone="ok">Offers OK</Badge>}
                      </span>
                    </Td>
                    <Td className="tabular-nums">{customer.phone}</Td>
                    <Td>{customer.city ?? "—"}</Td>
                    <Td align="right">{customer.stats.bills}</Td>
                    <Td align="right">{customer.stats.spent ? formatINR(customer.stats.spent) : "—"}</Td>
                    <Td align="right">{customer.loyaltyPoints ? customer.loyaltyPoints.toLocaleString("en-IN") : "—"}</Td>
                    <Td>{customer.stats.lastBillAt ? formatDate(customer.stats.lastBillAt) : "—"}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pager pagination={list.data?.meta.pagination} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
