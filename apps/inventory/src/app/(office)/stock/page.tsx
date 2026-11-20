"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes, Inbox, PackagePlus, Printer, Scale, UserRound } from "lucide-react";
import { PURITIES } from "@webfudge/config";
import {
  Card,
  EmptyState,
  KpiCard,
  PageHeader,
  Pager,
  ResultsCount,
  Spinner,
  StatusBadge,
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
import type { Page, StockItem, StockSummary } from "@webfudge/utils/api";
import { ITEM_STATUS_LABELS } from "@webfudge/utils/api";
import { downloadCsv } from "@webfudge/utils/csv";
import { formatWeight } from "@webfudge/utils/formatters";
import { PieceThumb } from "@/components/photos";
import { useLocations } from "@/components/pickers";
import { errorMessage, useApi, useResource } from "@/lib/api";
import { useBranch } from "@/lib/branch";

type Search = { untrayed?: string; designId?: string; locationId?: string; status?: string };
type View = "" | "in_stock" | "with_staff" | "on_approval" | "reserved" | "sold" | "all";

const GOLD = new Set(["24KT", "22KT", "18KT", "14KT"]);

export default function StockPage({ searchParams }: { searchParams: Promise<Search> }) {
  const initial = use(searchParams);
  const router = useRouter();
  const api = useApi();
  const { branch } = useBranch();
  const { locations } = useLocations(branch?.id);
  const [q, setQ] = useState("");
  const [view, setView] = useState<View>((initial.status as View) ?? "");
  const [filters, setFilters] = useState<Record<string, string>>({ purity: "", locationId: initial.locationId ?? "", tray: initial.untrayed === "true" ? "untrayed" : "" });
  const [page, setPage] = useState(1);
  const [exportError, setExportError] = useState<string | null>(null);

  const params = new URLSearchParams({ page: String(page), pageSize: "50" });
  if (branch) params.set("branchId", String(branch.id));
  if (q.trim()) params.set("q", q.trim());
  if (view) params.set("status", view);
  if (filters.purity) params.set("purity", filters.purity);
  if (filters.locationId) params.set("locationId", filters.locationId);
  if (filters.tray === "untrayed") params.set("untrayed", "true");
  if (initial.designId) params.set("designId", initial.designId);

  const items = useResource<Page<StockItem>>(branch ? `/stock/items?${params}` : null);
  const summary = useResource<{ data: StockSummary }>(branch ? `/stock/summary?branchId=${branch.id}` : null);
  const stats = summary.data?.data;
  const goldNet = stats?.byPurity.filter((row) => GOLD.has(row.purity)).reduce((sum, row) => sum + row.netWeight, 0) ?? 0;
  const silverNet = stats?.byPurity.filter((row) => !GOLD.has(row.purity) && row.purity !== "950PT").reduce((sum, row) => sum + row.netWeight, 0) ?? 0;
  const rows = items.data?.data ?? [];
  const total = items.data?.meta.pagination.total;

  const go = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(1);
  };

  /** Everything matching the current view and filters, up to 2,000 pieces, as a spreadsheet. */
  async function exportCsv() {
    setExportError(null);
    try {
      const all = new URLSearchParams(params);
      all.set("page", "1");
      all.set("pageSize", "2000");
      const { data } = await api.get<Page<StockItem>>(`/stock/items?${all}`);
      downloadCsv(`stock-${branch?.code ?? "branch"}-${new Date().toISOString().slice(0, 10)}`, [
        ["Tag", "Old tag", "Design code", "Design", "Purity", "Gross (g)", "Stone (g)", "Net (g)", "HUID", "RFID", "Tray", "Status"],
        ...data.map((item) => [
          item.tagNumber,
          item.legacyTag,
          item.design?.code,
          item.design?.name,
          item.purity,
          item.grossWeight,
          item.stoneWeight,
          item.netWeight,
          item.huid,
          item.rfid,
          item.location?.fullCode,
          ITEM_STATUS_LABELS[item.status],
        ]),
      ]);
    } catch (cause) {
      setExportError(errorMessage(cause));
    }
  }

  const trays = locations.filter((location) => location.kind !== "showcase" && location.kind !== "counter");

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Stock"
        description={`Every tagged piece at ${branch?.name ?? "this branch"}. Sold pieces are hidden unless you choose them.`}
        actions={
          <>
            <Link href="/tags" className={buttonClass("secondary")}>
              <Printer className="size-4" aria-hidden />
              Print tags
            </Link>
            <Link href="/receive/new" className={buttonClass("primary")}>
              <PackagePlus className="size-4" aria-hidden />
              Receive stock
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard compact title="Pieces in stock" value={stats?.inStock ?? "–"} icon={Boxes} subtitle={stats ? `${stats.receivedToday} received today` : " "} />
        <KpiCard compact title="Gold in stock" value={stats ? `${goldNet.toFixed(3)} g` : "–"} icon={Scale} tone="gold" subtitle={silverNet ? `Silver ${silverNet.toFixed(3)} g` : "Net weight, all gold purities"} />
        <KpiCard compact title="Waiting for a tray" value={stats?.untrayed ?? "–"} icon={Inbox} tone={stats?.untrayed ? "warn" : "ok"} subtitle={stats?.untrayed ? "Scan them into a tray" : "Every piece has a tray"} />
        <KpiCard
          compact
          title="Out of the tray"
          value={stats ? stats.withStaff + (stats.onApproval ?? 0) + (stats.reserved ?? 0) : "–"}
          icon={UserRound}
          tone="navy"
          subtitle={stats ? `${stats.withStaff} with staff · ${stats.onApproval ?? 0} on approval` : " "}
        />
      </div>

      <Tabs<View>
        label="Stock status"
        active={view}
        onChange={go(setView)}
        tabs={[
          { key: "", label: "Not sold" },
          { key: "in_stock", label: "In stock", count: stats?.inStock },
          { key: "with_staff", label: "With staff", count: stats?.withStaff },
          { key: "on_approval", label: "On approval", count: stats?.onApproval },
          { key: "reserved", label: "On estimate", count: stats?.reserved },
          { key: "sold", label: "Sold", count: stats?.sold },
          { key: "all", label: "All" },
        ]}
        actions={
          <ToolbarActions>
            <ToolbarSearch value={q} onChange={go(setQ)} placeholder="Tag, HUID, RFID or design…" />
            <ToolbarFilter
              groups={[
                { key: "purity", label: "Purity", options: PURITIES.map((entry) => ({ value: entry.code, label: entry.code })) },
                { key: "tray", label: "Tray", options: [{ value: "untrayed", label: "Needs a tray" }] },
                ...(trays.length ? [{ key: "locationId", label: "Tray or box", options: trays.map((location) => ({ value: String(location.id), label: location.fullCode })) }] : []),
              ]}
              value={filters}
              onChange={go(setFilters)}
            />
            <ToolbarExport onExport={exportCsv} />
            <Link href="/receive/new" className={ToolbarLinkClass(true)} title="Receive stock" aria-label="Receive stock">
              <PackagePlus className="size-[18px]" aria-hidden />
            </Link>
          </ToolbarActions>
        }
      />
      {exportError && <p className="text-[13px] text-risk">{exportError}</p>}
      {items.data && <ResultsCount shown={rows.length} total={total} noun="piece" />}

      <Card className="overflow-hidden">
        {items.loading && !items.data ? (
          <div className="grid place-items-center p-10 text-navy">
            <Spinner />
          </div>
        ) : items.error ? (
          <p className="p-5 text-[13px] text-risk">{items.error}</p>
        ) : !rows.length ? (
          <EmptyState icon={Boxes} title="No pieces match" description={filters.tray ? "Every piece in stock has a tray." : "Change the filters, or receive or import stock."} />
        ) : (
          <>
            <Table minWidth={900}>
              <thead>
                <tr>
                  <Th className="w-16">
                    <span className="sr-only">Photo</span>
                  </Th>
                  <Th>Tag</Th>
                  <Th>Design</Th>
                  <Th>Purity</Th>
                  <Th align="right">Gross</Th>
                  <Th align="right">Net</Th>
                  <Th>HUID</Th>
                  <Th>Tray</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <Tr key={item.id} className="cursor-pointer" onClick={() => router.push(`/stock/${item.id}`)}>
                    <Td className="py-2 pr-0">
                      <PieceThumb item={item} />
                    </Td>
                    <Td>
                      <Link href={`/stock/${item.id}`} className="grid font-mono hover:underline" onClick={(event) => event.stopPropagation()}>
                        <span className="font-semibold text-ink">{item.tagNumber}</span>
                        {item.legacyTag && <span className="text-[11px] text-ash">old {item.legacyTag}</span>}
                      </Link>
                    </Td>
                    <Td>
                      <span className="grid leading-tight">
                        <span className="font-medium text-ink">{item.design?.name}</span>
                        <span className="font-mono text-[11px] text-ash">{item.design?.code}</span>
                      </span>
                    </Td>
                    <Td>{item.purity}</Td>
                    <Td align="right">{formatWeight(item.grossWeight)}</Td>
                    <Td align="right" className="font-semibold text-ink">
                      {formatWeight(item.netWeight)}
                    </Td>
                    <Td className="font-mono text-[12.5px]">{item.huid ?? "—"}</Td>
                    <Td className="font-mono text-[12px]">
                      {item.location ? `${item.location.fullCode}${item.slot ? ` · ${item.slot}` : ""}` : item.status === "in_stock" ? <span className="font-sans font-semibold text-warn">Needs a tray</span> : "—"}
                    </Td>
                    <Td>
                      <StatusBadge status={item.status} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pager pagination={items.data?.meta.pagination} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
