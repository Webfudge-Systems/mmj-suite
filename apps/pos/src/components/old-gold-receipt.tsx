import { PrintBox, PrintSheet } from "@webfudge/ui";
import { PAYMENT_MODE_LABELS, type OldGoldDetail } from "@webfudge/utils/api";
import { formatDate, formatDateTime } from "@webfudge/utils/formatters";
import { inWords } from "@/components/advance-receipt";

const money = (value: number) => value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const grams = (value: number) => value.toFixed(3);

/**
 * The receipt for old gold or silver bought from a customer, on a full A4 page in
 * the same style as the tax invoice: what was weighed and tested, how it was
 * valued, how the customer was paid, and the seller's declaration.
 */
export function OldGoldReceipt({ record }: { record: OldGoldDetail }) {
  const cell = "border border-navy/30 px-1.5 py-1 align-top";
  const head = `${cell} bg-navy/[0.07] text-center font-semibold text-navy`;
  const num = `${cell} text-right tabular-nums`;
  const lines = record.lines;
  const sum = (pick: (line: (typeof lines)[number]) => number) => lines.reduce((total, line) => total + pick(line), 0);
  const exchange = record.kind === "exchange";
  const rates = [...new Map(lines.map((line) => [line.metal, line.pureRate])).entries()];

  return (
    <PrintSheet
      logoSrc="/brand/mmj-mark.png"
      seller={record.seller}
      title={exchange ? "Old gold exchange" : "Old gold purchase"}
      facts={[
        { label: "Receipt no.", value: <span className="font-mono">{record.number}</span> },
        { label: "Date · Time", value: formatDateTime(record.createdAt) },
        { label: exchange ? "Against invoice" : "Branch · Valued by", value: exchange ? <span className="font-mono">{record.invoice?.number ?? "—"}</span> : [record.branch?.name, record.by].filter(Boolean).join(" · ") || "—" },
      ]}
      signatures={[`Seller's signature · ${record.customer?.name ?? ""}`, `Purchased by${record.by ? ` · ${record.by}` : ""}`]}
      terms={
        <p>
          <b className="text-black">Terms:</b> Old metal is valued on the day&apos;s 24KT gold or 999 silver rate on the purity found by testing at the counter, less the shop&apos;s deduction
          shown above. The value is final once paid. The seller&apos;s ID proof is kept on record as the law requires. Subject to local jurisdiction. E&amp;OE.
        </p>
      }
    >
      <section className="grid grid-cols-2 gap-3">
        <PrintBox
          title="Bought from"
          rows={[
            ["Name", record.customer?.name],
            ["Address", record.customer?.address],
            ["Mobile", record.customer?.phone],
            ["PAN", record.customer?.pan || "Not given"],
            ["ID proof", record.idProof],
          ]}
        />
        <PrintBox
          title="Valuation"
          rows={[
            ["Type", exchange ? `Exchange against invoice ${record.invoice?.number ?? ""}` : "Bought outright"],
            ...rates.map(([metal, rate]): [string, string] => [metal === "silver" ? "Silver 999 rate" : "Gold 24KT rate", `₹${money(rate)} per gram on ${formatDate(record.createdAt)}`]),
            ["Branch", record.branch?.name],
          ]}
        />
      </section>

      <table className="w-full border-collapse text-[9.5px] tabular-nums">
        <thead>
          <tr>
            <th className={head}>Sr.</th>
            <th className={`${head} text-left`}>Description</th>
            <th className={head}>Metal</th>
            <th className={head}>Gross wt (g)</th>
            <th className={head}>Less wt (g)</th>
            <th className={head}>Net wt (g)</th>
            <th className={head}>Tested purity</th>
            <th className={head}>Fine wt (g)</th>
            <th className={head}>Rate /g (₹)</th>
            <th className={head}>Deduction</th>
            <th className={head}>Value (₹)</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={index}>
              <td className={`${cell} text-center`}>{index + 1}</td>
              <td className={`${cell} font-semibold`}>{line.description}</td>
              <td className={`${cell} text-center`}>{line.metal === "silver" ? "Silver" : "Gold"}</td>
              <td className={num}>{grams(line.grossWeight)}</td>
              <td className={num}>{grams(line.lessWeight)}</td>
              <td className={num}>{grams(line.netWeight)}</td>
              <td className={`${cell} text-center`}>{line.fineness}</td>
              <td className={num}>{grams(line.fineWeight)}</td>
              <td className={num}>{money(line.pureRate)}</td>
              <td className={`${cell} text-center`}>{line.deductionPercent}%</td>
              <td className={`${num} font-semibold`}>{money(line.value)}</td>
            </tr>
          ))}
          <tr className="bg-navy/[0.04] font-bold">
            <td className={cell} />
            <td className={cell} colSpan={2}>
              Total · {lines.length} {lines.length === 1 ? "item" : "items"}
            </td>
            <td className={num}>{grams(sum((line) => line.grossWeight))}</td>
            <td className={num}>{grams(sum((line) => line.lessWeight))}</td>
            <td className={num}>{grams(sum((line) => line.netWeight))}</td>
            <td className={cell} />
            <td className={num}>{grams(sum((line) => line.fineWeight))}</td>
            <td className={cell} />
            <td className={cell} />
            <td className={num}>{money(record.totalValue)}</td>
          </tr>
        </tbody>
      </table>

      <section className="grid grid-cols-[1fr_68mm] gap-3">
        <div className="grid content-start gap-2">
          {exchange ? (
            <p className="rounded-md border border-navy/20 bg-navy/[0.03] px-2.5 py-1.5">
              <b>Adjusted:</b> the value above was taken off tax invoice <span className="font-mono">{record.invoice?.number}</span>. No cash was paid out.
            </p>
          ) : (
            <table className="w-full border-collapse text-[9.5px] tabular-nums">
              <thead>
                <tr>
                  <th className={`${head} text-left`}>Paid by</th>
                  <th className={`${head} text-left`}>Reference no.</th>
                  <th className={head}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {record.payouts.map((payout, index) => (
                  <tr key={index}>
                    <td className={cell}>{PAYMENT_MODE_LABELS[payout.mode]}</td>
                    <td className={`${cell} font-mono`}>{payout.reference || "—"}</td>
                    <td className={num}>{money(payout.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="rounded-md border border-navy/20 bg-navy/[0.03] px-2.5 py-1.5">
            <b>Amount in words:</b> {inWords(record.totalValue)}
          </p>
          {record.cashOverride && (
            <p className="text-[9px] text-ash">
              Cash of ₹{money(record.cashOverride.cash)} above the ₹{money(record.cashOverride.limit)} limit approved by {record.cashOverride.approvedBy}: {record.cashOverride.reason}
            </p>
          )}
        </div>
        <table className="w-full self-start border-collapse tabular-nums">
          <tbody>
            <tr>
              <td className={cell}>Fine gold</td>
              <td className={num}>{grams(sum((line) => (line.metal === "silver" ? 0 : line.fineWeight)))} g</td>
            </tr>
            <tr>
              <td className={cell}>Fine silver</td>
              <td className={num}>{grams(sum((line) => (line.metal === "silver" ? line.fineWeight : 0)))} g</td>
            </tr>
            <tr className="bg-navy text-white">
              <td className={`${cell} border-navy font-bold`}>{exchange ? "Value adjusted" : "Paid to seller"}</td>
              <td className={`${num} border-navy text-[11px] font-bold`}>₹{money(record.totalValue)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <p className="rounded-md border border-navy/20 px-2.5 py-1.5 font-semibold">
        I declare that I am the lawful owner of the articles above, that they are free of any claim, and that I have sold them of my own free will. I accept the weights,
        tested purity and value stated, and have received the amount in full.
      </p>
    </PrintSheet>
  );
}
