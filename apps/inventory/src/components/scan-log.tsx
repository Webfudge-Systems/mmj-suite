import type { ScanResult } from "@webfudge/utils/api";

/** Newest-first list of what happened to each scanned code. */
export function ScanLog({ results }: { results: ScanResult[] }) {
  if (!results.length) return <p className="text-[13px] text-ash">Scanned pieces appear here.</p>;
  const placed = results.filter((result) => result.ok).length;
  return (
    <div className="grid gap-2">
      <p className="text-[13px] text-ash">
        {placed} done, {results.length - placed} need attention
      </p>
      <ul className="grid max-h-80 gap-1 overflow-y-auto">
        {results.map((result, index) => (
          <li
            key={`${result.code}-${index}`}
            className={`flex flex-wrap items-baseline gap-x-3 rounded-md px-3 py-1.5 text-[13px] ${result.ok ? "bg-ok-soft" : "bg-risk-soft"}`}
          >
            <span className="font-mono font-semibold">{result.tagNumber ?? result.code}</span>
            <span className={result.ok ? "text-ok" : "text-risk"}>{result.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
