import { formatWeight } from "@/lib/utils";
import type { Product } from "@/types";

/** Weight card, stone table, spec list and care notes, in one column. */
export function ProductDetails({ product }: { product: Product }) {
  const weights = [
    { label: "Gross weight", value: formatWeight(product.grossWeight) },
    { label: "Net metal weight", value: formatWeight(product.netWeight) },
    ...(product.stoneWeight
      ? [{ label: "Stone weight", value: formatWeight(product.stoneWeight) }]
      : []),
    { label: "Purity", value: product.purity },
  ];

  return (
    <div className="space-y-12">
      <section>
        <h2 className="eyebrow text-[10px]">Weight and purity</h2>
        <dl className="mt-5 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
          {weights.map((entry) => (
            <div key={entry.label} className="bg-paper px-5 py-6">
              <dt className="eyebrow text-[8px] text-stone">{entry.label}</dt>
              <dd className="mt-2.5 text-[15px] tabular-nums text-ink">{entry.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[11px] text-stone">
          Hallmarked {product.hallmark.bis ? "BIS" : "in house"} &middot; HUID{" "}
          <span className="tabular-nums text-ash">{product.hallmark.huid}</span> &middot; Design{" "}
          <span className="tabular-nums text-ash">{product.designNumber}</span>
        </p>
      </section>

      {product.stones && product.stones.length > 0 && (
        <section>
          <h2 className="eyebrow text-[10px]">Stones</h2>
          <table className="mt-5 w-full text-[13px]">
            <thead>
              <tr className="border-b border-line">
                {["Stone", "Count", "Carat", "Clarity", "Colour"].map((head) => (
                  <th
                    key={head}
                    scope="col"
                    className="eyebrow py-3 text-left text-[8px] font-normal text-stone last:text-right"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {product.stones.map((stone) => (
                <tr key={stone.type}>
                  <td className="py-3.5 capitalize text-ink">{stone.type}</td>
                  <td className="py-3.5 tabular-nums text-ash">{stone.count}</td>
                  <td className="py-3.5 tabular-nums text-ash">{stone.carat.toFixed(2)}</td>
                  <td className="py-3.5 text-ash">{stone.clarity ?? "—"}</td>
                  <td className="py-3.5 text-right text-ash">{stone.colour ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section>
        <h2 className="eyebrow text-[10px]">Specification</h2>
        <dl className="mt-5 divide-y divide-line border-y border-line">
          {product.specs.map((spec) => (
            <div key={spec.label} className="flex gap-6 py-3.5 text-[13px]">
              <dt className="w-40 shrink-0 text-stone">{spec.label}</dt>
              <dd className="text-ink">{spec.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="eyebrow text-[10px]">Care</h2>
        <ul className="mt-5 space-y-3">
          {product.care.map((note) => (
            <li key={note} className="flex gap-3 text-[13px] leading-relaxed text-ash">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-gold" aria-hidden />
              {note}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
