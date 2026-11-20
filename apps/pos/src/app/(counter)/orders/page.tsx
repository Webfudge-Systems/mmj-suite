"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlarmClock, CircleCheckBig, Hammer, IndianRupee, Plus, Wrench } from "lucide-react";
import { useResource } from "@webfudge/auth/components";
import {
  Card,
  EmptyState,
  KpiCard,
  PageHeader,
  ResultsCount,
  Spinner,
  Table,
  Tabs,
  Td,
  Th,
  ToolbarActions,
  ToolbarExport,
  ToolbarFilter,
  ToolbarLinkClass,
  ToolbarSearch,
  Tr,
  buttonClass,
} from "@webfudge/ui";
import type { ServiceOrder } from "@webfudge/utils/api";
import { ORDER_STATUS_LABELS } from "@webfudge/utils/api";
import { downloadCsv } from "@webfudge/utils/csv";
import { formatDate, formatINR } from "@webfudge/utils/formatters";
import { OrderBadge } from "@/components/order-badge";
import { mediaUrl } from "@/lib/env";

type View = "open" | "ready" | "late" | "delivered" | "all";

const OPEN = ["received", "in_work", "ready"];

export default function OrdersPage({ searchParams }: { searchParams: Promise<{ new?: string; customer?: string }> }) {
  const params = use(searchParams);
  const router = useRouter();
  const [view, setView] = useState<View>("open");
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({ kind: "" });
  const orders = useResource<{ data: ServiceOrder[] }>("/orders");
  const all = useMemo(() => orders.data?.data ?? [], [orders.data]);
  const today = new Date().toISOString().slice(0, 10);

  // Older links open the new-order form with ?new=1.
  useEffect(() => {
    if (params.new === "1") router.replace(`/orders/new${params.customer ? `?customer=${params.customer}` : ""}`);
  }, [params.new, params.customer, router]);

  const isLate = (order: ServiceOrder) => Boolean(order.dueOn && order.dueOn < today && OPEN.includes(order.status));
  const open = all.filter((order) => OPEN.includes(order.status));
  const counts = {
    open: open.length,
    ready: all.filter((order) => order.status === "ready").length,
    late: all.filter(isLate).length,
    delivered: all.filter((order) => order.status === "delivered").length,
    all: all.length,
  };
  const toCollect = open.reduce((sum, order) => sum + (order.balanceDue ?? 0), 0);

  const needle = q.trim().toLowerCase();
  const rows = all.filter((order) => {
    if (view === "open" && !OPEN.includes(order.status)) return false;
    if (view === "ready" && order.status !== "ready") return false;
    if (view === "late" && !isLate(order)) return false;
    if (view === "delivered" && order.status !== "delivered") return false;
    if (filters.kind && order.kind !== filters.kind) return false;
    if (!needle) return true;
    return [order.number, order.customer?.name, order.customer?.phone, order.description, order.itemDescription].some((value) => value?.toLowerCase().includes(needle));
  });

  function exportCsv() {
    downloadCsv(`orders-${today}`, [
      ["Order", "Kind", "Customer", "Mobile", "Work", "Status", "Promised", "Charge (₹)", "Paid (₹)", "Balance (₹)", "Karigar", "Taken in"],
      ...rows.map((order) => [
        order.number,
        order.kind === "repair" ? "Repair" : "Custom",
        order.customer?.name,
        order.customer?.phone,
        order.description,
        ORDER_STATUS_LABELS[order.status],
        order.dueOn,
        order.charge,
        order.paidTotal,
        order.balanceDue,
        order.karigar?.name,
        order.createdAt.slice(0, 10),
      ]),
    ]);
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Repairs & custom orders"
        description="From the counter to the karigar and back. The customer collects and pays here."
        actions={
          <Link href="/orders/new" className={buttonClass("primary")}>
            <Plus className="size-4" aria-hidden />
            New repair or order
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard compact title="In progress" value={counts.open} icon={Hammer} subtitle={`${open.filter((order) => order.kind === "repair").length} repairs · ${open.filter((order) => order.kind === "custom").length} custom`} />
        <KpiCard compact title="Ready to collect" value={counts.ready} icon={CircleCheckBig} tone="ok" subtitle="Tell them on WhatsApp" />
        <KpiCard compact title="Past promised date" value={counts.late} icon={AlarmClock} tone={counts.late ? "risk" : "navy"} subtitle={counts.late ? "Call the karigar or the customer" : "All on time"} />
        <KpiCard compact title="To collect" value={formatINR(toCollect)} icon={IndianRupee} tone="gold" subtitle="Balance on open orders" />
      </div>

      <Tabs<View>
        label="Order status"
        active={view}
        onChange={setView}
        tabs={[
          { key: "open", label: "In progress", count: counts.open },
          { key: "ready", label: "Ready", count: counts.ready },
          { key: "late", label: "Late", count: counts.late },
          { key: "delivered", label: "Delivered", count: counts.delivered },
          { key: "all", label: "All", count: counts.all },
        ]}
        actions={
          <ToolbarActions>
            <ToolbarSearch value={q} onChange={setQ} placeholder="Order, customer or work…" />
            <ToolbarFilter
              groups={[
                {
                  key: "kind",
                  label: "Kind",
                  options: [
                    { value: "repair", label: "Repairs" },
                    { value: "custom", label: "Custom pieces" },
                  ],
                },
              ]}
              value={filters}
              onChange={setFilters}
            />
            <ToolbarExport onExport={exportCsv} />
            <Link href="/orders/new" className={ToolbarLinkClass(true)} title="New repair or order" aria-label="New repair or order">
              <Plus className="size-[18px]" aria-hidden />
            </Link>
          </ToolbarActions>
        }
      />
      {orders.data && <ResultsCount shown={rows.length} total={all.length} noun="order" />}

      <Card className="overflow-hidden">
        {orders.loading && !orders.data ? (
          <div className="grid place-items-center py-12 text-navy">
            <Spinner />
          </div>
        ) : orders.error ? (
          <p className="p-5 text-sm text-risk">{orders.error}</p>
        ) : !rows.length ? (
          <EmptyState icon={Wrench} title="Nothing here" description={needle || filters.kind ? "Nothing matches. Clear the search or filter." : "Repairs and custom orders you take in appear here."} />
        ) : (
          <Table minWidth={900}>
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Work</Th>
                <Th>Karigar</Th>
                <Th>Promised</Th>
                <Th align="right">Balance due</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => {
                const late = isLate(order);
                const photo = order.photos[0];
                return (
                  <Tr key={order.id} className="cursor-pointer" onClick={() => router.push(`/orders/${order.id}`)}>
                    <Td>
                      <Link href={`/orders/${order.id}`} className="flex items-center gap-3" onClick={(event) => event.stopPropagation()}>
                        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 text-gray-400">
                          {photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={mediaUrl(photo.thumbnailUrl)} alt="" className="size-full object-cover" loading="lazy" />
                          ) : order.kind === "repair" ? (
                            <Wrench className="size-4" aria-hidden />
                          ) : (
                            <Hammer className="size-4" aria-hidden />
                          )}
                        </span>
                        <span className="grid leading-tight">
                          <span className="font-mono font-semibold text-ink hover:underline">{order.number}</span>
                          <span className="text-[12px] text-ash">{order.kind === "repair" ? "Repair" : "Custom"}</span>
                        </span>
                      </Link>
                    </Td>
                    <Td>
                      <span className="grid leading-tight">
                        <span className="font-semibold text-ink">{order.customer?.name}</span>
                        <span className="text-[12.5px] text-ash tabular-nums">{order.customer?.phone}</span>
                      </span>
                    </Td>
                    <Td className="max-w-64">
                      <span className="line-clamp-2 text-[13px]">{order.description}</span>
                    </Td>
                    <Td>{order.karigar?.name ?? <span className="text-ash">In shop</span>}</Td>
                    <Td className={late ? "font-semibold whitespace-nowrap text-risk" : "whitespace-nowrap"}>
                      {order.dueOn ? formatDate(order.dueOn) : "—"}
                      {late && <span className="block text-[11px] font-bold tracking-wide uppercase">Late</span>}
                    </Td>
                    <Td align="right" className="font-semibold text-ink">
                      {order.balanceDue === null ? <span className="font-normal text-ash">Charge not set</span> : formatINR(order.balanceDue)}
                    </Td>
                    <Td>
                      <OrderBadge status={order.status} />
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
