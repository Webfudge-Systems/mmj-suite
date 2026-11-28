"use client";

import { useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { discountPercent } from "@/components/ui/Badge";
import { priceText } from "@/components/commerce/ProductCard";
import { useCart } from "@/store/cart";
import { useUi } from "@/store/ui";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/utils";

/**
 * Phone-only buy bar pinned to the bottom: price on the left, one big button on
 * the right. Pieces that need a size send you to the size picker first so the
 * right size lands in the bag.
 */
export function StickyBuyBar({ product }: { product: Product }) {
  const [added, setAdded] = useState(false);
  const add = useCart((state) => state.add);
  const openCart = useUi((state) => state.openCart);
  const discount = discountPercent(product.price, product.compareAtPrice);
  const needsSize = Boolean(product.sizes && product.sizes.length > 1);
  const onRequest = product.live?.priceOnRequest;

  const onClick = () => {
    if (onRequest) {
      window.location.href = "/contact";
      return;
    }
    if (needsSize) {
      document.getElementById("buy")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    add(product.slug, 1, product.sizes?.[0]);
    setAdded(true);
    openCart();
    window.setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] rounded-t-3xl border-t border-line bg-paper/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_-18px_rgba(10,40,116,0.4)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-md items-center gap-4">
        <div className="min-w-0">
          {product.compareAtPrice && (
            <p className="text-[11px] tabular-nums text-stone line-through">
              {formatPrice(product.compareAtPrice)}
            </p>
          )}
          <p className="flex items-center gap-2">
            <span className="text-[18px] font-semibold tabular-nums text-ink">{priceText(product)}</span>
            {discount && (
              <span className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-semibold text-wine">
                Save {discount}%
              </span>
            )}
          </p>
          <p className="text-[10px] text-stone">Inclusive of GST</p>
        </div>
        <button
          type="button"
          onClick={onClick}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-wine text-[14px] font-semibold text-cream transition-transform active:scale-[0.97]"
        >
          {added ? <Check className="size-4" /> : <ShoppingBag className="size-4" strokeWidth={1.8} />}
          {onRequest ? "Ask for this piece" : added ? "Added" : needsSize ? "Select size" : "Add to bag"}
        </button>
      </div>
    </div>
  );
}
