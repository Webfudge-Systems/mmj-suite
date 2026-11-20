"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlarmClock, Lock, Plus, Wallet, WalletCards } from "lucide-react";
import { useResource } from "@webfudge/auth/components";
import {
  Badge,
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
  ToolbarLinkClass,
  ToolbarSearch,
  Tr,
  buttonClass,
} from "@webfudge/ui";
import type { Advance } from "@webfudge/utils/api";
import { downloadCsv } from "@webfudge/utils/csv";
import { formatDate, formatINR, formatWeight } from "@webfudge/utils/formatters";
import { ADVANCE_STATUS } from "@/components/advance-receipt";

type View = "open" | "expiring" | "used" | "refunded" | "all";

export default function AdvancesPage() {
  const router = useRouter();
  const list = useResource<{ data: Advance[] }>("/sales/advances");
  const all = useMemo(() => list.data?.data ?? [], [list.data]);
  const [view, setView] = useState<View>("open");
  const [q, setQ] = useState("");
  const [now] = useState(() => Date.now());

  const today = new Date(now).toISOString().slice(0, 10);
  const inAWeek = new Date(now + 7 * 86400000).toISOString().slice(0, 10);
  const open = all.filter((row) => row.status === "open");
  const expiring = open.filter((row) => row.validUntil && row.validUntil <= inAWeek);
  const held = open.reduce((sum, row) => sum + row.balance, 0);
  const locked = open.filter((row) => row.lockedPurity);
  const lockedGrams = locked.reduce((sum, row) => sum + Math.max(0, (row.lockedWeight ?? 0) - row.lockedWeightUsed), 0);

  const needle = q.trim().toLowerCase();
  const rows = all.filter((row) => {
    if (view === "open" && row.status !== "open") return false;
    if (view === "expiring" && !expiring.includes(row)) return false;
    if (view === "used" && row.status !== "used") return false;
    if (view === "refunded" && row.status !== "refunded") return false;
    if (!needle) return true;
    return [row.number, row.customer?.name, row.customer?.phone, row.note].some((value) => value?.toLowerCase().includes(needle));
  });

  function exportCsv() {
    downloadCsv(`advances-${today}`, [
      ["Number", "Date", "Customer", "Mobile", "Paid (₹)", "Left (₹)", "Rate booked", "Booked rate (₹/g)", "Grams left", "Valid until", "Status", "Note"],
      ...rows.map((row) => [
        row.number,
        row.createdAt.slice(0, 10),
        row.customer?.name,
        row.customer?.phone,
        row.amount,
        row.balance,
        row.lockedPurity,
        row.lockedRate,
        row.lockedPurity ? Math.max(0, (row.lockedWeight ?? 0) - row.lockedWeightUsed) : "",
        row.validUntil,
        ADVANCE_STATUS[row.status].label,
        row.note,
      ]),
    ]);
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Advances & bookings"
        description="Money paid ahead of a purchase. Booking a rate protects the customer if gold rises before they buy."
        actions={
          <Link href="/advances/new" className={buttonClass("primary")}>
            <Plus className="size-4" aria-hidden />
            Take an advance
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard compact title="Open advances" value={open.length} icon={WalletCards} subtitle="Waiting to be used on a bill" />
        <KpiCard compact title="Money held" value={formatINR(held)} icon={Wallet} tone="gold" subtitle="Customers can spend this with you" />
        <KpiCard compact title="Rate booked" value={formatWeight(lockedGrams)} icon={Lock} tone="navy" subtitle={`${locked.length} ${locked.length === 1 ? "booking" : "bookings"} at an older rate`} />
        <KpiCard compact title="Ending this week" value={expiring.length} icon={AlarmClock} tone={expiring.length ? "warn" : "ok"} subtitle={expiring.length ? "Call them before the date" : "None ending soon"} />
      </div>

      <Tabs<View>
        label="Advance status"
        active={view}
        onChange={setView}
        tabs={[
          { key: "open", label: "Open", count: open.length },
          { key: "expiring", label: "Ending soon", count: expiring.length },
          { key: "used", label: "Used", count: all.filter((row) => row.status === "used").length },
          { key: "refunded", label: "Refunded", count: all.filter((row) => row.status === "refunded").length },
          { key: "all", label: "All", count: all.length },
        ]}
        actions={
          <ToolbarActions>
            <ToolbarSearch value={q} onChange={setQ} placeholder="Number, customer or note…" />
            <ToolbarExport onExport={exportCsv} />
            <Link href="/advances/new" className={ToolbarLinkClass(true)} title="Take an advance" aria-label="Take an advance">
              <Plus className="size-[18px]" aria-hidden />
            </Link>
          </ToolbarActions>
        }
      />
      {list.data && <ResultsCount shown={rows.length} total={all.length} noun="advance" />}

      <Card className="overflow-hidden">
        {list.loading && !list.data ? (
          <div className="grid place-items-center py-12 text-navy">
            <Spinner />
          </div>
        ) : list.error ? (
          <p className="p-5 text-sm text-risk">{list.error}</p>
        ) : !rows.length ? (
          <EmptyState icon={Wallet} title="No advances here" description={needle ? "Nothing matches the search." : "Advances you take appear here."} />
        ) : (
          <Table minWidth={860}>
            <thead>
              <tr>
                <Th>Advance</Th>
                <Th>Customer</Th>
                <Th align="right">Paid</Th>
                <Th align="right">Left</Th>
                <Th>Rate booked</Th>
                <Th>Valid until</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const ending = row.status === "open" && row.validUntil && row.validUntil <= inAWeek;
                return (
                  <Tr key={row.id} className="cursor-pointer" onClick={() => router.push(`/advances/${row.id}`)}>
                    <Td>
                      <Link href={`/advances/${row.id}`} className="grid leading-tight" onClick={(event) => event.stopPropagation()}>
                        <span className="font-mono font-semibold text-ink hover:underline">{row.number}</span>
                        <span className="text-[12px] text-ash">{formatDate(row.createdAt)}</span>
                      </Link>
                    </Td>
                    <Td>
                      <span className="grid leading-tight">
                        <span className="font-semibold text-ink">{row.customer?.name}</span>
                        <span className="text-[12px] text-ash tabular-nums">{row.customer?.phone}</span>
                      </span>
                    </Td>
                    <Td align="right">{formatINR(row.amount)}</Td>
                    <Td align="right" className="font-semibold text-ink">
                      {formatINR(row.balance)}
                    </Td>
                    <Td>
                      {row.lockedPurity && row.lockedRate ? (
                        <span className="grid leading-tight">
                          <span className="font-medium">
                            {row.lockedPurity} at {formatINR(row.lockedRate)}/g
                          </span>
                          <span className="text-[12px] text-ash">{formatWeight(Math.max(0, (row.lockedWeight ?? 0) - row.lockedWeightUsed))} left</span>
                        </span>
                      ) : (
                        <span className="text-ash">—</span>
                      )}
                    </Td>
                    <Td className={ending ? "font-semibold whitespace-nowrap text-warn" : "whitespace-nowrap"}>
                      {row.validUntil ? formatDate(row.validUntil) : "—"}
                      {row.status === "open" && row.validUntil && row.validUntil < today && <span className="block text-[11px] font-bold text-risk uppercase">Ended</span>}
                    </Td>
                    <Td>
                      <Badge tone={ADVANCE_STATUS[row.status].tone} dot>
                        {ADVANCE_STATUS[row.status].label}
                      </Badge>
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
