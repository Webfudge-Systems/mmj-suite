import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Shell } from "@/components/ui/Shell";
import { PillLink } from "@/components/ui/Pill";
import { ShopBrowser } from "@/components/shop/ShopBrowser";
import { searchProducts } from "@/lib/catalog";
import { parseFilters, parsePage, parseSort, type RawParams } from "@/lib/shop-params";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false },
};

const suggestions = ["mangalsutra", "jhumka", "solitaire", "kada", "temple", "22KT"];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const query = filters.query?.trim() ?? "";
  const products = query ? searchProducts(query, parseSort(params)) : [];

  return (
    <>
      <PageHeader
        title={query ? `Results for “${query}”` : "Search the catalogue"}
        lead={
          query
            ? `${products.length} ${products.length === 1 ? "piece" : "pieces"} match. Search covers names, SKUs, design numbers, purity and collection.`
            : "Search by name, SKU, design number, purity or collection."
        }
        trail={[{ label: "Home", href: "/" }, { label: "Search" }]}
      />

      {query ? (
        <ShopBrowser products={products} filters={filters} page={parsePage(params)} />
      ) : (
        <Shell className="py-16 sm:py-20">
          <p className="eyebrow text-[9px] text-stone">Try one of these</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {suggestions.map((term) => (
              <li key={term}>
                <PillLink href={`/search?q=${encodeURIComponent(term)}`}>{term}</PillLink>
              </li>
            ))}
          </ul>
        </Shell>
      )}
    </>
  );
}
