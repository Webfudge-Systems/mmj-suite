import { PrintBox, PrintSheet } from "@webfudge/ui";
import { PAYMENT_MODE_LABELS, type AdvanceDetail } from "@webfudge/utils/api";
import { formatDate, formatDateTime } from "@webfudge/utils/formatters";

export const ADVANCE_STATUS = {
  open: { label: "Open", tone: "gold" },
  used: { label: "Used", tone: "ok" },
  refunded: { label: "Refunded", tone: "neutral" },
} as const;

const money = (value: number) => value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Rupees in words for the receipt, like "Twenty-Five Thousand Rupees Only". */
function inWords(amount: number) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (n: number) => (n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`);
  const three = (n: number) => (n >= 100 ? `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${two(n % 100)}` : ""}` : two(n));
  let rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  if (rupees === 0 && !paise) return "Zero Rupees Only";
  const parts: string[] = [];
  const crore = Math.floor(rupees / 10000000);
  rupees %= 10000000;
  const lakh = Math.floor(rupees / 100000);
  rupees %= 100000;
  const thousand = Math.floor(rupees / 1000);
  rupees %= 1000;
  if (crore) parts.push(`${three(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (rupees) parts.push(three(rupees));
  return `Rupees ${parts.join(" ")}${paise ? ` and ${two(paise)} Paise` : ""} Only`;
}

/**
 * The receipt for money paid ahead of a purchase, on a full A4 page in the same
 * style as the tax invoice. An advance is not a sale, so it carries no GST:
 * tax is charged on the final invoice.
 */
export function AdvanceReceipt({ advance }: { advance: AdvanceDetail }) {
  const cell = "border border-navy/30 px-2 py-1.5 align-top";
  const head = `${cell} bg-navy/[0.07] text-left font-semibold text-navy`;
  const locked = advance.lockedPurity && advance.lockedRate;
  const lockedValue = locked ? (advance.lockedWeight ?? 0) * (advance.lockedRate ?? 0) : 0;

  return (
    <PrintSheet
      logoSrc="/brand/mmj-mark.png"
      seller={advance.seller}
      title="Advance receipt"
      facts={[
        { label: "Receipt no.", value: <span className="font-mono">{advance.number}</span> },
        { label: "Date · Time", value: formatDateTime(advance.createdAt) },
        { label: "Valid until", value: advance.validUntil ? formatDate(advance.validUntil) : "—" },
      ]}
      stamp={advance.status === "refunded" ? { text: "REFUNDED", tone: "neutral" } : advance.status === "used" ? { text: "USED", tone: "ok" } : undefined}
      signatures={[`Customer signature · ${advance.customer?.name ?? ""}`, `Received by${advance.by ? ` · ${advance.by}` : ""}`]}
      terms={
        <p>
          <b className="text-black">Terms:</b> This advance is adjusted against a purchase from {advance.seller.tradeName || advance.seller.name} on or before the date above. It is not a sale: GST is
          charged on the final tax invoice. {locked ? "The booked rate applies only to the booked weight and purity, and only while the advance is valid. " : ""}A refund, if
          any, is made against this receipt as per the shop&apos;s policy. Keep this receipt safe and bring it when you buy.
        </p>
      }
    >
      <section className="grid grid-cols-2 gap-3">
        <PrintBox
          title="Received from"
          rows={[
            ["Name", advance.customer?.name],
            ["Address", advance.customer?.address],
            ["Mobile", advance.customer?.phone],
            ["PAN", advance.customer?.pan || "Not given"],
          ]}
        />
        <PrintBox
          title="Booking"
          rows={[
            ["Purpose", advance.note || "Advance against purchase"],
            ["Rate booked", locked ? `${advance.lockedPurity} at ₹${money(advance.lockedRate ?? 0)} per gram` : "No rate booked"],
            ["Booked weight", locked ? `${(advance.lockedWeight ?? 0).toFixed(3)} g` : "—"],
            ["Branch", advance.branch?.name],
          ]}
        />
      </section>

      <table className="w-full border-collapse tabular-nums">
        <thead>
          <tr>
            <th className={head}>Sr.</th>
            <th className={head}>Mode of payment</th>
            <th className={head}>Reference no.</th>
            <th className={`${head} text-right`}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {advance.payments.map((payment, index) => (
            <tr key={index}>
              <td className={cell}>{index + 1}</td>
              <td className={cell}>{PAYMENT_MODE_LABELS[payment.mode]}</td>
              <td className={`${cell} font-mono`}>{payment.reference || "—"}</td>
              <td className={`${cell} text-right`}>{money(payment.amount)}</td>
            </tr>
          ))}
          <tr className="bg-navy text-white">
            <td className={`${cell} border-navy font-bold`} colSpan={3}>
              Advance received
            </td>
            <td className={`${cell} border-navy text-right text-[12px] font-bold`}>₹{money(advance.amount)}</td>
          </tr>
        </tbody>
      </table>

      <p className="rounded-md border border-navy/20 bg-navy/[0.03] px-2.5 py-1.5">
        <b>Amount in words:</b> {inWords(advance.amount)}
      </p>

      {locked && (
        <p className="rounded-md border border-gold/50 bg-gold/10 px-2.5 py-1.5">
          <b>Rate protection:</b> {(advance.lockedWeight ?? 0).toFixed(3)} g of {advance.lockedPurity} booked at ₹{money(advance.lockedRate ?? 0)}/g (worth about ₹{money(lockedValue)} at that rate). If
          the rate is higher on the day of purchase, this weight is billed at the booked rate.
        </p>
      )}

      {(advance.usage ?? []).length > 0 && (
        <table className="w-full border-collapse tabular-nums">
          <thead>
            <tr>
              <th className={head}>Used on</th>
              <th className={head}>Date</th>
              <th className={`${head} text-right`}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {(advance.usage ?? []).map((entry, index) => (
              <tr key={index}>
                <td className={cell}>{entry.refund ? "Refunded to customer" : `Invoice ${entry.invoice ?? ""}`}</td>
                <td className={cell}>{formatDate(entry.at)}</td>
                <td className={`${cell} text-right`}>{money(entry.amount)}</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className={cell} colSpan={2}>
                Balance left
              </td>
              <td className={`${cell} text-right`}>₹{money(advance.balance)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </PrintSheet>
  );
}
