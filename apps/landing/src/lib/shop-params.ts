import type {
  Availability,
  CatalogFilters,
  CategorySlug,
  Metal,
  Occasion,
  Purity,
  SortKey,
} from "@/types";

export const PER_PAGE = 12;

export const sortOptions: { value: SortKey; label: string }[] = [
  { value: "popularity", label: "Most popular" },
  { value: "newest", label: "New arrivals" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "weight-asc", label: "Lightest first" },
];

/** Next 16 hands route search params through as string | string[]. */
export type RawParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** Only values we recognise survive, so a hand-typed URL cannot break a page. */
function oneOf<T extends string>(value: string | string[] | undefined, allowed: readonly T[]) {
  const candidate = one(value);
  return allowed.includes(candidate as T) ? (candidate as T) : undefined;
}

const metals: readonly Metal[] = ["gold", "diamond", "silver", "platinum", "bullion"];

const categories: readonly CategorySlug[] = [
  "rings",
  "earrings",
  "necklaces",
  "bangles",
  "mangalsutra",
  "chains",
  "pendants",
  "bracelets",
  "nosepins",
  "anklets",
  "coins",
];

const occasions: readonly Occasion[] = ["bridal", "festive", "daily", "gifting", "mens"];

const purities: readonly Purity[] = ["24KT", "22KT", "18KT", "14KT", "950PT", "925"];

const availabilities: readonly Availability[] = ["in-stock", "made-to-order"];

const sortKeys: readonly SortKey[] = sortOptions.map((option) => option.value);

export function parseFilters(params: RawParams): CatalogFilters {
  const maxPrice = Number(one(params.maxPrice));

  return {
    metal: oneOf(params.metal, metals),
    category: oneOf(params.category, categories),
    occasion: oneOf(params.occasion, occasions),
    purity: oneOf(params.purity, purities),
    availability: oneOf(params.availability, availabilities),
    collection: one(params.collection),
    maxPrice: Number.isFinite(maxPrice) && maxPrice > 0 ? maxPrice : undefined,
    query: one(params.q),
  };
}

export function parseSort(params: RawParams): SortKey {
  return oneOf(params.sort, sortKeys) ?? "popularity";
}

export function parsePage(params: RawParams) {
  const page = Number(one(params.page));
  return Number.isFinite(page) && page > 1 ? Math.floor(page) : 1;
}

export function paginate<T>(list: T[], page: number, perPage = PER_PAGE) {
  const pageCount = Math.max(1, Math.ceil(list.length / perPage));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * perPage;

  return { items: list.slice(start, start + perPage), page: current, pageCount };
}

/** Everything except the facets, so a chip can clear itself and keep the sort. */
export function activeFilterChips(filters: CatalogFilters) {
  const chips: { key: keyof CatalogFilters; label: string }[] = [];

  if (filters.metal) chips.push({ key: "metal", label: filters.metal });
  if (filters.category) chips.push({ key: "category", label: filters.category });
  if (filters.occasion) chips.push({ key: "occasion", label: filters.occasion });
  if (filters.purity) chips.push({ key: "purity", label: filters.purity });
  if (filters.availability) chips.push({ key: "availability", label: filters.availability });
  if (filters.maxPrice) {
    chips.push({ key: "maxPrice", label: `Under ₹${filters.maxPrice.toLocaleString("en-IN")}` });
  }

  return chips;
}
