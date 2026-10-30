"use client";

import { Check } from "lucide-react";
import { useShopQuery } from "@/components/shop/useShopQuery";
import { categories, metalCounters } from "@/data/categories";
import { collections } from "@/data/collections";
import { cn } from "@/lib/utils";
import type { facetCounts } from "@/lib/catalog";

type Facets = ReturnType<typeof facetCounts>;

const occasionLabels = [
  { value: "bridal", label: "Bridal" },
  { value: "festive", label: "Festive" },
  { value: "daily", label: "Everyday" },
  { value: "gifting", label: "Gifting" },
  { value: "mens", label: "For him" },
];

const purityLabels = [
  { value: "24KT", label: "24 karat" },
  { value: "22KT", label: "22 karat" },
  { value: "18KT", label: "18 karat" },
  { value: "14KT", label: "14 karat" },
  { value: "950PT", label: "950 platinum" },
  { value: "925", label: "925 silver" },
];

const priceBands = [
  { value: "25000", label: "Under 25,000" },
  { value: "75000", label: "Under 75,000" },
  { value: "150000", label: "Under 1,50,000" },
  { value: "400000", label: "Under 4,00,000" },
];

const availabilityLabels = [
  { value: "in-stock", label: "In stock" },
  { value: "made-to-order", label: "Made to order" },
];

/**
 * Facet rows. `lockedKeys` hides a group on pages where the URL already pins
 * it, e.g. the metal group on /shop/gold.
 */
export function FilterGroups({
  facets,
  lockedKeys = [],
  onNavigate,
}: {
  facets: Facets;
  lockedKeys?: string[];
  onNavigate?: () => void;
}) {
  const query = useShopQuery();

  const groups = [
    {
      key: "metal",
      title: "Metal",
      options: metalCounters.map((counter) => ({
        value: counter.slug,
        label: counter.name,
        count: facets.metal[counter.slug],
      })),
    },
    {
      key: "category",
      title: "Ornament",
      options: categories.map((category) => ({
        value: category.slug,
        label: category.name,
        count: facets.category[category.slug],
      })),
    },
    {
      key: "occasion",
      title: "Occasion",
      options: occasionLabels.map((option) => ({
        ...option,
        count: facets.occasion[option.value],
      })),
    },
    {
      key: "purity",
      title: "Purity",
      options: purityLabels.map((option) => ({
        ...option,
        count: facets.purity[option.value],
      })),
    },
    {
      key: "collection",
      title: "Collection",
      options: collections.map((collection) => ({
        value: collection.slug,
        label: collection.name,
        count: undefined,
      })),
    },
    { key: "maxPrice", title: "Price", options: priceBands.map((band) => ({ ...band, count: undefined })) },
    {
      key: "availability",
      title: "Availability",
      options: availabilityLabels.map((option) => ({ ...option, count: undefined })),
    },
  ].filter((group) => !lockedKeys.includes(group.key));

  return (
    <div className="divide-y divide-line">
      {groups.map((group) => (
        <fieldset key={group.key} className="py-6 first:pt-0">
          <legend className="eyebrow text-[9px] text-stone">{group.title}</legend>
          <ul className="mt-4 space-y-2.5">
            {group.options.map((option) => {
              const active = query.get(group.key) === option.value;
              const empty = option.count === 0;

              return (
                <li key={option.value}>
                  <button
                    type="button"
                    disabled={empty}
                    aria-pressed={active}
                    onClick={() => {
                      query.toggle(group.key, option.value);
                      onNavigate?.();
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 text-left text-[13px] transition-colors",
                      empty && "cursor-not-allowed opacity-35",
                      active ? "text-ink" : "text-ash hover:text-ink",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-4 shrink-0 place-items-center border transition-colors",
                        active ? "border-ink bg-ink text-cream" : "border-line",
                      )}
                    >
                      {active && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span className="flex-1">{option.label}</span>
                    {option.count !== undefined && (
                      <span className="text-[11px] text-stone">{option.count ?? 0}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}
    </div>
  );
}

export function ClearFilters({ className }: { className?: string }) {
  const query = useShopQuery();

  return (
    <button
      type="button"
      onClick={query.clear}
      className={cn("eyebrow text-[9px] text-ash underline-offset-4 hover:text-ink hover:underline", className)}
    >
      Clear all
    </button>
  );
}
