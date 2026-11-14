import { formatPrice, formatWeight } from "@/lib/utils";
import type { LivePiece } from "@/types";

/**
 * The actual pieces in the showroom today, each weighed and priced at today's
 * rate. Jewellery is never two pieces alike, so the customer sees the range.
 */
export function LivePieces({ pieces }: { pieces: LivePiece[] }) {
  return (
    <div className="mt-9 border-t border-line pt-7">
      <h2 className="eyebrow text-[9px] text-stone">
        In the showroom today &middot; {pieces.length} {pieces.length === 1 ? "piece" : "pieces"}
      </h2>
      <ul className="mt-4 divide-y divide-line border border-line">
        {pieces.map((piece) => (
          <li key={piece.tag} className="flex items-center gap-3 px-4 py-3 text-[13px]">
            {piece.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={piece.photo} alt="" className="size-11 shrink-0 object-cover" loading="lazy" />
            ) : (
              <span className="size-11 shrink-0 bg-cream-deep" aria-hidden />
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-ink tabular-nums">
                {piece.purity} &middot; {formatWeight(piece.grossWeight)}
              </span>
              <span className="mt-0.5 block text-[11px] text-stone">
                Tag {piece.tag}
                {piece.branch ? ` · ${piece.branch}` : ""}
              </span>
            </span>
            <span className="shrink-0 tabular-nums text-ink">{piece.price ? formatPrice(piece.price) : "Ask us"}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] leading-relaxed text-stone">
        Add to bag and reserve, and tell us the tag you like in the note. We hold it for your visit.
      </p>
    </div>
  );
}
