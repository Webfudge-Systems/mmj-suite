import { brand } from "@webfudge/config";
import type { JobWorkDetail } from "@webfudge/utils/api";
import { formatDate, formatDateTime } from "@webfudge/utils/formatters";

const g = (value: number) => `${value.toFixed(3)} g`;
const METAL_NAMES: Record<string, string> = { gold: "Gold", silver: "Silver", platinum: "Platinum" };

/**
 * The paper slip that goes with the karigar: what to make, every lot of metal and
 * stones handed over, and signatures. Hidden on screen; it is what prints.
 */
export function KarigarNote({ job }: { job: JobWorkDetail }) {
  const metals = job.issues.filter((issue) => issue.kind !== "stone");
  const stones = job.issues.filter((issue) => issue.kind === "stone");
  const cell = "border border-black/40 px-2 py-1";

  return (
    <article className="karigar-note hidden text-[11.5px] leading-snug text-black print:block">
      <style>{`@media print { @page { size: A5; margin: 10mm; } }`}</style>
      <header className="flex items-start justify-between border-b-2 border-black pb-2">
        <div>
          <p className="text-[16px] font-bold">{brand.name}</p>
          <p>{job.branch?.name}</p>
        </div>
        <div className="text-right">
          <p className="text-[14px] font-bold tracking-wide uppercase">Karigar note</p>
          <p className="font-mono text-[13px] font-bold">{job.number}</p>
          <p>{formatDate(job.createdAt)}</p>
        </div>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
        <div>
          <dt className="inline font-bold">Karigar: </dt>
          <dd className="inline">{job.karigar?.name}</dd>
        </div>
        <div>
          <dt className="inline font-bold">Phone: </dt>
          <dd className="inline">{job.karigar?.phone ?? "—"}</dd>
        </div>
        <div>
          <dt className="inline font-bold">Due back: </dt>
          <dd className="inline">{job.dueOn ? formatDate(job.dueOn) : "—"}</dd>
        </div>
        <div>
          <dt className="inline font-bold">Wastage allowed: </dt>
          <dd className="inline">{job.wastagePercent}%</dd>
        </div>
      </dl>

      <section className="mt-3">
        <p className="font-bold">Work to be made</p>
        <p className="mt-1 min-h-10 whitespace-pre-line rounded border border-black/40 p-2">{job.description || "—"}</p>
      </section>

      <section className="mt-3">
        <p className="font-bold">Metal given</p>
        <table className="mt-1 w-full border-collapse">
          <thead>
            <tr>
              <th className={`${cell} text-left`}>Date</th>
              <th className={`${cell} text-left`}>Purity</th>
              <th className={`${cell} text-right`}>Gross</th>
              <th className={`${cell} text-right`}>Fine</th>
              <th className={`${cell} text-left`}>Note</th>
            </tr>
          </thead>
          <tbody>
            {metals.map((issue, index) => (
              <tr key={`m-${index}`}>
                <td className={cell}>{formatDateTime(issue.at)}</td>
                <td className={cell}>{issue.purity}</td>
                <td className={`${cell} text-right tabular-nums`}>{g(Number(issue.grossWeight ?? 0))}</td>
                <td className={`${cell} text-right tabular-nums`}>{g(Number(issue.fineWeight ?? 0))}</td>
                <td className={cell}>{issue.note ?? ""}</td>
              </tr>
            ))}
            {!metals.length && (
              <tr>
                <td className={cell} colSpan={5}>
                  No metal given yet.
                </td>
              </tr>
            )}
          </tbody>
          {job.account.byMetal.length > 0 && (
            <tfoot>
              {job.account.byMetal.map((entry) => (
                <tr key={entry.metal} className="font-bold">
                  <td className={cell} colSpan={2}>
                    Total {METAL_NAMES[entry.metal] ?? entry.metal}
                  </td>
                  <td className={`${cell} text-right tabular-nums`}>{g(entry.issuedGross)}</td>
                  <td className={`${cell} text-right tabular-nums`}>{g(entry.issuedFine)}</td>
                  <td className={cell} />
                </tr>
              ))}
            </tfoot>
          )}
        </table>
      </section>

      {stones.length > 0 && (
        <section className="mt-3">
          <p className="font-bold">Stones given</p>
          <table className="mt-1 w-full border-collapse">
            <thead>
              <tr>
                <th className={`${cell} text-left`}>Stone</th>
                <th className={`${cell} text-right`}>Pieces</th>
                <th className={`${cell} text-right`}>Weight</th>
                <th className={`${cell} text-left`}>Note</th>
              </tr>
            </thead>
            <tbody>
              {stones.map((issue, index) => (
                <tr key={`s-${index}`}>
                  <td className={cell}>{issue.name}</td>
                  <td className={`${cell} text-right tabular-nums`}>{issue.pieces || "—"}</td>
                  <td className={`${cell} text-right tabular-nums`}>{issue.weight ? `${issue.weight} ${issue.unit}` : "—"}</td>
                  <td className={cell}>{issue.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <p className="mt-3">
        The karigar returns finished pieces and any metal or stones left over against this note. Fine weight is worked out from purity; wastage is allowed only on fine metal in the pieces returned.
      </p>

      <footer className="mt-10 grid grid-cols-2 gap-10">
        <div className="border-t border-black pt-1 text-center">Given by ({brand.shortName})</div>
        <div className="border-t border-black pt-1 text-center">Received by karigar</div>
      </footer>
    </article>
  );
}
