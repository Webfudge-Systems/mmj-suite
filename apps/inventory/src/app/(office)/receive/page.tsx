"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileUp, FileWarning, Inbox, PackagePlus, Paperclip, Scale, Truck } from "lucide-react";
import {
  Badge,
  Card,
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
import type { Page, Receipt, ReceiptSummary } from "@webfudge/utils/api";
import { downloadCsv } from "@webfudge/utils/csv";
import { formatDate, formatDateTime } from "@webfudge/utils/formatters";
import { errorMessage, useApi, useResource } from "@/lib/api";
import { useBranch } from "@/lib/branch";
import { SOURCE_LABELS } from "@/lib/labels";

type View = "all" | "purchase" | "karigar" | "opening_stock";

export default function ReceiptsPage() {
  const router = useRouter();
  const api = useApi();
  const { branch } = useBranch();
  const [page, setPage] = useState(1);
  const [view, setView] = useState<View>("all");
  const [q, setQ] = useState("");
  const [exportError, setExportError] = useState<string | null>(null);

  const params = new URLSearchParams({ page: String(page), summary: "true" });
  if (branch) params.set("branchId", String(branch.id));
  if (view !== "all") params.set("source", view);
  if (q.trim()) params.set("q", q.trim());
  const receipts = useResource<Page<Receipt> & { meta: { summary?: ReceiptSummary } }>(branch ? `/stock/receipts?${params}` : null);
  const summary = receipts.data?.meta.summary;
  const rows = receipts.data?.data ?? [];

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
      const { data } = await api.get<Page<Receipt>>(`/stock/receipts?${all}`);
      downloadCsv(`receipts-${new Date().toISOString().slice(0, 10)}`, [
        ["Receipt", "Received", "Type", "From", "Bill no.", "Bill date", "Pieces", "Net (g)", "Bill file", "Received by"],
        ...data.map((receipt) => [
          receipt.number,
          receipt.createdAt.slice(0, 10),
          SOURCE_LABELS[receipt.source],
          receipt.supplier?.name,
          receipt.billNumber,
          receipt.billDate,
          receipt.pieces,
          receipt.netWeight,
          receipt.attachments?.length ? "Yes" : "No",
          receipt.receivedBy,
        ]),
      ]);
    } catch (cause) {
      setExportError(errorMessage(cause));
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Receive stock"
        description="Every delivery is recorded as a receipt. Each piece on it gets its own tag."
        actions={
          <>
            <Link href="/receive/import" className={buttonClass("secondary")}>
              <FileUp className="size-4" aria-hidden />
              Import current stock
            </Link>
            <Link href="/receive/new" className={buttonClass("primary")}>
              <PackagePlus className="size-4" aria-hidden />
              Receive pieces
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard compact title="Deliveries this month" value={summary?.receiptsThisMonth ?? "–"} icon={Truck} subtitle={`At ${branch?.name ?? "this branch"}`} />
        <KpiCard compact title="Pieces in this month" value={summary?.piecesThisMonth ?? "–"} icon={Scale} tone="gold" subtitle={summary ? `${summary.netThisMonth.toFixed(3)} g net` : " "} />
        <KpiCard compact title="Waiting for a tray" value={summary?.untrayed ?? "–"} icon={Inbox} tone={summary?.untrayed ? "warn" : "ok"} subtitle={summary?.untrayed ? "Scan them into a tray" : "Everything is in a tray"} />
        <KpiCard compact title="Bills missing" value={summary?.billsMissing ?? "–"} icon={FileWarning} tone={summary?.billsMissing ? "risk" : "ok"} subtitle={summary?.billsMissing ? "Supplier receipts without a bill" : "Every bill is attached"} />
      </div>

      <Tabs<View>
        label="Receipt type"
        active={view}
        onChange={go(setView)}
        tabs={[
          { key: "all", label: "All" },
          { key: "purchase", label: "Supplier bills" },
          { key: "karigar", label: "Karigar deliveries" },
          { key: "opening_stock", label: "Imported stock" },
        ]}
        actions={
          <ToolbarActions>
            <ToolbarSearch value={q} onChange={go(setQ)} placeholder="Receipt, bill no. or supplier…" />
            <ToolbarExport onExport={exportCsv} />
            <Link href="/receive/new" className={ToolbarLinkClass(true)} title="Receive pieces" aria-label="Receive pieces">
              <PackagePlus className="size-[18px]" aria-hidden />
            </Link>
          </ToolbarActions>
        }
      />
      {exportError && <p className="text-[13px] text-risk">{exportError}</p>}
      {receipts.data && <ResultsCount shown={rows.length} total={receipts.data.meta.pagination.total} noun="receipt" />}

      <Card className="overflow-hidden">
        {receipts.loading && !receipts.data ? (
          <div className="grid place-items-center p-10 text-navy">
            <Spinner />
          </div>
        ) : receipts.error ? (
          <p className="p-5 text-[13px] text-risk">{receipts.error}</p>
        ) : !rows.length ? (
          <EmptyState icon={PackagePlus} title={q ? "No receipt matches" : "Nothing received yet"} description={q ? "Try another number or name." : "Start by importing your current stock, then receive new deliveries here."} />
        ) : (
          <>
            <Table minWidth={900}>
              <thead>
                <tr>
                  <Th>Receipt</Th>
                  <Th>From</Th>
                  <Th>Bill</Th>
                  <Th align="right">Pieces</Th>
                  <Th align="right">Net</Th>
                  <Th>Bill file</Th>
                  <Th>Received</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((receipt) => (
                  <Tr key={receipt.id} className="cursor-pointer" onClick={() => router.push(`/receive/${receipt.id}`)}>
                    <Td>
                      <Link href={`/receive/${receipt.id}`} className="grid leading-tight" onClick={(event) => event.stopPropagation()}>
                        <span className="font-mono font-semibold text-ink hover:underline">{receipt.number}</span>
                        <Badge tone={receipt.source === "opening_stock" ? "gold" : receipt.source === "karigar" ? "navy" : "neutral"} className="mt-1 justify-self-start">
                          {SOURCE_LABELS[receipt.source]}
                        </Badge>
                      </Link>
                    </Td>
                    <Td>
                      {receipt.supplier ? (
                        <Link href={`/suppliers/${receipt.supplier.id}`} className="font-semibold text-ink hover:underline" onClick={(event) => event.stopPropagation()}>
                          {receipt.supplier.name}
                        </Link>
                      ) : (
                        <span className="text-ash">—</span>
                      )}
                    </Td>
                    <Td>
                      <span className="grid leading-tight">
                        <span>{receipt.billNumber ?? "—"}</span>
                        {receipt.billDate && <span className="text-[12px] text-ash">{formatDate(receipt.billDate)}</span>}
                      </span>
                    </Td>
                    <Td align="right" className="font-semibold text-ink">
                      {receipt.pieces ?? 0}
                    </Td>
                    <Td align="right">{(receipt.netWeight ?? 0).toFixed(3)} g</Td>
                    <Td>
                      {receipt.attachments?.length ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-0.5 text-[12px] font-semibold text-navy">
                          <Paperclip className="size-3" aria-hidden />
                          {receipt.attachments.length}
                        </span>
                      ) : receipt.source === "purchase" ? (
                        <Badge tone="warn">Missing</Badge>
                      ) : (
                        <span className="text-ash">—</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap">
                      <span className="grid leading-tight">
                        <span>{formatDateTime(receipt.createdAt)}</span>
                        {receipt.receivedBy && <span className="text-[12px] text-ash">by {receipt.receivedBy}</span>}
                      </span>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pager pagination={receipts.data?.meta.pagination} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
