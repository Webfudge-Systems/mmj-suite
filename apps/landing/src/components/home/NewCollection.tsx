import { Panel } from "@/components/ui/Panel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ArrowCta } from "@/components/ui/Button";
import { ProductGrid } from "@/components/commerce/ProductGrid";
import { getNewArrivals } from "@/lib/catalog";

export function NewCollection() {
  const products = getNewArrivals(4);

  return (
    <Panel tone="paper">
      <SectionHeading
        label="New this season"
        action={<ArrowCta href="/shop?sort=newest">View all</ArrowCta>}
      />
      <ProductGrid products={products} className="mt-10" />
    </Panel>
  );
}
