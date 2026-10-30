import { Shell } from "@/components/ui/Shell";
import { ButtonLink } from "@/components/ui/Button";
import { ProductGrid } from "@/components/commerce/ProductGrid";
import { ClearFilters, FilterGroups } from "@/components/shop/FilterGroups";
import { ShopToolbar } from "@/components/shop/ShopToolbar";
import { Pagination } from "@/components/shop/Pagination";
import { facetCounts, getProducts } from "@/lib/catalog";
import { paginate } from "@/lib/shop-params";
import type { CatalogFilters, Product } from "@/types";

/**
 * The grid, its rail and its pager. Every shop surface renders this; only the
 * product list and the locked facets differ.
 */
export function ShopBrowser({
  products,
  filters,
  page,
  lockedKeys,
}: {
  products: Product[];
  filters: CatalogFilters;
  page: number;
  lockedKeys?: string[];
}) {
  /** Counts come off the whole catalogue so a facet never shows zero for itself. */
  const facets = facetCounts(getProducts());
  const paged = paginate(products, page);

  return (
    <Shell className="py-12 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-[232px_1fr] lg:gap-14">
        <aside className="hidden lg:block">
          <div className="sticky top-32">
            <div className="flex items-baseline justify-between border-b border-line pb-4">
              <h2 className="eyebrow text-[10px]">Refine</h2>
              <ClearFilters />
            </div>
            <div className="mt-6 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1">
              <FilterGroups facets={facets} lockedKeys={lockedKeys} />
            </div>
          </div>
        </aside>

        <div>
          <ShopToolbar
            total={products.length}
            filters={filters}
            facets={facets}
            lockedKeys={lockedKeys}
          />

          {paged.items.length > 0 ? (
            <>
              <ProductGrid
                products={paged.items}
                columns={3}
                priorityCount={3}
                className="mt-10"
              />
              <Pagination page={paged.page} pageCount={paged.pageCount} />
            </>
          ) : (
            <div className="mt-16 border border-line bg-paper px-8 py-20 text-center">
              <h3 className="text-[1.25rem]">Nothing matches that yet</h3>
              <p className="mx-auto mt-4 max-w-sm text-[13px] leading-relaxed text-ash">
                Our karigars make to order as well. Tell us the weight band and the
                design you have in mind and we will quote it.
              </p>
              <ButtonLink href="/contact" variant="outline" className="mt-8">
                Request a piece
              </ButtonLink>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
