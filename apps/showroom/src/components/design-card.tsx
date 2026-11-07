import Link from "next/link";
import type { FloorDesign } from "@webfudge/utils/api";
import { formatRupees } from "@webfudge/utils/formatters";
import { mediaUrl } from "@/lib/device";

function priceRange(from: number | null, to: number | null) {
  if (from === null) return "Price at the counter";
  if (to === null || Math.round(from) === Math.round(to)) return formatRupees(from);
  return `${formatRupees(from)} – ${formatRupees(to)}`;
}

export function DesignCard({ design }: { design: FloorDesign }) {
  return (
    <Link href={`/design/${design.id}`} className="group grid content-start gap-3 rounded-xl border border-gray-100 bg-surface p-3 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] motion-reduce:hover:translate-y-0">
      <div className="relative grid aspect-square place-items-center overflow-hidden rounded-lg bg-[radial-gradient(circle_at_50%_40%,var(--color-surface),var(--color-sunk))]">
        {design.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl(design.image.url)} alt={design.name} className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" loading="lazy" />
        ) : (
          <span className="font-mono text-sm tracking-widest text-taupe">{design.code}</span>
        )}
        {design.here === 0 && design.elsewhere > 0 && <span className="absolute top-2 left-2 rounded-lg bg-navy px-2.5 py-1 text-[11px] font-semibold text-white shadow-md">At another branch</span>}
      </div>
      <div className="grid gap-1 px-1">
        <span className="line-clamp-2 text-[15px] leading-snug font-semibold text-ink">{design.name}</span>
        <span className="text-[15px] font-semibold text-navy tabular-nums">{priceRange(design.priceFrom, design.priceTo)}</span>
        <span className="text-[12.5px] text-ash">
          {design.here ? `${design.here} here` : "None here"}
          {design.elsewhere ? ` · ${design.elsewhere} at other branches` : ""} · {design.weightFrom.toFixed(1)}
          {design.weightTo > design.weightFrom ? `–${design.weightTo.toFixed(1)}` : ""} g
        </span>
      </div>
    </Link>
  );
}
