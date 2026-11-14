"use client";

import { cartTotals, type ResolvedLine } from "@/lib/cart";
import { cn, formatPrice, formatWeight } from "@/lib/utils";

/** Shared totals block for the bag and the checkout column. */
export function OrderSummary({
  lines,
  className,
  children,
}: {
  lines: ResolvedLine[];
  className?: string;
  children?: React.ReactNode;
}) {
  const totals = cartTotals(lines);

  const rows = [
    { label: `Subtotal (${totals.count} ${totals.count === 1 ? "item" : "items"})`, value: formatPrice(totals.subtotal) },
    ...(totals.saving > 0
      ? [{ label: "Festive saving", value: `− ${formatPrice(totals.saving)}`, tone: "stock" as const }]
      : []),
    { label: "Gross weight", value: formatWeight(totals.grossWeight), muted: true },
  ];

  return (
    <div className={cn("border border-line bg-paper p-6 sm:p-8", className)}>
      <h2 className="eyebrow text-[10px]">Estimate</h2>

      <dl className="mt-6 space-y-3.5 text-[13px]">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4">
            <dt className={row.muted ? "text-stone" : "text-ash"}>{row.label}</dt>
            <dd
              className={cn(
                "tabular-nums",
                row.tone === "stock" ? "text-stock" : row.muted ? "text-stone" : "text-ink",
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-ink pt-5">
        <span className="eyebrow text-[10px]">Total</span>
        <span className="text-[19px] tabular-nums text-ink">{formatPrice(totals.total)}</span>
      </div>
      <p className="mt-2 text-[11px] text-stone">
        At today&apos;s rate, with GST and hallmarking. Confirmed when you visit.
      </p>

      {children}
    </div>
  );
}
