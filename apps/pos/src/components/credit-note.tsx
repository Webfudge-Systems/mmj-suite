import { PrintBox, PrintSheet } from "@webfudge/ui";
import { PAYMENT_MODE_LABELS, type CreditNoteDetail } from "@webfudge/utils/api";
import { formatDate, formatDateTime } from "@webfudge/utils/formatters";

export const CREDIT_STATUS = {
  open: { label: "Open", tone: "gold" },
  used: { label: "Used", tone: "ok" },
  refunded: { label: "Paid out", tone: "neutral" },
} as const;

const money = (value: number) => value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * The credit note on a full A4 page: what came back, what it was paid, the
 * deduction, the credit given, and every use or payout since. When paid out it
 * doubles as proof of the money handed back to the customer.
 */
export function CreditNoteDocument({ note }: { note: CreditNoteDetail }) {
  const cell = "border border-navy/30 px-2 py-1.5 align-top";
  const head = `${cell} bg-navy/[0.07] text-left font-semibold text-navy`;
  const pieces = note.lines.filter((line) => line.tagNumber || line.description);
  const paidBack = (note.refunds ?? []).reduce((sum, refund) => sum + refund.amount, 0);
  const usedOnBills = (note.usage ?? []).reduce((sum, use) => sum + use.amount, 0);

  return (
    <PrintSheet
      logoSrc="/brand/mmj-mark.png"
      seller={note.seller}
      title="Credit note"
      facts={[
        { label: "Credit note no.", value: <span className="font-mono">{note.number}</span> },
        { label: "Date · Time", value: formatDateTime(note.createdAt) },
        { label: "Against invoice", value: note.invoice ? <span className="font-mono">{note.invoice.number}</span> : "—" },
      ]}
      stamp={note.status === "refunded" ? { text: "PAID OUT", tone: "ok" } : note.status === "used" ? { text: "USED", tone: "neutral" } : undefined}
      signatures={[`Customer signature · ${note.customer?.name ?? ""}`, `Authorised signatory${note.by ? ` · ${note.by}` : ""}`]}
      terms={
        <p>
          <b className="text-black">Terms:</b> This credit note can be used against any purchase from {note.seller.tradeName || note.seller.name} or paid out by the owner or branch manager. It is
          issued for pieces returned against the invoice shown, less the return deduction. GST on the original invoice is adjusted in the shop&apos;s returns. Keep this note
          safe; bring it when you buy or collect the money.
        </p>
      }
    >
      <section className="grid grid-cols-2 gap-3">
        <PrintBox
          title="Issued to"
          rows={[
            ["Name", note.customer?.name],
            ["Address", note.customer?.address],
            ["Mobile", note.customer?.phone],
            ["PAN", note.customer?.pan || "Not given"],
          ]}
        />
        <PrintBox
          title="Return details"
          rows={[
            ["Original invoice", note.invoice ? `${note.invoice.number}, ${formatDate(note.invoice.invoiceDate)}` : "—"],
            ["Reason", note.reason],
            ["Return deduction", `${note.deductionPercent}%`],
            ["Branch", note.branch?.name],
          ]}
        />
      </section>

      <table className="w-full border-collapse tabular-nums">
        <thead>
          <tr>
            <th className={head}>Sr.</th>
            <th className={head}>Piece returned</th>
            <th className={`${head} text-right`}>Paid on invoice (₹)</th>
            <th className={`${head} text-right`}>Credit given (₹)</th>
          </tr>
        </thead>
        <tbody>
          {(pieces.length ? pieces : note.lines).map((line, index) => (
            <tr key={index}>
              <td className={cell}>{index + 1}</td>
              <td className={cell}>
                <span className="font-semibold">{line.description || (line.kind === "cancellation" ? `Invoice ${line.invoice ?? ""} cancelled: amount paid` : "Returned goods")}</span>
                {line.tagNumber && <span className="block font-mono text-[9px]">{line.tagNumber}</span>}
              </td>
              <td className={`${cell} text-right`}>{line.paid !== undefined ? money(line.paid) : "—"}</td>
              <td className={`${cell} text-right`}>{money(line.amount)}</td>
            </tr>
          ))}
          <tr className="bg-navy text-white">
            <td className={`${cell} border-navy font-bold`} colSpan={3}>
              Total credit
            </td>
            <td className={`${cell} border-navy text-right text-[12px] font-bold`}>₹{money(note.amount)}</td>
          </tr>
        </tbody>
      </table>

      {(note.usage ?? []).length + (note.refunds ?? []).length > 0 && (
        <table className="w-full border-collapse tabular-nums">
          <thead>
            <tr>
              <th className={head}>Settled by</th>
              <th className={head}>Date</th>
              <th className={head}>Reference</th>
              <th className={`${head} text-right`}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {(note.usage ?? []).map((use, index) => (
              <tr key={`u-${index}`}>
                <td className={cell}>Used on a bill</td>
                <td className={cell}>{formatDate(use.at)}</td>
                <td className={`${cell} font-mono`}>{use.invoice ?? "—"}</td>
                <td className={`${cell} text-right`}>{money(use.amount)}</td>
              </tr>
            ))}
            {(note.refunds ?? []).flatMap((refund, index) =>
              refund.payouts.map((payout, inner) => (
                <tr key={`r-${index}-${inner}`}>
                  <td className={cell}>Paid to customer by {PAYMENT_MODE_LABELS[payout.mode]}</td>
                  <td className={cell}>{formatDate(refund.at)}</td>
                  <td className={`${cell} font-mono`}>{payout.reference || "—"}</td>
                  <td className={`${cell} text-right`}>{money(payout.amount)}</td>
                </tr>
              )),
            )}
            <tr className="font-bold">
              <td className={cell} colSpan={3}>
                Balance left
              </td>
              <td className={`${cell} text-right`}>₹{money(note.balance)}</td>
            </tr>
          </tbody>
        </table>
      )}

      {paidBack > 0 && (
        <p className="rounded-md border border-ok/40 bg-ok/10 px-2.5 py-1.5 font-semibold">
          Received ₹{money(paidBack)} from {note.seller.tradeName || note.seller.name} against this credit note{usedOnBills ? `, after ₹${money(usedOnBills)} was used on bills` : ""}. Customer to sign below as proof of
          receipt.
        </p>
      )}
    </PrintSheet>
  );
}
