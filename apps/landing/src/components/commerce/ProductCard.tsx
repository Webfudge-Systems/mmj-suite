"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Heart, ShoppingBag } from "lucide-react";
import { discountPercent } from "@/components/ui/Badge";
import { useWishlist } from "@/store/wishlist";
import { useCart } from "@/store/cart";
import { useHydrated, useUi } from "@/store/ui";
import type { Product } from "@/types";
import { cn, formatPrice, formatWeight } from "@/lib/utils";

/** What the small tag in the image corner says, most specific first. */
function cardLabel(product: Product) {
  if (product.isNew) return "New";
  if (product.bestseller) return "Bestseller";
  if (product.availability === "made-to-order") return "Made to order";
  return null;
}

/** Metal line shown at the foot of the image, like "White gold" on the reference. */
export function metalLabel(product: Product) {
  switch (product.metal) {
    case "gold":
      return `${product.purity} gold`;
    case "diamond":
      return `${product.purity} diamond`;
    case "silver":
      return "925 silver";
    case "platinum":
      return "Platinum 950";
    case "bullion":
      return "Fine gold";
  }
}

export function priceText(product: Product) {
  if (product.live?.priceOnRequest) return "Price on request";
  if (product.live?.priceTo && product.live.priceTo > product.price) {
    return `From ${formatPrice(product.price)}`;
  }
  return formatPrice(product.price);
}

/**
 * Bordered card: a soft grey image well with the tag, heart and metal line,
 * then a white panel with the name, price, discount chip and a quick-add bag.
 */
export function ProductCard({
  product,
  priority = false,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
  className,
}: {
  product: Product;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  const hydrated = useHydrated();
  const { slugs, toggle } = useWishlist();
  const add = useCart((state) => state.add);
  const openCart = useUi((state) => state.openCart);
  const [added, setAdded] = useState(false);
  const saved = hydrated && slugs.includes(product.slug);
  const discount = discountPercent(product.price, product.compareAtPrice);
  const hover = product.images[1];
  const label = cardLabel(product);
  const canQuickAdd = !product.live?.priceOnRequest;

  const quickAdd = () => {
    add(product.slug, 1, product.sizes?.[0]);
    setAdded(true);
    openCart();
    window.setTimeout(() => setAdded(false), 1800);
  };

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col rounded-2xl border border-line bg-paper transition-shadow duration-300 hover:shadow-[0_18px_40px_-28px_rgba(10,40,116,0.45)]",
        className,
      )}
    >
      <Link href={`/products/${product.slug}`} className="block" tabIndex={-1} aria-hidden>
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-fog">
          <Image
            src={product.images[0]}
            alt=""
            fill
            priority={priority}
            sizes={sizes}
            className={cn(
              "object-cover transition duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.03]",
              hover && "group-hover:opacity-0",
            )}
          />
          {hover && (
            <Image
              src={hover}
              alt=""
              fill
              sizes={sizes}
              className="object-cover opacity-0 transition-opacity duration-500 ease-[var(--ease-out-soft)] group-hover:opacity-100"
            />
          )}

          {label && (
            <span className="eyebrow absolute left-3 top-3 bg-paper/90 px-2 py-1 text-[9px] text-wine">
              {label}
            </span>
          )}
          <span className="eyebrow absolute bottom-3 left-3 text-[9px] text-ink/70">
            {metalLabel(product)}
          </span>
        </div>
      </Link>

      <button
        type="button"
        onClick={() => toggle(product.slug)}
        aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name}`}
        aria-pressed={saved}
        className="absolute right-2 top-2 grid size-9 place-items-center rounded-full text-ink transition-colors hover:bg-paper/80"
      >
        <Heart className={cn("size-4", saved && "fill-wine text-wine")} strokeWidth={1.6} />
      </button>

      <div className="flex flex-1 flex-col border-t border-line p-4">
        <Link href={`/products/${product.slug}`} className="block">
          <h3 className="heading-sans line-clamp-2 text-[13px] text-ink transition-colors group-hover:text-wine">
            {product.name}
          </h3>
        </Link>
        <p className="mt-1 text-[11px] text-stone">{formatWeight(product.grossWeight)} gross</p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <p className="flex flex-wrap items-baseline gap-x-2">
            {product.compareAtPrice && (
              <span className="text-[12px] tabular-nums text-stone line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
            <span className="text-[14px] font-semibold tabular-nums text-ink">{priceText(product)}</span>
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {discount && (
              <span className="bg-mist px-1.5 py-0.5 text-[10px] font-semibold text-wine">
                &minus;{discount}%
              </span>
            )}
            {canQuickAdd && (
              <button
                type="button"
                onClick={quickAdd}
                aria-label={`Add ${product.name} to bag`}
                className="grid size-8 place-items-center rounded-full border border-line text-ink transition-colors hover:border-wine hover:bg-wine hover:text-cream"
              >
                {added ? <Check className="size-3.5" /> : <ShoppingBag className="size-3.5" strokeWidth={1.6} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
