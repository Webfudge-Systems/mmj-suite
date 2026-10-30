"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { ClearFilters, FilterGroups } from "@/components/shop/FilterGroups";
import { useShopQuery } from "@/components/shop/useShopQuery";
import { sortOptions } from "@/lib/shop-params";
import type { facetCounts } from "@/lib/catalog";
import type { CatalogFilters } from "@/types";
import { activeFilterChips } from "@/lib/shop-params";

/**
 * Count, active chips, sort and the mobile filter trigger. The desktop rail
 * lives beside the grid; this owns the drawer copy of it.
 */
export function ShopToolbar({
  total,
  filters,
  facets,
  lockedKeys,
}: {
  total: number;
  filters: CatalogFilters;
  facets: ReturnType<typeof facetCounts>;
  lockedKeys?: string[];
}) {
  const [open, setOpen] = useState(false);
  const query = useShopQuery();
  const chips = activeFilterChips(filters).filter((chip) => !lockedKeys?.includes(chip.key));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <p className="text-[13px] text-ash">
          <span className="text-ink">{total}</span> {total === 1 ? "piece" : "pieces"}
        </p>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setOpen(true)}
            className="lg:hidden"
          >
            <SlidersHorizontal className="size-3.5" />
            Filter
          </Button>

          <label className="flex items-center gap-2">
            <span className="eyebrow text-[9px] text-stone">Sort</span>
            <select
              value={query.get("sort") ?? "popularity"}
              onChange={(event) => query.set("sort", event.target.value)}
              className="border border-line bg-transparent py-2 pl-3 pr-8 text-[13px] text-ink outline-none transition-colors focus-visible:border-ink"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {chips.length > 0 && (
        <ul className="flex flex-wrap items-center gap-2 pt-5">
          {chips.map((chip) => (
            <li key={chip.key}>
              <button
                type="button"
                onClick={() => query.set(chip.key, null)}
                className="eyebrow flex items-center gap-1.5 border border-line px-3 py-1.5 text-[9px] text-ash transition-colors hover:border-ink hover:text-ink"
              >
                {chip.label}
                <X className="size-3" />
              </button>
            </li>
          ))}
          <li>
            <ClearFilters className="ml-1" />
          </li>
        </ul>
      )}

      <Drawer open={open} onClose={() => setOpen(false)} title="Filter" side="left">
        <div className="px-6 py-6">
          <FilterGroups
            facets={facets}
            lockedKeys={lockedKeys}
            onNavigate={() => undefined}
          />
          <div className="mt-8 flex items-center gap-4">
            <Button onClick={() => setOpen(false)} className="flex-1">
              Show {total} {total === 1 ? "piece" : "pieces"}
            </Button>
            <ClearFilters />
          </div>
        </div>
      </Drawer>
    </>
  );
}
