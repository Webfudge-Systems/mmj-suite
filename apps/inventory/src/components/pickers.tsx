"use client";

import { useEffect, useMemo, useState } from "react";
import { Input, Select } from "@webfudge/ui";
import type { Design, MakingCharge, Page, StockLocation } from "@webfudge/utils/api";
import { LOCATION_KIND_LABELS } from "@webfudge/utils/api";
import { useBranch } from "@/lib/branch";
import { useApi, useResource } from "@/lib/api";

export function BranchSwitcher() {
  const { branch, branches, setBranchId } = useBranch();
  if (branches.length <= 1) return branch ? <span className="text-[13px] font-semibold text-navy">{branch.name}</span> : null;
  return (
    <label className="flex items-center gap-2 text-[13px]">
      <span className="text-ash">Branch</span>
      <Select id="branch-switcher" value={branch?.id ?? ""} onChange={(event) => setBranchId(Number(event.target.value))} className="h-8 max-w-56 py-0">
        {branches.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.name} ({entry.code})
          </option>
        ))}
      </Select>
    </label>
  );
}

/** Search-as-you-type design picker. Shows the chosen design's number and name. */
export function DesignPicker({
  id,
  value,
  onChange,
  metal,
}: {
  id: string;
  value: Design | null;
  onChange: (design: Design | null) => void;
  metal?: string;
}) {
  const api = useApi();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Design[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ q: query, pageSize: "12" });
      if (metal) params.set("metal", metal);
      api
        .get<Page<Design>>(`/stock/designs?${params}`)
        .then((page) => active && setResults(page.data))
        .catch(() => active && setResults([]));
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [api, query, open, metal]);

  if (value && !open) {
    return (
      <button
        type="button"
        id={id}
        onClick={() => setOpen(true)}
        className="flex h-10 w-full items-center gap-2 truncate rounded-[var(--radius-control)] border border-line bg-surface px-3 text-left text-sm hover:border-navy"
      >
        <span className="font-mono text-[12px] text-gold-deep">{value.code}</span>
        <span className="truncate">{value.name}</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <Input
        id={id}
        value={query}
        autoFocus={open}
        placeholder="Search design number or name"
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onChange={(event) => setQuery(event.target.value)}
      />
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full min-w-[260px] overflow-y-auto rounded-[var(--radius-control)] border border-line bg-surface py-1 shadow-lg">
          {results.map((design) => (
            <li key={design.id}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(design);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-baseline gap-2 px-3 py-2 text-left text-sm hover:bg-sunk"
              >
                <span className="font-mono text-[12px] text-gold-deep">{design.code}</span>
                <span className="truncate">{design.name}</span>
                <span className="ml-auto shrink-0 text-[11px] text-ash">{design.defaultPurity ?? design.metal}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Locations of the current branch, as a list ready for a select. */
export function useLocations(branchId: number | undefined) {
  const { data, error, loading, reload } = useResource<{ data: StockLocation[]; meta: { untrayed: number } }>(
    branchId ? `/stock/locations?branchId=${branchId}` : null,
  );
  const locations = useMemo(() => data?.data ?? [], [data]);
  return { locations, untrayed: data?.meta.untrayed ?? 0, error, loading, reload };
}

/** A select of places that hold pieces (trays, safes, back office), labelled by full code. */
export function LocationSelect({
  id,
  locations,
  value,
  onChange,
  emptyLabel = "No tray yet",
}: {
  id: string;
  locations: StockLocation[];
  value: number | null;
  onChange: (id: number | null) => void;
  emptyLabel?: string;
}) {
  const holding = locations.filter((location) => location.isActive && ["tray", "safe", "back_office"].includes(location.kind));
  return (
    <Select id={id} value={value ?? ""} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}>
      <option value="">{emptyLabel}</option>
      {holding.map((location) => (
        <option key={location.id} value={location.id}>
          {location.fullCode}
          {location.name ? ` · ${location.name}` : ""} ({LOCATION_KIND_LABELS[location.kind]})
        </option>
      ))}
    </Select>
  );
}

export function MakingInput({ id, value, onChange }: { id: string; value: MakingCharge | null; onChange: (value: MakingCharge | null) => void }) {
  const type = value?.type ?? "per_gram";
  return (
    <div className="flex gap-2">
      <Select
        id={`${id}-type`}
        aria-label="Making charge type"
        value={type}
        onChange={(event) => onChange({ type: event.target.value as MakingCharge["type"], value: value?.value ?? 0 })}
        className="w-36 shrink-0"
      >
        <option value="per_gram">₹ per gram</option>
        <option value="percent">% of metal</option>
        <option value="fixed">₹ fixed</option>
      </Select>
      <Input
        id={id}
        inputMode="decimal"
        value={value ? String(value.value) : ""}
        onChange={(event) => onChange(event.target.value === "" ? null : { type, value: Number(event.target.value) })}
        className="tabular-nums"
      />
    </div>
  );
}
