"use client";

import { useState } from "react";
import { CalendarCheck, Check, Heart, MessageCircle } from "lucide-react";
import { site } from "@/data/site";
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
    <div id="buy" className="mt-8 scroll-mt-28">
      {product.sizes && product.sizes.length > 0 && (
        <fieldset>
          <legend className="text-[13px] font-medium text-ink">
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
                    "min-w-12 rounded-full border px-4 py-2.5 text-[13px] transition-colors",
                    option === size
                      ? "border-wine bg-wine text-cream"
                      : "border-line text-ash hover:border-wine hover:text-wine",
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

        <Button onClick={onAdd} variant="solid" className="hidden min-w-[180px] flex-1 py-4 lg:inline-flex">
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
          className="hidden size-[54px] shrink-0 lg:grid place-items-center rounded-full border border-line text-ash transition-colors hover:border-wine hover:text-wine"
        >
          <Heart className={cn("size-4", wished && "fill-wine text-wine")} />
        </button>
      </div>

      <a
        href={`https://wa.me/91${site.whatsapp}?text=${encodeURIComponent(`Hello MMJ, I would like to know more about ${product.name} (${product.sku}).`)}`}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-ink py-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-ink hover:text-cream"
      >
        <MessageCircle className="size-4" strokeWidth={1.6} />
        Consult an expert on WhatsApp
      </a>

      <p className="mt-4 flex items-center gap-2 rounded-full bg-mist px-4 py-2.5 text-[12px] text-wine">
        <CalendarCheck className="size-4 shrink-0" strokeWidth={1.6} />
        Easy EMI on cards above ₹25,000, or reserve now and pay at the counter.
      </p>

      <p className="mt-5 text-[12px] leading-relaxed text-stone">
        {product.availability === "in-stock"
          ? "In the showroom now. Reserve it and we hold it for your visit; you pay at the counter."
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
