"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cake, ShoppingBag, UserPlus, Users } from "lucide-react";
import { errorMessage, useApi, useResource } from "@webfudge/auth/components";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  KpiCard,
  Modal,
  PageHeader,
  Pager,
  ResultsCount,
  Spinner,
  Table,
  Tabs,
  Td,
  Th,
  ToolbarActions,
  ToolbarButton,
  ToolbarExport,
  ToolbarSearch,
  Tr,
} from "@webfudge/ui";
import type { CustomerWithStats, Pagination } from "@webfudge/utils/api";
import { downloadCsv } from "@webfudge/utils/csv";
import { formatDate, formatINR } from "@webfudge/utils/formatters";
import { CustomerPicker } from "@/components/customer-picker";
import { initials } from "@/components/customer-avatar";

type Summary = { total: number; newThisMonth: number; boughtThisMonth: number; withBirthday: number };
type ListResult = { data: CustomerWithStats[]; meta: { pagination: Pagination; summary?: Summary } };
type View = "recent" | "name";

export default function CustomersPage() {
  const router = useRouter();
  const api = useApi();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<View>("recent");
  const [adding, setAdding] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Search a moment after typing stops, from the first letter.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const list = useResource<ListResult>(`/sales/customers?stats=true&summary=true&pageSize=25&page=${page}${search ? `&q=${encodeURIComponent(search)}` : ""}`);
  const summary = list.data?.meta.summary;
  const rows = [...(list.data?.data ?? [])];
  if (view === "name" && !search) rows.sort((a, b) => a.name.localeCompare(b.name));

  async function exportCsv() {
    setExportError(null);
    try {
      const { data } = await api.get<ListResult>(`/sales/customers?stats=true&pageSize=100&page=1${search ? `&q=${encodeURIComponent(search)}` : ""}`);
      downloadCsv(`customers-${new Date().toISOString().slice(0, 10)}`, [
        ["Name", "Mobile", "City", "Email", "PAN", "Bills", "Total bought (₹)", "Last bill", "Loyalty points", "Offers OK"],
        ...data.map((row) => [row.name, row.phone, row.city, row.email, row.pan, row.stats.bills, row.stats.spent, row.stats.lastBillAt?.slice(0, 10), row.loyaltyPoints, row.marketingOptIn ? "Yes" : "No"]),
      ]);
    } catch (cause) {
      setExportError(errorMessage(cause));
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Customers"
        description="Everyone who has bought or booked with you. Open a customer for their bills, money on account and orders."
        actions={
          <Button onClick={() => setAdding(true)}>
            <UserPlus className="size-4" aria-hidden />
            New customer
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard compact title="Customers" value={summary?.total ?? "–"} icon={Users} subtitle="On file" />
        <KpiCard compact title="New this month" value={summary?.newThisMonth ?? "–"} icon={UserPlus} tone="ok" subtitle="Added since the 1st" />
        <KpiCard compact title="Bought this month" value={summary?.boughtThisMonth ?? "–"} icon={ShoppingBag} tone="gold" subtitle="Customers with a bill" />
        <KpiCard compact title="Birthdays known" value={summary?.withBirthday ?? "–"} icon={Cake} tone="navy" subtitle="For wishes from the CRM" />
      </div>

      <Tabs<View>
        label="Order"
        active={view}
        onChange={setView}
        tabs={[
          { key: "recent", label: "Recently active" },
          { key: "name", label: "A to Z" },
        ]}
        actions={
          <ToolbarActions>
            <ToolbarSearch value={query} onChange={setQuery} placeholder="Name or mobile…" />
            <ToolbarExport onExport={exportCsv} />
            <ToolbarButton icon={UserPlus} label="New customer" active onClick={() => setAdding(true)} />
          </ToolbarActions>
        }
      />
      {exportError && <p className="text-[13px] text-risk">{exportError}</p>}
      {list.data && <ResultsCount shown={rows.length} total={list.data.meta.pagination.total} noun="customer" />}

      <Card className="overflow-hidden">
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
            <Table minWidth={760}>
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
                      <Link href={`/customers/${customer.id}`} className="flex items-center gap-3" onClick={(event) => event.stopPropagation()}>
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-navy to-navy-deep text-[12px] font-bold text-gold">{initials(customer.name)}</span>
                        <span className="font-semibold text-ink hover:underline">{customer.name}</span>
                        {customer.pan && <Badge>PAN</Badge>}
                      </Link>
                    </Td>
                    <Td className="tabular-nums">{customer.phone}</Td>
                    <Td>{customer.city ?? "—"}</Td>
                    <Td align="right">{customer.stats.bills}</Td>
                    <Td align="right" className="font-semibold text-ink">
                      {customer.stats.spent ? formatINR(customer.stats.spent) : "—"}
                    </Td>
                    <Td align="right">{customer.loyaltyPoints || "—"}</Td>
                    <Td className="whitespace-nowrap">{customer.stats.lastBillAt ? formatDate(customer.stats.lastBillAt) : "—"}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pager pagination={list.data?.meta.pagination} onPage={setPage} />
          </>
        )}
      </Card>

      <Modal open={adding} onClose={() => setAdding(false)} title="New customer" description="Type the mobile number first. If they are already on file, they open instead." size="lg">
        <CustomerPicker
          value={null}
          onChange={(customer) => {
            if (!customer) return;
            setAdding(false);
            router.push(`/customers/${customer.id}`);
          }}
        />
      </Modal>
    </div>
  );
}
