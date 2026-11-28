import { Fold } from "@/components/ui/Fold";
import { formatWeight } from "@/lib/utils";
import type { Product } from "@/types";

/** About, weights, stones, specification and care, each in its own rounded fold. */
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
    <div className="space-y-3">
      <Fold title="About this piece" defaultOpen>
        <div className="space-y-3">
          {product.description.map((paragraph) => (
            <p key={paragraph} className="text-[13px] leading-relaxed text-ash">
              {paragraph}
            </p>
          ))}
        </div>
      </Fold>

      <Fold title="Weight and purity">
        <dl className="grid grid-cols-2 gap-2">
          {weights.map((entry) => (
            <div key={entry.label} className="rounded-xl bg-paper px-4 py-3.5">
              <dt className="text-[11px] text-stone">{entry.label}</dt>
              <dd className="mt-1 text-[15px] font-semibold tabular-nums text-ink">{entry.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[11px] leading-relaxed text-stone">
          Hallmarked {product.hallmark.bis ? "BIS" : "in house"}. HUID{" "}
          <span className="tabular-nums text-ash">{product.hallmark.huid}</span>. Design{" "}
          <span className="tabular-nums text-ash">{product.designNumber}</span>.
        </p>
      </Fold>

      {product.stones && product.stones.length > 0 && (
        <Fold title="Stones">
          <ul className="space-y-2">
            {product.stones.map((stone) => (
              <li key={stone.type} className="rounded-xl bg-paper px-4 py-3 text-[13px]">
                <p className="font-semibold capitalize text-ink">{stone.type}</p>
                <p className="mt-0.5 text-[12px] text-ash">
                  {stone.count} {stone.count === 1 ? "stone" : "stones"}, {stone.carat.toFixed(2)} ct
                  {stone.clarity ? `, clarity ${stone.clarity}` : ""}
                  {stone.colour ? `, colour ${stone.colour}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Fold>
      )}

      <Fold title="Specification">
        <dl className="divide-y divide-line">
          {product.specs.map((spec) => (
            <div key={spec.label} className="flex gap-4 py-3 text-[13px]">
              <dt className="w-32 shrink-0 text-stone">{spec.label}</dt>
              <dd className="text-ink">{spec.value}</dd>
            </div>
          ))}
        </dl>
      </Fold>

      <Fold title="Care">
        <ul className="space-y-3">
          {product.care.map((note) => (
            <li key={note} className="flex gap-3 text-[13px] leading-relaxed text-ash">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
              {note}
            </li>
          ))}
        </ul>
      </Fold>
    </div>
  );
}
