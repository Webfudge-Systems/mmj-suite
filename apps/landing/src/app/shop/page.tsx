import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShopBrowser } from "@/components/shop/ShopBrowser";
import { filterProducts } from "@/lib/catalog";
import { parseFilters, parsePage, parseSort, type RawParams } from "@/lib/shop-params";

export const metadata: Metadata = {
  title: "Shop all jewellery",
  description:
    "Every piece on the MMJ floor: gold, diamond, silver, platinum and sealed bullion, with weights and making charges printed on each one.",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const products = filterProducts(filters, parseSort(params));

  return (
    <>
      <PageHeader
        title="Every piece on the floor"
        lead="Thirty-eight designs across five counters. Filter by metal, ornament or occasion, and open any piece to see exactly how its price is built."
        trail={[{ label: "Home", href: "/" }, { label: "Shop" }]}
      />
      <ShopBrowser products={products} filters={filters} page={parsePage(params)} />
    </>
  );
}
