"use client";

import { use, useState } from "react";
import Link from "next/link";
import { PURITIES } from "@webfudge/config";
import { Card, EmptyState, Input, PageHeader, Pager, Select, Spinner, StatusBadge, Table, Td, Th, Tr, buttonClass } from "@webfudge/ui";
import type { Page, StockItem, StockLocation } from "@webfudge/utils/api";
import { ITEM_STATUS_LABELS } from "@webfudge/utils/api";
import { formatWeight } from "@webfudge/utils/formatters";
import { useLocations } from "@/components/pickers";
import { useResource } from "@/lib/api";
import { useBranch } from "@/lib/branch";

type Search = { untrayed?: string; designId?: string; locationId?: string; status?: string };

export default function StockPage({ searchParams }: { searchParams: Promise<Search> }) {
  const initial = use(searchParams);
  const { branch } = useBranch();
  const { locations } = useLocations(branch?.id);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(initial.status ?? "");
  const [purity, setPurity] = useState("");
  const [locationId, setLocationId] = useState(initial.locationId ?? "");
  const [untrayed, setUntrayed] = useState(initial.untrayed === "true");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), pageSize: "50" });
  if (branch) params.set("branchId", String(branch.id));
  if (q.trim()) params.set("q", q.trim());
  if (status) params.set("status", status);
  if (purity) params.set("purity", purity);
  if (locationId) params.set("locationId", locationId);
  if (untrayed) params.set("untrayed", "true");
  if (initial.designId) params.set("designId", initial.designId);

  const items = useResource<Page<StockItem>>(branch ? `/stock/items?${params}` : null);
  const reset = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(1);
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Stock"
        description={`Every tagged piece at ${branch?.name ?? "this branch"}. Sold pieces are hidden unless you choose them.`}
        actions={
          <Link href="/tags" className={buttonClass("secondary")}>
            Print tags
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          id="stock-search"
          placeholder="Tag, old tag, HUID or design"
          value={q}
          onChange={(event) => reset(setQ)(event.target.value)}
          className="max-w-xs font-mono"
        />
        <Select id="stock-status" aria-label="Status" value={status} onChange={(event) => reset(setStatus)(event.target.value)} className="max-w-[170px]">
          <option value="">Not sold</option>
          {Object.entries(ITEM_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
          <option value="all">Everything</option>
        </Select>
        <Select id="stock-purity" aria-label="Purity" value={purity} onChange={(event) => reset(setPurity)(event.target.value)} className="max-w-[150px]">
          <option value="">Any purity</option>
          {PURITIES.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.label}
            </option>
          ))}
        </Select>
        <Select id="stock-location" aria-label="Location" value={locationId} onChange={(event) => reset(setLocationId)(event.target.value)} className="max-w-[220px]">
          <option value="">Any location</option>
          {locations
            .filter((location: StockLocation) => location.kind !== "showcase" && location.kind !== "counter")
            .map((location) => (
              <option key={location.id} value={location.id}>
                {location.fullCode}
              </option>
            ))}
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={untrayed} onChange={(event) => reset(setUntrayed)(event.target.checked)} />
          Waiting for a tray
        </label>
      </div>

      <Card>
        {items.loading ? (
          <div className="grid place-items-center p-10 text-navy">
            <Spinner />
          </div>
        ) : items.error ? (
          <p className="p-5 text-[13px] text-risk">{items.error}</p>
        ) : !items.data?.data.length ? (
          <EmptyState
            title="No pieces match"
            description={untrayed ? "Every piece in stock has a tray." : "Change the filters, or receive or import stock."}
          />
        ) : (
          <>
            <Table minWidth={860}>
              <thead>
                <tr>
                  <Th>Tag</Th>
                  <Th>Design</Th>
                  <Th>Purity</Th>
                  <Th align="right">Gross</Th>
                  <Th align="right">Net</Th>
                  <Th>HUID</Th>
                  <Th>Location</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {items.data.data.map((item) => (
                  <Tr key={item.id} className="hover:bg-sunk/60">
                    <Td>
                      <Link href={`/stock/${item.id}`} className="grid font-mono hover:underline">
                        <span className="font-semibold">{item.tagNumber}</span>
                        {item.legacyTag && <span className="text-[11px] text-ash">old {item.legacyTag}</span>}
                      </Link>
                    </Td>
                    <Td>
                      <span className="grid">
                        <span>{item.design?.name}</span>
                        <span className="font-mono text-[11px] text-ash">{item.design?.code}</span>
                      </span>
                    </Td>
                    <Td>{item.purity}</Td>
                    <Td align="right">{formatWeight(item.grossWeight)}</Td>
                    <Td align="right">{formatWeight(item.netWeight)}</Td>
                    <Td className="font-mono">{item.huid ?? "—"}</Td>
                    <Td className="font-mono text-[12px]">
                      {item.location ? `${item.location.fullCode}${item.slot ? ` · ${item.slot}` : ""}` : item.status === "in_stock" ? <span className="font-sans text-warn">Needs a tray</span> : "—"}
                    </Td>
                    <Td>
                      <StatusBadge status={item.status} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pager pagination={items.data.meta.pagination} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
