"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { NewBadge, SaleBadge, discountPercent } from "@/components/ui/Badge";
import { useWishlist } from "@/store/wishlist";
import { useHydrated } from "@/store/ui";
import type { Product } from "@/types";
import { cn, formatPrice, formatWeight } from "@/lib/utils";

/**
 * The reference card is a plain square tile on cream: image, name, weight line,
 * price. Badges and the wishlist heart sit over the image corners.
 */
export function ProductCard({
  product,
  priority = false,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
}: {
  product: Product;
  priority?: boolean;
  sizes?: string;
}) {
  const hydrated = useHydrated();
  const { slugs, toggle } = useWishlist();
  const saved = hydrated && slugs.includes(product.slug);
  const discount = discountPercent(product.price, product.compareAtPrice);
  const hover = product.images[1];

  return (
    <article className="group relative">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-cream-deep">
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            priority={priority}
            sizes={sizes}
            className={cn(
              "object-cover transition-opacity duration-500 ease-[var(--ease-out-soft)]",
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

          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {discount && <SaleBadge percent={discount} />}
            {product.isNew && !discount && <NewBadge />}
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={() => toggle(product.slug)}
        aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name}`}
        aria-pressed={saved}
        className="absolute right-3 top-3 grid size-8 place-items-center bg-cream/85 text-ink backdrop-blur transition-colors hover:bg-cream"
      >
        <Heart className={cn("size-3.5", saved && "fill-wine text-wine")} />
      </button>

      <Link href={`/products/${product.slug}`} className="mt-4 block">
        <h3 className="text-[13px] leading-snug text-ink normal-case tracking-normal">
          {product.name}
        </h3>
        <p className="eyebrow mt-1.5 text-[9px] text-stone">
          {product.purity} &middot; {formatWeight(product.grossWeight)}
        </p>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="text-[14px] tabular-nums text-ink">{formatPrice(product.price)}</span>
          {product.compareAtPrice && (
            <span className="text-[11px] tabular-nums text-stone line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </p>
      </Link>
    </article>
  );
}
