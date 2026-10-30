"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { useCart } from "@/store/cart";
import type { ResolvedLine } from "@/lib/cart";
import { formatPrice, formatWeight } from "@/lib/utils";

export function CartLines({
  lines,
  onNavigate,
  compact = false,
}: {
  lines: ResolvedLine[];
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const { remove, setQuantity } = useCart();

  return (
    <ul className="divide-y divide-line">
      {lines.map((line) => (
        <li key={`${line.slug}-${line.size ?? "one"}`} className="flex gap-4 py-5">
          <Link
            href={`/products/${line.slug}`}
            onClick={onNavigate}
            className="relative size-20 shrink-0 overflow-hidden bg-cream-deep sm:size-24"
          >
            <Image
              src={line.product.images[0]}
              alt={line.product.name}
              fill
              sizes="96px"
              className="object-cover"
            />
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/products/${line.slug}`}
                  onClick={onNavigate}
                  className="block truncate text-[14px] text-ink hover:underline"
                >
                  {line.product.name}
                </Link>
                <p className="eyebrow mt-1 text-[9px] text-stone">
                  {line.product.purity} &middot; {formatWeight(line.product.grossWeight)}
                  {line.size && ` · size ${line.size}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(line.slug, line.size)}
                aria-label={`Remove ${line.product.name}`}
                className="shrink-0 text-stone transition-colors hover:text-wine"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-3 flex items-end justify-between gap-3">
              <QuantityStepper
                value={line.quantity}
                onChange={(next) => setQuantity(line.slug, next, line.size)}
              />
              <div className="text-right">
                <p className="text-[14px] tabular-nums text-ink">
                  {formatPrice(line.product.price * line.quantity)}
                </p>
                {!compact && line.product.compareAtPrice && (
                  <p className="text-[11px] tabular-nums text-stone line-through">
                    {formatPrice(line.product.compareAtPrice * line.quantity)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
