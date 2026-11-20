"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Hammer, Plus, Scale, Truck, Users } from "lucide-react";
import { useAuth } from "@webfudge/auth/components";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  KpiCard,
  Modal,
  PageHeader,
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
import type { JobWork, SupplierWithStats } from "@webfudge/utils/api";
import { downloadCsv } from "@webfudge/utils/csv";
import { formatDate } from "@webfudge/utils/formatters";
import { SupplierForm } from "@/components/supplier-form";
import { useResource } from "@/lib/api";

type View = "all" | "supplier" | "karigar" | "inactive";

const g = (value: number) => `${value.toFixed(3)} g`;

export default function SuppliersPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const canEdit = hasRole("owner", "branch_manager", "stock_keeper");
  const suppliers = useResource<{ data: SupplierWithStats[] }>("/stock/suppliers?active=all&stats=true");
  const jobs = useResource<{ data: JobWork[] }>("/karigar/jobs?status=open");
  const [view, setView] = useState<View>("all");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);

  const all = useMemo(() => suppliers.data?.data ?? [], [suppliers.data]);
  // Open karigar jobs: how many each karigar has and the fine gold still with them.
  const jobsBy = useMemo(() => {
    const map = new Map<number, { open: number; balance: number }>();
    for (const job of jobs.data?.data ?? []) {
      if (!job.karigar) continue;
      const entry = map.get(job.karigar.id) ?? { open: 0, balance: 0 };
      entry.open += 1;
      if ((job.totals?.metal ?? "gold") === "gold") entry.balance += job.totals?.balanceFine ?? 0;
      map.set(job.karigar.id, entry);
    }
    return map;
  }, [jobs.data]);

  const active = all.filter((row) => row.isActive);
  const counts = { all: active.length, supplier: active.filter((row) => row.kind === "supplier").length, karigar: active.filter((row) => row.kind === "karigar").length, inactive: all.length - active.length };
  const goldWithKarigars = [...jobsBy.values()].reduce((sum, entry) => sum + Math.max(0, entry.balance), 0);
  const piecesInStock = active.reduce((sum, row) => sum + row.stats.inStock, 0);

  const needle = q.trim().toLowerCase();
  const rows = all.filter((row) => {
    if (view === "inactive" ? row.isActive : !row.isActive) return false;
    if (view === "supplier" || view === "karigar") {
      if (row.kind !== view) return false;
    }
    if (!needle) return true;
    return [row.name, row.city, row.phone, row.gstin, row.contactPerson].some((value) => value?.toLowerCase().includes(needle));
  });

  function exportCsv() {
    downloadCsv(`suppliers-${new Date().toISOString().slice(0, 10)}`, [
      ["Name", "Type", "Phone", "City", "GSTIN", "Contact person", "Email", "Receipts", "Pieces received", "Pieces in stock", "Last received", "Active"],
      ...rows.map((row) => [
        row.name,
        row.kind === "karigar" ? "Karigar" : "Supplier",
        row.phone,
        row.city,
        row.gstin,
        row.contactPerson,
        row.email,
        row.stats.receipts,
        row.stats.pieces,
        row.stats.inStock,
        row.stats.lastReceivedAt?.slice(0, 10),
        row.isActive ? "Yes" : "No",
      ]),
    ]);
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Suppliers & karigars"
        description="Who goods are received from. Open one to see their details, bills, deliveries and karigar jobs."
        actions={
          canEdit && (
            <Button onClick={() => setAdding(true)}>
              <Plus className="size-4" aria-hidden />
              Add supplier or karigar
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard compact title="Suppliers" value={counts.supplier} icon={Truck} subtitle="Bought from, active" />
        <KpiCard compact title="Karigars" value={counts.karigar} icon={Hammer} tone="gold" subtitle={`${[...jobsBy.values()].reduce((sum, entry) => sum + entry.open, 0)} open jobs`} />
        <KpiCard compact title="Gold with karigars" value={g(goldWithKarigars)} icon={Scale} tone={goldWithKarigars > 0 ? "warn" : "ok"} subtitle="Fine gold on open jobs" />
        <KpiCard compact title="Their pieces in stock" value={piecesInStock} icon={Users} tone="navy" subtitle="Still unsold, from all of them" />
      </div>

      <Tabs<View>
        label="Who"
        active={view}
        onChange={setView}
        tabs={[
          { key: "all", label: "All", count: counts.all },
          { key: "supplier", label: "Suppliers", count: counts.supplier },
          { key: "karigar", label: "Karigars", count: counts.karigar },
          ...(counts.inactive ? [{ key: "inactive" as const, label: "Inactive", count: counts.inactive }] : []),
        ]}
        actions={
          <ToolbarActions>
            <ToolbarSearch value={q} onChange={setQ} placeholder="Name, city, phone or GSTIN…" />
            <ToolbarExport onExport={exportCsv} />
            {canEdit && <ToolbarButton icon={Plus} label="Add supplier or karigar" active onClick={() => setAdding(true)} />}
          </ToolbarActions>
        }
      />
      {suppliers.data && <ResultsCount shown={rows.length} noun="entry" />}

      <Card className="overflow-hidden">
        {suppliers.loading && !suppliers.data ? (
          <div className="grid place-items-center p-10 text-navy">
            <Spinner />
          </div>
        ) : !rows.length ? (
          <EmptyState
            icon={Truck}
            title={needle ? "Nobody matches" : "No suppliers yet"}
            description={needle ? "Try another name or city." : "Add the suppliers and karigars you receive goods from."}
            action={
              canEdit && !needle ? (
                <Button onClick={() => setAdding(true)}>
                  <Plus className="size-4" aria-hidden />
                  Add the first one
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table minWidth={860}>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Phone · City</Th>
                <Th align="right">Pieces received</Th>
                <Th align="right">In stock</Th>
                <Th>Karigar jobs</Th>
                <Th>Last delivery</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const work = jobsBy.get(row.id);
                return (
                  <Tr key={row.id} className="cursor-pointer" onClick={() => router.push(`/suppliers/${row.id}`)}>
                    <Td>
                      <Link href={`/suppliers/${row.id}`} className="flex items-center gap-3" onClick={(event) => event.stopPropagation()}>
                        <span className={`grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold ${row.kind === "karigar" ? "bg-gold-soft text-gold-deep" : "bg-navy-soft text-navy"}`}>
                          {row.name
                            .split(/\s+/)
                            .filter((part) => /\w/.test(part))
                            .slice(0, 2)
                            .map((part) => part[0]?.toUpperCase())
                            .join("")}
                        </span>
                        <span className="grid leading-tight">
                          <span className="font-semibold text-ink hover:underline">{row.name}</span>
                          {row.gstin && <span className="font-mono text-[11px] text-ash">{row.gstin}</span>}
                        </span>
                      </Link>
                    </Td>
                    <Td>
                      <Badge tone={row.kind === "karigar" ? "gold" : "neutral"}>{row.kind === "karigar" ? "Karigar" : "Supplier"}</Badge>
                    </Td>
                    <Td>
                      <span className="grid leading-tight">
                        <span>{row.phone ?? "—"}</span>
                        <span className="text-[12px] text-ash">{row.city ?? ""}</span>
                      </span>
                    </Td>
                    <Td align="right">{row.stats.pieces}</Td>
                    <Td align="right" className="font-semibold text-ink">
                      {row.stats.inStock}
                    </Td>
                    <Td>
                      {row.kind === "karigar" ? (
                        work ? (
                          <span className="grid leading-tight">
                            <span className="font-semibold">{work.open} open</span>
                            <span className={`text-[12px] ${work.balance < 0 ? "text-risk" : "text-ash"}`}>{g(work.balance)} fine with them</span>
                          </span>
                        ) : (
                          <span className="text-ash">None open</span>
                        )
                      ) : (
                        <span className="text-ash">—</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap">{row.stats.lastReceivedAt ? formatDate(row.stats.lastReceivedAt) : <span className="text-ash">Never</span>}</Td>
                    <Td align="right">
                      <ChevronRight className="inline size-4 text-gray-400" aria-hidden />
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add a supplier or karigar" description="You can add bills, deliveries and jobs from their page afterwards." size="lg">
        <SupplierForm
          full
          onSaved={(saved) => {
            setAdding(false);
            router.push(`/suppliers/${saved.id}`);
          }}
          onCancel={() => setAdding(false)}
        />
      </Modal>
    </div>
  );
}
