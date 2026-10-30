"use client";

import { useState } from "react";
import { Check, Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import { useHydrated, useUi } from "@/store/ui";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

/** Size, quantity, add to bag and wishlist. The only stateful part of the PDP. */
export function BuyPanel({ product }: { product: Product }) {
  const [size, setSize] = useState(product.sizes?.[0]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const add = useCart((state) => state.add);
  const openCart = useUi((state) => state.openCart);
  const toggleWish = useWishlist((state) => state.toggle);
  const wishSlugs = useWishlist((state) => state.slugs);
  const hydrated = useHydrated();
  const wished = hydrated && wishSlugs.includes(product.slug);

  const onAdd = () => {
    add(product.slug, quantity, size);
    setAdded(true);
    openCart();
    window.setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="mt-9">
      {product.sizes && product.sizes.length > 0 && (
        <fieldset>
          <legend className="eyebrow text-[9px] text-stone">
            {sizeLabel(product)}
          </legend>
          <ul className="mt-3.5 flex flex-wrap gap-2">
            {product.sizes.map((option) => (
              <li key={option}>
                <button
                  type="button"
                  onClick={() => setSize(option)}
                  aria-pressed={option === size}
                  className={cn(
                    "border px-4 py-2.5 text-[13px] transition-colors",
                    option === size
                      ? "border-ink bg-ink text-cream"
                      : "border-line text-ash hover:border-ink hover:text-ink",
                  )}
                >
                  {option}
                </button>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <QuantityStepper value={quantity} onChange={setQuantity} max={9} />

        <Button onClick={onAdd} className="flex-1 min-w-[180px]">
          {added ? (
            <>
              <Check className="size-3.5" />
              Added to bag
            </>
          ) : (
            "Add to bag"
          )}
        </Button>

        <button
          type="button"
          onClick={() => toggleWish(product.slug)}
          aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
          aria-pressed={wished}
          className="grid size-[50px] shrink-0 place-items-center border border-line text-ash transition-colors hover:border-ink hover:text-ink"
        >
          <Heart className={cn("size-4", wished && "fill-wine text-wine")} />
        </button>
      </div>

      <p className="mt-5 text-[12px] leading-relaxed text-stone">
        {product.availability === "in-stock"
          ? "Ready to ship in two working days. Free insured delivery above ₹25,000."
          : "Made to order in three to five weeks. We will call you to confirm the weight band before work begins."}
      </p>
    </div>
  );
}

/** Ring sizes, bangle diameters and chain lengths all read differently. */
function sizeLabel(product: Product) {
  switch (product.category) {
    case "bangles":
      return "Bangle size";
    case "chains":
    case "mangalsutra":
      return "Length";
    case "anklets":
      return "Anklet length";
    default:
      return "Size";
  }
}
