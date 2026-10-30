import { rateFor, rateUpdatedOn } from "@/data/rates";
import { priceBreakup } from "@/lib/pricing";
import { formatDate, formatPrice, formatWeight } from "@/lib/utils";
import type { Product } from "@/types";

/**
 * The estimate the counter prints. Shown in full because a jeweller earns trust
 * by letting you check the arithmetic yourself.
 */
export function PriceBreakup({ product }: { product: Product }) {
  const breakup = priceBreakup(product);
  const rate = rateFor(product.metal, product.purity);

  const rows = [
    {
      label: `${product.purity} ${metalName(product)} value`,
      note: `${formatWeight(product.netWeight)} net at ${formatPrice(rate)}/g`,
      value: breakup.metalValue,
    },
    {
      label: "Making charge",
      note: `${product.makingChargePercent}% of metal value`,
      value: breakup.makingCharge,
    },
    ...(breakup.stoneCost > 0
      ? [
          {
            label: "Stone value",
            note: stoneNote(product),
            value: breakup.stoneCost,
          },
        ]
      : []),
    { label: "Hallmarking", note: "BIS charge per piece", value: breakup.hallmarkCharge },
    {
      label: "GST",
      note: breakup.stoneCost > 0 ? "3% metal and making, 18% stones" : "3% on metal and making",
      value: breakup.gst,
    },
  ];

  return (
    <div className="border border-line bg-paper p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="eyebrow text-[10px]">Price breakup</h2>
        <p className="text-[11px] text-stone">
          Rate as on {formatDate(rateUpdatedOn)}
        </p>
      </div>

      <table className="mt-6 w-full text-[13px]">
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row" className="py-3.5 pr-4 text-left font-normal align-top">
                <span className="block text-ink">{row.label}</span>
                <span className="mt-0.5 block text-[11px] text-stone">{row.note}</span>
              </th>
              <td className="py-3.5 text-right align-top tabular-nums text-ink">
                {formatPrice(Math.round(row.value))}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-ink">
            <th scope="row" className="pt-4 text-left">
              <span className="eyebrow text-[10px]">Total</span>
            </th>
            <td className="pt-4 text-right text-[17px] tabular-nums text-ink">
              {formatPrice(product.price)}
            </td>
          </tr>
        </tfoot>
      </table>

      <p className="mt-6 text-[11px] leading-relaxed text-stone">
        Weights are measured on a calibrated balance and may vary by up to 2% on
        made-to-order pieces. The rate is fixed at the moment you confirm the order.
      </p>
    </div>
  );
}

function metalName(product: Product) {
  if (product.metal === "bullion") return "gold";
  return product.metal === "diamond" ? "gold" : product.metal;
}

function stoneNote(product: Product) {
  if (!product.stones?.length) return "Billed separately from the metal";
  const carat = product.stones.reduce((sum, stone) => sum + stone.carat, 0);
  const count = product.stones.reduce((sum, stone) => sum + stone.count, 0);
  return `${count} ${count === 1 ? "stone" : "stones"}, ${carat.toFixed(2)} ct total`;
}
