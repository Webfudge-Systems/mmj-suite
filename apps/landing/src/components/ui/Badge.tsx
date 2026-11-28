import { cn } from "@/lib/utils";
import type { Availability } from "@/types";

export function SaleBadge({ percent }: { percent: number }) {
  return (
    <span className="bg-mist px-2 py-1 text-[11px] font-semibold leading-none text-wine">
      &minus;{percent}%
    </span>
  );
}

export function NewBadge() {
  return (
    <span className="eyebrow bg-gold px-2.5 py-1 text-[9px] leading-none text-ink">New</span>
  );
}

/** Every piece is BIS hallmarked; the reference shows trust marks on the card. */
export function HallmarkBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "rounded-full border border-wine/20 bg-mist px-3 py-1 text-[11px] leading-none text-wine",
        className,
      )}
    >
      BIS hallmarked
    </span>
  );
}

export function StockDot({
  availability,
  className,
}: {
  availability: Availability;
  className?: string;
}) {
  const inStock = availability === "in-stock";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[12px] text-ash", className)}>
      <span
        className={cn("size-1.5 rounded-full", inStock ? "bg-stock" : "bg-stone")}
        aria-hidden
      />
      {inStock ? "In stock" : "Made to order"}
    </span>
  );
}

export function discountPercent(price: number, compareAtPrice?: number) {
  if (!compareAtPrice || compareAtPrice <= price) return null;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}
