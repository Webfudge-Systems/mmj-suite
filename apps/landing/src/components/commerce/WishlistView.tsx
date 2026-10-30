"use client";

import { Shell } from "@/components/ui/Shell";
import { ProductGrid } from "@/components/commerce/ProductGrid";
import { EmptyState } from "@/components/commerce/EmptyState";
import { useWishlist } from "@/store/wishlist";
import { useHydrated } from "@/store/ui";
import { getProductsBySlugs } from "@/lib/catalog";

export function WishlistView() {
  const slugs = useWishlist((state) => state.slugs);
  const clear = useWishlist((state) => state.clear);
  const hydrated = useHydrated();

  if (!hydrated) {
    return <Shell className="py-16"><div className="h-64" /></Shell>;
  }

  const products = getProductsBySlugs(slugs);

  if (products.length === 0) {
    return (
      <EmptyState
        title="Nothing saved yet"
        body="Tap the heart on any piece and it will wait here for you, rate changes and all."
        primary={{ href: "/shop", label: "Shop all pieces" }}
        secondary={{ href: "/collections", label: "Browse collections" }}
      />
    );
  }

  return (
    <Shell className="py-12 sm:py-16">
      <div className="flex items-center justify-between border-b border-line pb-5">
        <p className="text-[13px] text-ash">
          <span className="text-ink">{products.length}</span>{" "}
          {products.length === 1 ? "piece" : "pieces"} saved
        </p>
        <button
          type="button"
          onClick={clear}
          className="eyebrow text-[9px] text-ash underline-offset-4 hover:text-wine hover:underline"
        >
          Clear all
        </button>
      </div>
      <ProductGrid products={products} priorityCount={4} className="mt-10" />
    </Shell>
  );
}
