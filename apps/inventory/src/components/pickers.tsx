"use client";

import { useEffect, useMemo, useState } from "react";
import { PURITIES } from "@webfudge/config";
import { Button, Input, Select } from "@webfudge/ui";
import type { Category, Design, MakingCharge, Page, StockLocation } from "@webfudge/utils/api";
import { LOCATION_KIND_LABELS } from "@webfudge/utils/api";
import { useBranch } from "@/lib/branch";
import { errorMessage, useApi, useResource } from "@/lib/api";

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

/**
 * Search-as-you-type design picker. Shows the chosen design's number and name.
 * When nothing in the catalogue matches, offers to create the design on the spot,
 * so a delivery can be received without leaving the page.
 */
export function DesignPicker({
  id,
  value,
  onChange,
  metal,
  purity,
  making,
}: {
  id: string;
  value: Design | null;
  onChange: (design: Design | null) => void;
  metal?: string;
  /** Purity on the piece, used as the new design's default. */
  purity?: string;
  /** Making charge on the piece, used as the new design's default. */
  making?: MakingCharge | null;
}) {
  const api = useApi();
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ q: string; data: Design[] } | null>(null);
  const [open, setOpen] = useState(false);
  const categories = useResource<{ data: Category[] }>(open ? "/stock/categories" : null);
  const [categoryId, setCategoryId] = useState("");
  const [draftMaking, setDraftMaking] = useState<MakingCharge | null>(null);
  const [draftPurity, setDraftPurity] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const q = query;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ q, pageSize: "12" });
      if (metal) params.set("metal", metal);
      api
        .get<Page<Design>>(`/stock/designs?${params}`)
        .then((page) => active && setFound({ q, data: page.data }))
        .catch(() => active && setFound({ q, data: [] }));
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [api, query, open, metal]);

  const typed = query.trim();
  const results = found?.data ?? [];
  const noMatch = typed.length >= 2 && found?.q === query && results.length === 0;
  const newPurity = draftPurity || purity || "";
  const purityMetal = PURITIES.find((entry) => entry.code === newPurity)?.metal;
  const newMaking = draftMaking ?? making ?? null;

  function choose(design: Design) {
    onChange(design);
    setOpen(false);
    setQuery("");
    setFound(null);
    setCreateError(null);
  }

  async function create() {
    setCreating(true);
    setCreateError(null);
    try {
      const result = await api.post<{ data: Design }>("/stock/designs", {
        name: typed,
        categoryId: Number(categoryId),
        metal: purityMetal,
        defaultPurity: newPurity,
        making: newMaking,
        isActive: true,
      });
      choose(result.data);
    } catch (cause) {
      setCreateError(errorMessage(cause));
    } finally {
      setCreating(false);
    }
  }

  if (value && !open) {
    return (
      <button
        type="button"
        id={id}
        onClick={() => setOpen(true)}
        className="flex h-11 w-full items-center gap-2 truncate rounded-lg border border-gray-300 bg-surface px-3 text-left text-sm shadow-sm hover:border-navy"
      >
        <span className="font-mono text-[12px] text-gold-deep">{value.code}</span>
        <span className="truncate">{value.name}</span>
      </button>
    );
  }

  return (
    <div
      className="relative"
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <Input
        id={id}
        value={query}
        autoFocus={open}
        placeholder="Search design number or name"
        onChange={(event) => setQuery(event.target.value)}
        invalid={!open && typed.length > 0}
        aria-describedby={!open && typed ? `${id}-hint` : undefined}
      />
      {!open && typed && (
        <p id={`${id}-hint`} className="mt-1.5 text-[12.5px] text-risk">
          Pick the design from the list, or create it there.
        </p>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full min-w-[260px] overflow-y-auto rounded-xl border border-gray-100 bg-surface py-1 shadow-xl">
          {results.map((design) => (
            <li key={design.id}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(design)}
                className="flex w-full items-baseline gap-2 px-3 py-2 text-left text-sm hover:bg-navy-soft/50"
              >
                <span className="font-mono text-[12px] text-gold-deep">{design.code}</span>
                <span className="truncate">{design.name}</span>
                <span className="ml-auto shrink-0 text-[11px] text-ash">{design.defaultPurity ?? design.metal}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && noMatch && (
        <div className="absolute z-20 mt-1 grid w-full min-w-[300px] gap-3 rounded-xl border border-gray-100 bg-surface p-4 shadow-xl">
          <p className="text-[13px] text-ink">
            No design called <span className="font-semibold">“{typed}”</span> in the catalogue yet. Create it now:
          </p>
          <Select id={`${id}-category`} aria-label="Category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">Choose a category</option>
            {categories.data?.data.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.code ? ` (${category.code})` : ""}
              </option>
            ))}
          </Select>
          <Select id={`${id}-purity`} aria-label="Usual purity" value={newPurity} onChange={(event) => setDraftPurity(event.target.value)}>
            <option value="">Choose the usual purity</option>
            {PURITIES.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {entry.label}
              </option>
            ))}
          </Select>
          <div className="grid gap-1">
            <span className="text-[12.5px] font-medium text-gray-700">Usual making charge</span>
            <MakingInput id={`${id}-making`} value={newMaking} onChange={setDraftMaking} />
          </div>
          {createError && <p className="text-[12.5px] text-risk">{createError}</p>}
          <Button size="sm" onClick={create} loading={creating} disabled={!categoryId || !newPurity || !newMaking}>
            Create “{typed}” and use it
          </Button>
          <p className="text-[11.5px] text-ash">Add photos and details later in the Catalogue.</p>
        </div>
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
