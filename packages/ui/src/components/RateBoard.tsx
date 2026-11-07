import type { RateCard, RateLine } from "@webfudge/utils/api";
import { formatChange, formatDateTime, formatINR } from "@webfudge/utils/formatters";
import { cn } from "../lib/cn";
import { Spinner } from "./Spinner";

type RateBoardProps = {
  card: RateCard | null;
  loading?: boolean;
  error?: string | null;
  /** "strip" for a header band, "table" for a full list, "list" for a narrow sidebar panel. */
  variant?: "strip" | "table" | "list";
  /** Purities to show in the strip, in order. Defaults to every line on the card. */
  only?: RateLine["purity"][];
  className?: string;
};

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-ash">First rate</span>;
  if (value === 0) return <span className="text-ash">No change</span>;
  return <span className={value > 0 ? "text-ok" : "text-risk"}>{formatChange(value)}</span>;
}

/** Today's metal rates, as published from the Back Office. */
export function RateBoard({ card, loading, error, variant = "table", only, className }: RateBoardProps) {
  if (loading && !card) {
    return (
      <div className={cn("flex items-center gap-2 text-[13px] text-ash", variant === "list" && "px-3 py-3 text-[12px]", className)}>
        <Spinner className="size-4" /> Loading today&apos;s rates
      </div>
    );
  }

  if (error && !card) {
    return <p className={cn("text-[13px] text-risk", variant === "list" && "px-3 py-3 text-[12px]", className)}>Rates could not be loaded. {error}</p>;
  }

  if (!card) {
    return <p className={cn("text-[13px] text-ash", variant === "list" && "px-3 py-3 text-[12px]", className)}>No rate has been published yet.</p>;
  }

  const lines = only ? card.rates.filter((line) => only.includes(line.purity)) : card.rates;

  if (variant === "list") {
    return (
      <div className={cn("divide-y divide-gray-100", className)}>
        {lines.map((line) => (
          <div key={line.purity} className="flex items-center justify-between gap-2 px-3 py-2 text-[12px]">
            <span className="text-gray-700">{line.label}</span>
            <span className="grid justify-items-end leading-tight tabular-nums">
              <span className="font-semibold text-ink">{formatINR(line.ratePerGram)}/g</span>
              {line.changePerGram ? (
                <span className={cn("text-[10px]", line.changePerGram > 0 ? "text-ok" : "text-risk")}>{formatChange(line.changePerGram)}</span>
              ) : null}
            </span>
          </div>
        ))}
        <p className="px-3 py-2 text-[10.5px] text-ash">As of {formatDateTime(card.effectiveFrom)}</p>
      </div>
    );
  }

  if (variant === "strip") {
    return (
      <div className={cn("flex flex-wrap items-center gap-x-6 gap-y-1 text-[13px]", className)}>
        {lines.map((line) => (
          <span key={line.purity} className="flex items-baseline gap-1.5 tabular-nums">
            <span className="text-ash">{line.label}</span>
            <span className="font-semibold">{formatINR(line.ratePerGram)}/g</span>
          </span>
        ))}
        <span className="text-[12px] text-ash">as of {formatDateTime(card.effectiveFrom)}</span>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-3", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr className="text-[11.5px] tracking-wide text-gray-700 uppercase">
              <th className="py-2 pr-4 font-bold">Purity</th>
              <th className="py-2 pr-4 text-right font-bold">Rate per gram</th>
              <th className="py-2 text-right font-bold">Change</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.purity} className="border-t border-gray-100">
                <td className="py-2.5 pr-4">{line.label}</td>
                <td className="py-2.5 pr-4 text-right font-semibold tabular-nums">{formatINR(line.ratePerGram)}</td>
                <td className="py-2.5 text-right text-[13px] tabular-nums">
                  <Change value={line.changePerGram} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[12px] text-ash">
        Published {formatDateTime(card.effectiveFrom)}
        {card.setBy ? ` by ${card.setBy}` : ""}
        {card.note ? `. ${card.note}` : ""}
      </p>
    </div>
  );
}
