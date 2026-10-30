import { ProductCard } from "@/components/commerce/ProductCard";
import { Reveal } from "@/components/ui/Reveal";
import type { Product } from "@/types";
import { cn } from "@/lib/utils";

export function ProductGrid({
  products,
  className,
  columns = 4,
  priorityCount = 0,
}: {
  products: Product[];
  className?: string;
  columns?: 3 | 4;
  priorityCount?: number;
}) {
  return (
    <div
      className={cn(
        "grid gap-x-5 gap-y-10 sm:grid-cols-2",
        columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
        className,
      )}
    >
      {products.map((product, index) => (
        <Reveal key={product.slug} delay={Math.min(index, 3) * 0.06}>
          <ProductCard product={product} priority={index < priorityCount} />
        </Reveal>
      ))}
    </div>
  );
}
