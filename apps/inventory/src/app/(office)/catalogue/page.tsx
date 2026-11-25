"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Gem, Globe, ImageOff, PackageCheck, Plus } from "lucide-react";
import { useAuth } from "@webfudge/auth/components";
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
  ToolbarFilter,
  ToolbarLinkClass,
  ToolbarSearch,
  Tr,
  buttonClass,
} from "@webfudge/ui";
import type { Category, Design, Page } from "@webfudge/utils/api";
import { downloadCsv } from "@webfudge/utils/csv";
import { errorMessage, useApi, useResource } from "@/lib/api";
import { mediaUrl } from "@/lib/env";

const MAKING_LABEL = { per_gram: "/g", percent: "%", fixed: " fixed" } as const;
type View = "active" | "online" | "retired";
type Summary = { active: number; online: number; retired: number; withStock: number; noPhoto: number };

const making = (design: Design) => (design.making ? `${design.making.type === "percent" ? "" : "₹"}${design.making.value}${MAKING_LABEL[design.making.type]}` : "—");

export default function CataloguePage({ searchParams }: { searchParams: Promise<{ categoryId?: string }> }) {
  const initial = use(searchParams);
  const router = useRouter();
  const api = useApi();
  const { hasRole } = useAuth();
  const canEdit = hasRole("owner", "branch_manager", "stock_keeper");
  const [q, setQ] = useState("");
  const [view, setView] = useState<View>("active");
  const [filters, setFilters] = useState<Record<string, string>>({ categoryId: initial.categoryId ?? "", metal: "" });
  const [page, setPage] = useState(1);
  const [exportError, setExportError] = useState<string | null>(null);

  const params = new URLSearchParams({ page: String(page), pageSize: "40", summary: "true" });
  if (q.trim()) params.set("q", q.trim());
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.metal) params.set("metal", filters.metal);
  if (view === "online") params.set("online", "true");
  if (view === "retired") params.set("active", "retired");

  const designs = useResource<Page<Design> & { meta: { summary?: Summary } }>(`/stock/designs?${params}`);
  const categories = useResource<{ data: Category[] }>("/stock/categories");
  const summary = designs.data?.meta.summary;
  const rows = designs.data?.data ?? [];

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
      all.set("pageSize", "1000");
      const { data } = await api.get<Page<Design>>(`/stock/designs?${all}`);
      downloadCsv(`catalogue-${new Date().toISOString().slice(0, 10)}`, [
        ["Code", "Name", "Category", "Metal", "Purity", "Making", "In stock", "Online", "Active"],
        ...data.map((design) => [design.code, design.name, design.category?.name, design.metal, design.defaultPurity, making(design), design.inStock ?? 0, design.isOnline ? "Yes" : "No", design.isActive ? "Yes" : "No"]),
      ]);
    } catch (cause) {
      setExportError(errorMessage(cause));
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Catalogue"
        description="Each design is a catalogue entry. Every tagged piece belongs to one design."
        actions={
          canEdit && (
            <Link href="/catalogue/new" className={buttonClass("primary")}>
              <Plus className="size-4" aria-hidden />
              New design
            </Link>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard compact title="Designs" value={summary?.active ?? "–"} icon={Gem} subtitle={summary?.retired ? `${summary.retired} retired` : "In the catalogue"} />
        <KpiCard compact title="With pieces in stock" value={summary?.withStock ?? "–"} icon={PackageCheck} tone="ok" subtitle="Ready to show customers" />
        <KpiCard compact title="On the website" value={summary?.online ?? "–"} icon={Globe} tone="gold" subtitle="Marked to show online" />
        <KpiCard compact title="No photo yet" value={summary?.noPhoto ?? "–"} icon={ImageOff} tone={summary?.noPhoto ? "warn" : "ok"} subtitle={summary?.noPhoto ? "Add one for the tablets and site" : "Every design has a photo"} />
      </div>

      <Tabs<View>
        label="Designs"
        active={view}
        onChange={go(setView)}
        tabs={[
          { key: "active", label: "Active", count: summary?.active },
          { key: "online", label: "Online", count: summary?.online },
          { key: "retired", label: "Retired", count: summary?.retired },
        ]}
        actions={
          <ToolbarActions>
            <ToolbarSearch value={q} onChange={go(setQ)} placeholder="Design number or name…" />
            <ToolbarFilter
              groups={[
                { key: "categoryId", label: "Category", options: (categories.data?.data ?? []).map((category) => ({ value: String(category.id), label: category.name })) },
                {
                  key: "metal",
                  label: "Metal",
                  options: [
                    { value: "gold", label: "Gold" },
                    { value: "silver", label: "Silver" },
                    { value: "platinum", label: "Platinum" },
                  ],
                },
              ]}
              value={filters}
              onChange={go(setFilters)}
            />
            <ToolbarExport onExport={exportCsv} />
            {canEdit && (
              <Link href="/catalogue/new" className={ToolbarLinkClass(true)} title="New design" aria-label="New design">
                <Plus className="size-[18px]" aria-hidden />
              </Link>
            )}
          </ToolbarActions>
        }
      />
      {exportError && <p className="text-[13px] text-risk">{exportError}</p>}
      {designs.data && <ResultsCount shown={rows.length} total={designs.data.meta.pagination.total} noun="design" />}

      <Card className="overflow-hidden">
        {designs.loading && !designs.data ? (
          <div className="grid place-items-center p-10 text-navy">
            <Spinner />
          </div>
        ) : designs.error ? (
          <p className="p-5 text-[13px] text-risk">{designs.error}</p>
        ) : !rows.length ? (
          <EmptyState
            icon={view === "retired" ? Archive : Gem}
            title={q || filters.categoryId || filters.metal ? "No designs match" : view === "retired" ? "No retired designs" : "No designs yet"}
            description={q || filters.categoryId || filters.metal ? "Try another search or filter." : "Add your first design, or import your current stock and designs are created for you."}
          />
        ) : (
          <>
            <Table minWidth={780}>
              <thead>
                <tr>
                  <Th className="w-16">
                    <span className="sr-only">Photo</span>
                  </Th>
                  <Th>Design</Th>
                  <Th>Category</Th>
                  <Th>Purity</Th>
                  <Th align="right">Making</Th>
                  <Th align="right">In stock</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {rows.map((design) => (
                  <Tr key={design.id} className="cursor-pointer" onClick={() => router.push(`/catalogue/${design.id}`)}>
                    <Td className="py-2 pr-0">
                      <span className="grid size-11 place-items-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 text-gray-300">
                        {design.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mediaUrl(design.images[0].thumbnailUrl)} alt="" className="size-full object-cover" loading="lazy" />
                        ) : (
                          <Gem className="size-5" aria-hidden />
                        )}
                      </span>
                    </Td>
                    <Td>
                      <Link href={`/catalogue/${design.id}`} className="grid leading-tight" onClick={(event) => event.stopPropagation()}>
                        <span className="font-semibold text-ink hover:underline">{design.name}</span>
                        <span className="font-mono text-[12px] text-gold-deep">{design.code}</span>
                      </Link>
                    </Td>
                    <Td>{design.category?.name ?? "—"}</Td>
                    <Td>{design.defaultPurity ?? design.metal}</Td>
                    <Td align="right">{making(design)}</Td>
                    <Td align="right">
                      <Link href={`/stock?designId=${design.id}`} className={`font-semibold hover:underline ${design.inStock ? "text-ink" : "text-ash"}`} onClick={(event) => event.stopPropagation()}>
                        {design.inStock ?? 0}
                      </Link>
                    </Td>
                    <Td>
                      <span className="flex justify-end gap-1">
                        {design.isOnline && (
                          <Badge tone="navy" dot>
                            Online
                          </Badge>
                        )}
                        {!design.isActive && <Badge>Retired</Badge>}
                      </span>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pager pagination={designs.data?.meta.pagination} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
