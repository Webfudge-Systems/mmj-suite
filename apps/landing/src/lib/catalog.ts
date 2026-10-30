import type {
  CatalogFilters,
  Metal,
  Product,
  ProductSeed,
  SortKey,
} from "@/types";
import { productSeeds } from "@/data/products";
import { priceBreakup } from "@/lib/pricing";

/**
 * Every read of catalogue data goes through this module. When Strapi is wired
 * up these become fetches and nothing above this layer has to change.
 */

/** Price is derived, never stored, so the card and the breakup cannot disagree. */
function priced(seed: ProductSeed): Product {
  const price = Math.round(priceBreakup(seed).total);
  const compareAtPrice = seed.offerPercent
    ? Math.round(price / (1 - seed.offerPercent / 100))
    : undefined;

  return { ...seed, price, compareAtPrice };
}

const products: Product[] = productSeeds.map(priced);

export function getProducts() {
  return products;
}

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function getProductsBySlugs(slugs: string[]) {
  return slugs
    .map((slug) => getProductBySlug(slug))
    .filter((product): product is Product => Boolean(product));
}

export function getBestsellers(limit = 4) {
  return sortProducts(
    products.filter((product) => product.bestseller),
    "popularity",
  ).slice(0, limit);
}

export function getNewArrivals(limit = 4) {
  return sortProducts(
    products.filter((product) => product.isNew),
    "newest",
  ).slice(0, limit);
}

export function getFeatured(limit = 8) {
  return products.filter((product) => product.featured).slice(0, limit);
}

export function getByMetal(metal: Metal) {
  return products.filter((product) => product.metal === metal);
}

export function getByCollection(slug: string) {
  return products.filter((product) => product.collection === slug);
}

/** Related pieces: same collection first, then anything in the same category. */
export function getRelated(product: Product, limit = 4) {
  const pool = products.filter((candidate) => candidate.slug !== product.slug);
  const sameCollection = pool.filter(
    (candidate) => candidate.collection === product.collection,
  );
  const sameCategory = pool.filter(
    (candidate) =>
      candidate.category === product.category && !sameCollection.includes(candidate),
  );

  return [...sameCollection, ...sameCategory, ...pool].slice(0, limit);
}

function matches(product: Product, filters: CatalogFilters) {
  if (filters.metal && product.metal !== filters.metal) return false;
  if (filters.category && product.category !== filters.category) return false;
  if (filters.occasion && product.occasion !== filters.occasion) return false;
  if (filters.purity && product.purity !== filters.purity) return false;
  if (filters.collection && product.collection !== filters.collection) return false;
  if (filters.availability && product.availability !== filters.availability) return false;
  if (filters.maxPrice && product.price > filters.maxPrice) return false;

  if (filters.query) {
    const haystack = [
      product.name,
      product.tagline,
      product.sku,
      product.designNumber,
      product.category,
      product.metal,
      product.purity,
      product.collection,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(filters.query.trim().toLowerCase())) return false;
  }

  return true;
}

export function sortProducts(list: Product[], sort: SortKey = "popularity") {
  const sorted = [...list];

  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "newest":
      return sorted.sort(
        (a, b) => new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime(),
      );
    case "weight-asc":
      return sorted.sort((a, b) => a.grossWeight - b.grossWeight);
    default:
      return sorted.sort((a, b) => b.popularity - a.popularity);
  }
}

export function filterProducts(filters: CatalogFilters, sort: SortKey = "popularity") {
  return sortProducts(
    products.filter((product) => matches(product, filters)),
    sort,
  );
}

export function searchProducts(query: string, sort: SortKey = "popularity") {
  if (!query.trim()) return [];
  return filterProducts({ query }, sort);
}

/** Facet counts for the filter panel, computed off the unfiltered catalogue. */
export function facetCounts(list: Product[]) {
  const tally = <T extends string>(key: (product: Product) => T) =>
    list.reduce<Record<string, number>>((acc, product) => {
      const value = key(product);
      acc[value] = (acc[value] ?? 0) + 1;
      return acc;
    }, {});

  return {
    metal: tally((product) => product.metal),
    category: tally((product) => product.category),
    occasion: tally((product) => product.occasion),
    purity: tally((product) => product.purity),
  };
}

export function priceBounds() {
  const prices = products.map((product) => product.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
