"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useApi, useResource } from "@webfudge/auth/components";
import { Alert, Button, EmptyState, Input, Spinner, cn } from "@webfudge/ui";
import type { Category, FloorDesign } from "@webfudge/utils/api";
import { DesignCard } from "@/components/design-card";
import { useFloor } from "@/lib/floor";

const PRICES: { label: string; min?: number; max?: number }[] = [
  { label: "Any price" },
  { label: "Under ₹50,000", max: 50000 },
  { label: "₹50,000 – 1 lakh", min: 50000, max: 100000 },
  { label: "₹1 – 2 lakh", min: 100000, max: 200000 },
  { label: "₹2 – 5 lakh", min: 200000, max: 500000 },
  { label: "Above ₹5 lakh", min: 500000 },
];

const WEIGHTS: { label: string; min?: number; max?: number }[] = [
  { label: "Any weight" },
  { label: "Under 5 g", max: 5 },
  { label: "5 – 10 g", min: 5, max: 10 },
  { label: "10 – 25 g", min: 10, max: 25 },
  { label: "25 – 50 g", min: 25, max: 50 },
  { label: "Above 50 g", min: 50 },
];

const METALS = [
  ["", "All metals"],
  ["gold", "Gold"],
  ["silver", "Silver"],
  ["platinum", "Platinum"],
];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-10 shrink-0 rounded-lg border px-4 text-[14px] font-semibold whitespace-nowrap transition-all duration-200",
        active ? "border-transparent bg-navy text-white shadow-lg" : "border-gray-100 bg-white text-gray-700 shadow-sm hover:shadow-md",
      )}
    >
      {children}
    </button>
  );
}

type Result = { data: FloorDesign[]; meta: { pagination: { page: number; pageCount: number; total: number } } };

export default function CollectionPage() {
  const api = useApi();
  const { branchId } = useFloor();
  const categories = useResource<{ data: Category[] }>("/stock/categories");
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [metal, setMetal] = useState("");
  const [price, setPrice] = useState(0);
  const [weight, setWeight] = useState(0);
  const [everywhere, setEverywhere] = useState(false);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [designs, setDesigns] = useState<FloorDesign[]>([]);
  const [meta, setMeta] = useState<Result["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filters = new URLSearchParams({ branchId: String(branchId), sort, pageSize: "24" });
  if (q.trim()) filters.set("q", q.trim());
  if (categoryId) filters.set("categoryId", String(categoryId));
  if (metal) filters.set("metal", metal);
  if (PRICES[price].min) filters.set("minPrice", String(PRICES[price].min));
  if (PRICES[price].max) filters.set("maxPrice", String(PRICES[price].max));
  if (WEIGHTS[weight].min) filters.set("minWeight", String(WEIGHTS[weight].min));
  if (WEIGHTS[weight].max) filters.set("maxWeight", String(WEIGHTS[weight].max));
  if (everywhere) filters.set("scope", "all");
  const key = filters.toString();

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      api
        .get<Result>(`/floor/designs?${key}&page=${page}`)
        .then((result) => {
          if (!active) return;
          setDesigns((current) => (page === 1 ? result.data : [...current, ...result.data]));
          setMeta(result.meta);
          setError(null);
        })
        .catch((cause) => active && setError((cause as Error).message))
        .finally(() => active && setLoading(false));
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [api, key, page]);

  /** Any filter change starts the list again from the top. */
  const refine = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(1);
    setLoading(true);
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/40 bg-white/95 p-3 shadow-lg backdrop-blur-xl">
        <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-gray-400" aria-hidden />
        <Input
          id="collection-search"
          value={q}
          onChange={(event) => refine(setQ)(event.target.value)}
          placeholder="Search a design, number or tag"
          className="h-12 rounded-full border-navy/40 pl-12 text-base"
          inputMode="search"
        />
        </div>
        <label className="flex h-12 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-[14px] font-semibold text-gray-700 shadow-sm">
          <input type="checkbox" checked={everywhere} onChange={(event) => refine(setEverywhere)(event.target.checked)} className="size-5 accent-navy" />
          Include other branches
        </label>
        <select
          aria-label="Sort"
          value={sort}
          onChange={(event) => refine(setSort)(event.target.value)}
          className="h-12 rounded-full border border-gray-200 bg-white px-4 text-[14px] font-semibold text-gray-700 shadow-sm focus:ring-2 focus:ring-navy focus:outline-none"
        >
          <option value="newest">Newest first</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip active={categoryId === null} onClick={() => refine(setCategoryId)(null)}>
          Everything
        </Chip>
        {categories.data?.data.map((category) => (
          <Chip key={category.id} active={categoryId === category.id} onClick={() => refine(setCategoryId)(category.id)}>
            {category.name}
          </Chip>
        ))}
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {METALS.map(([value, label]) => (
          <Chip key={value} active={metal === value} onClick={() => refine(setMetal)(value)}>
            {label}
          </Chip>
        ))}
        <span className="w-2 shrink-0" />
        {PRICES.map((entry, index) => (
          <Chip key={entry.label} active={price === index} onClick={() => refine(setPrice)(index)}>
            {entry.label}
          </Chip>
        ))}
        <span className="w-2 shrink-0" />
        {WEIGHTS.map((entry, index) => (
          <Chip key={entry.label} active={weight === index} onClick={() => refine(setWeight)(index)}>
            {entry.label}
          </Chip>
        ))}
      </div>

      {error && <Alert tone="risk">{error}</Alert>}
      {loading && page === 1 ? (
        <div className="grid place-items-center py-20 text-navy">
          <Spinner />
        </div>
      ) : !designs.length ? (
        <EmptyState title="Nothing matches" description="Try fewer filters, or include other branches." />
      ) : (
        <>
          <p className="text-[13px] text-ash">{meta?.pagination.total} designs</p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {designs.map((design) => (
              <DesignCard key={design.id} design={design} />
            ))}
          </div>
          {meta && meta.pagination.page < meta.pagination.pageCount && (
            <Button variant="secondary" size="lg" className="justify-self-center" onClick={() => setPage((value) => value + 1)}>
              Show more
            </Button>
          )}
        </>
      )}
    </div>
  );
}
