"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarDays, PackageSearch, Send, Truck } from "lucide-react";
import {
  Badge,
  Card,
  EmptyState,
  KpiCard,
  PageHeader,
  Pager,
  ResultsCount,
  Spinner,
  StatusPill,
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
  cn,
} from "@webfudge/ui";
import type { Page, Transfer, TransferSummary } from "@webfudge/utils/api";
import { downloadCsv } from "@webfudge/utils/csv";
import { formatDateTime } from "@webfudge/utils/formatters";
import { errorMessage, useApi, useResource } from "@/lib/api";
import { useBranch } from "@/lib/branch";
import { TRANSFER_STATUS } from "@/lib/labels";

type View = "open" | "in" | "out" | "received" | "all";

export default function TransfersPage() {
  const router = useRouter();
  const api = useApi();
  const { branch } = useBranch();
  const [page, setPage] = useState(1);
  const [view, setView] = useState<View>("open");
  const [q, setQ] = useState("");
  const [exportError, setExportError] = useState<string | null>(null);

  const params = new URLSearchParams({ page: String(page), summary: "true" });
  if (branch) params.set("branchId", String(branch.id));
  if (view === "open") params.set("status", "open");
  if (view === "received") params.set("status", "received");
  if (view === "in" || view === "out") {
    params.set("direction", view);
    params.set("status", "open");
  }
  if (q.trim()) params.set("q", q.trim());
  const transfers = useResource<Page<Transfer> & { meta: { summary?: TransferSummary } }>(branch ? `/stock/transfers?${params}` : null);
  const summary = transfers.data?.meta.summary;
  const rows = transfers.data?.data ?? [];

  const go = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(1);
  };

  async function exportCsv() {
    setExportError(null);
    try {
      const all = new URLSearchParams(params);
      all.delete("summary");
      all.set("page", "1");
      all.set("pageSize", "500");
      const { data } = await api.get<Page<Transfer>>(`/stock/transfers?${all}`);
      downloadCsv(`transfers-${new Date().toISOString().slice(0, 10)}`, [
        ["Transfer", "Sent", "From", "To", "Pieces", "Received", "Status", "Sent by", "Received by", "Completed", "Note"],
        ...data.map((transfer) => [
          transfer.number,
          transfer.dispatchedAt.slice(0, 10),
          transfer.fromBranch?.name,
          transfer.toBranch?.name,
          transfer.pieces,
          transfer.received,
          TRANSFER_STATUS[transfer.status].label,
          transfer.dispatchedBy,
          transfer.receivedBy,
          transfer.completedAt?.slice(0, 10),
          transfer.note,
        ]),
      ]);
    } catch (cause) {
      setExportError(errorMessage(cause));
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Transfers"
        description="Pieces sent between branches. A piece is in transit from the moment it is sent until the other branch scans it in."
        actions={
          <Link href="/transfers/new" className={buttonClass("primary")}>
            <Send className="size-4" aria-hidden />
            Send pieces
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          compact
          title="Arriving here"
          value={summary?.arrivingHere ?? "–"}
          icon={ArrowDownLeft}
          tone={summary?.arrivingHere ? "warn" : "ok"}
          subtitle={summary?.arrivingHere ? `Scan them in at ${branch?.name ?? "this branch"}` : "Nothing on its way here"}
        />
        <KpiCard compact title="Sent, not yet in" value={summary?.leftHere ?? "–"} icon={ArrowUpRight} tone="navy" subtitle={`From ${branch?.name ?? "this branch"}`} />
        <KpiCard compact title="Pieces on the way" value={summary?.piecesOnTheWay ?? "–"} icon={Truck} tone="gold" subtitle={summary ? `On ${summary.open} open ${summary.open === 1 ? "transfer" : "transfers"}` : " "} />
        <KpiCard compact title="Sent this month" value={summary?.sentThisMonth ?? "–"} icon={CalendarDays} subtitle={summary ? `${summary.piecesSentThisMonth} pieces` : " "} />
      </div>

      <Tabs<View>
        label="Transfers"
        active={view}
        onChange={go(setView)}
        tabs={[
          { key: "open", label: "On the way", count: summary?.open },
          { key: "in", label: "Arriving here", count: summary?.arrivingHere },
          { key: "out", label: "Sent from here", count: summary?.leftHere },
          { key: "received", label: "Received" },
          { key: "all", label: "All" },
        ]}
        actions={
          <ToolbarActions>
            <ToolbarSearch value={q} onChange={go(setQ)} placeholder="Transfer number or note…" />
            <ToolbarExport onExport={exportCsv} />
            <Link href="/transfers/new" className={ToolbarLinkClass(true)} title="Send pieces" aria-label="Send pieces">
              <Send className="size-[18px]" aria-hidden />
            </Link>
          </ToolbarActions>
        }
      />
      {exportError && <p className="text-[13px] text-risk">{exportError}</p>}
      {transfers.data && <ResultsCount shown={rows.length} total={transfers.data.meta.pagination.total} noun="transfer" />}

      <Card className="overflow-hidden">
        {transfers.loading && !transfers.data ? (
          <div className="grid place-items-center p-10 text-navy">
            <Spinner />
          </div>
        ) : transfers.error ? (
          <p className="p-5 text-[13px] text-risk">{transfers.error}</p>
        ) : !rows.length ? (
          <EmptyState
            icon={PackageSearch}
            title={q ? "No transfer matches" : view === "in" ? "Nothing arriving here" : view === "open" || view === "out" ? "Nothing on the way" : "No transfers yet"}
            description={q ? "Try another number." : "Pieces sent between branches show here until the other branch scans them in."}
          />
        ) : (
          <>
            <Table minWidth={900}>
              <thead>
                <tr>
                  <Th>Transfer</Th>
                  <Th>Route</Th>
                  <Th>Pieces</Th>
                  <Th>Status</Th>
                  <Th>Sent</Th>
                  <Th>Completed</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((transfer) => {
                  const incoming = transfer.toBranch?.id === branch?.id;
                  const open = transfer.status !== "received";
                  const status = TRANSFER_STATUS[transfer.status];
                  return (
                    <Tr key={transfer.id} className="cursor-pointer" onClick={() => router.push(`/transfers/${transfer.id}`)}>
                      <Td>
                        <Link href={`/transfers/${transfer.id}`} className="grid leading-tight" onClick={(event) => event.stopPropagation()}>
                          <span className="font-mono font-semibold text-ink hover:underline">{transfer.number}</span>
                          {transfer.note && <span className="line-clamp-1 max-w-[220px] text-[12px] text-ash">{transfer.note}</span>}
                        </Link>
                      </Td>
                      <Td>
                        <span className="flex items-center gap-2">
                          <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", incoming ? "bg-gold-soft text-gold-deep" : "bg-navy-soft text-navy")} aria-hidden>
                            {incoming ? <ArrowDownLeft className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
                          </span>
                          <span className="font-semibold text-ink">{transfer.fromBranch?.name}</span>
                          <ArrowRight className="size-3.5 text-ash" aria-hidden />
                          <span className="font-semibold text-ink">{transfer.toBranch?.name}</span>
                        </span>
                      </Td>
                      <Td>
                        <span className="grid gap-1.5">
                          <span className="text-[13px] tabular-nums">
                            <span className="font-semibold text-ink">{transfer.received}</span> of {transfer.pieces} in
                          </span>
                          <span className="flex h-1.5 w-28 overflow-hidden rounded-full bg-gray-100" aria-hidden>
                            <span className="bg-ok" style={{ width: `${(transfer.received / Math.max(transfer.pieces, 1)) * 100}%` }} />
                          </span>
                        </span>
                      </Td>
                      <Td>
                        <span className="flex flex-wrap gap-1">
                          <StatusPill tone={status.tone}>{status.label}</StatusPill>
                          {incoming && open && <Badge tone="gold">Arriving here</Badge>}
                        </span>
                      </Td>
                      <Td className="whitespace-nowrap">
                        <span className="grid leading-tight">
                          <span>{formatDateTime(transfer.dispatchedAt)}</span>
                          {transfer.dispatchedBy && <span className="text-[12px] text-ash">by {transfer.dispatchedBy}</span>}
                        </span>
                      </Td>
                      <Td className="whitespace-nowrap">
                        {transfer.completedAt ? (
                          <span className="grid leading-tight">
                            <span>{formatDateTime(transfer.completedAt)}</span>
                            {transfer.receivedBy && <span className="text-[12px] text-ash">by {transfer.receivedBy}</span>}
                          </span>
                        ) : (
                          <span className="text-ash">—</span>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
            <Pager pagination={transfers.data?.meta.pagination} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
