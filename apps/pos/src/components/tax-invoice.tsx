import type { ReactNode } from "react";
import { brand } from "@webfudge/config";
import { PAYMENT_MODE_LABELS, type BillLine, type Invoice } from "@webfudge/utils/api";
import { formatDate } from "@webfudge/utils/formatters";

const MARK = "/brand/mmj-mark.png";

/** GST state codes, for "Place of supply". */
const STATES: Record<string, string> = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan",
  "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura",
  "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu", "27": "Maharashtra", "29": "Karnataka", "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu",
  "34": "Puducherry", "35": "Andaman & Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh",
};
/** The shop is in Rahuri, Maharashtra; used until a GSTIN is entered. */
const HOME_STATE = "27";

const METALS: Record<string, string> = { gold: "Gold", silver: "Silver", platinum: "Platinum" };

const money = (value: number) => value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const grams = (value: number) => value.toFixed(3);
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[30mm_1fr] gap-2 py-[1.5px]">
      <dt className="font-semibold">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** One row per HSN code with CGST and SGST split half and half, as the GST rules want it. */
function taxSummary(lines: BillLine[]) {
  const byHsn = new Map<string, { taxable: number; gst: number }>();
  for (const line of lines) {
    const entry = byHsn.get(line.hsn) ?? { taxable: 0, gst: 0 };
    entry.taxable += line.taxableValue;
    entry.gst += line.gst;
    byHsn.set(line.hsn, entry);
  }
  return [...byHsn.entries()].map(([hsn, entry]) => {
    const half = Math.round((entry.gst / 2) * 100) / 100;
    const rate = entry.taxable ? Math.round(((entry.gst / entry.taxable) * 100 * 100) / 2) / 100 : 1.5;
    return { hsn, taxable: entry.taxable, rate, cgst: half, sgst: half, total: half * 2 };
  });
}

/**
 * The tax invoice, laid out for a full A4 sheet: shop header with the logo,
 * customer and seller boxes, item table, tax summary, payments, declaration and
 * signatures, with the MMJ mark as a faint watermark behind.
 */
export function TaxInvoice({ invoice }: { invoice: Invoice }) {
  const seller = invoice.seller;
  const stateCode = seller.gstin?.slice(0, 2) || HOME_STATE;
  const customerState = invoice.customer.gstin?.slice(0, 2) || stateCode;
  const lines = invoice.lines;
  const taxes = taxSummary(lines);
  const sum = (pick: (line: BillLine) => number) => lines.reduce((total, line) => total + pick(line), 0);
  const cancelled = invoice.status === "cancelled";

  const cell = "border border-navy/30 px-1.5 py-1 align-top";
  const head = `${cell} bg-navy/[0.07] text-center font-semibold text-navy`;
  const num = `${cell} text-right tabular-nums`;

  return (
    <article
      className="invoice relative mx-auto flex min-h-[297mm] w-[210mm] flex-col overflow-hidden bg-white px-[12mm] py-[11mm] text-[10px] leading-snug text-black print:min-h-[273mm] print:w-auto print:p-0"
      style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
    >
      {/* Watermark: the MMJ mark, faint, behind everything. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="grid justify-items-center gap-3 opacity-[0.1]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MARK} alt="" className="w-[95mm]" />
          <span className="text-[30px] font-bold tracking-[0.3em] text-navy uppercase">{brand.name}</span>
        </div>
      </div>
      {cancelled && (
        <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="-rotate-[24deg] rounded-xl border-[6px] border-risk/60 px-8 py-2 text-[64px] font-black tracking-widest text-risk/50">CANCELLED</span>
        </div>
      )}

      <div className="relative flex flex-1 flex-col gap-3">
        {/* Header */}
        <header className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b-[3px] border-gold pb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MARK} alt={`${brand.name} logo`} className="h-[22mm] w-auto" />
          <div className="grid gap-0.5">
            <span className="text-[20px] leading-tight font-bold tracking-wide text-navy">{seller.tradeName || seller.name}</span>
            {seller.tradeName && seller.name !== seller.tradeName && <span className="font-semibold">{seller.name}</span>}
            {seller.address && <span>{seller.address}</span>}
            <span>{[seller.phone && `Phone ${seller.phone}`, seller.email].filter(Boolean).join(" · ")}</span>
          </div>
          <div className="grid justify-items-end gap-1 text-right">
            <span className="rounded-md bg-navy px-3 py-1 text-[14px] font-bold tracking-wider text-white">TAX INVOICE</span>
            <span className="text-[9px] font-semibold tracking-wide text-ash uppercase">Original for recipient</span>
          </div>
        </header>

        {/* Invoice number, date and time */}
        <section className="grid grid-cols-3 gap-2 rounded-md border border-navy/30 px-3 py-2">
          <div>
            <span className="block text-[8.5px] font-semibold tracking-wide text-ash uppercase">Tax invoice no.</span>
            <span className="font-mono text-[12px] font-bold">{invoice.number}</span>
          </div>
          <div className="text-center">
            <span className="block text-[8.5px] font-semibold tracking-wide text-ash uppercase">Date · Time</span>
            <span className="text-[11px] font-semibold">
              {formatDate(invoice.invoiceDate)} · {time(invoice.invoiceDate)}
            </span>
          </div>
          <div className="text-right">
            <span className="block text-[8.5px] font-semibold tracking-wide text-ash uppercase">Branch · Sold by</span>
            <span className="text-[11px] font-semibold">{[invoice.branch?.name, invoice.salesperson].filter(Boolean).join(" · ") || "—"}</span>
          </div>
        </section>

        {/* Customer and seller */}
        <section className="grid grid-cols-2 gap-3">
          <dl className="rounded-md border border-navy/30 p-2.5">
            <p className="mb-1 border-b border-navy/20 pb-1 text-[10.5px] font-bold text-navy">Customer</p>
            <Row label="Name">{invoice.customer.name}</Row>
            <Row label="Address">{invoice.customer.address || "—"}</Row>
            <Row label="Customer ID">C-{String(invoice.customer.id).padStart(5, "0")}</Row>
            <Row label="Contact number">{invoice.customer.phone}</Row>
            <Row label="State code">
              {customerState}
              {STATES[customerState] ? `, ${STATES[customerState]}` : ""}
            </Row>
            <Row label="Customer GSTIN">{invoice.customer.gstin || "Unregistered"}</Row>
            <Row label="PAN / Form 60">{invoice.customer.pan || "Not applicable"}</Row>
          </dl>
          <dl className="rounded-md border border-navy/30 p-2.5">
            <p className="mb-1 border-b border-navy/20 pb-1 text-[10.5px] font-bold text-navy">Seller</p>
            <Row label="Name">{seller.name}</Row>
            <Row label="Address">{seller.address || "—"}</Row>
            <Row label="Seller GSTIN">{seller.gstin || <span className="font-semibold text-risk">Not set — add it in Back Office › Settings</span>}</Row>
            <Row label="Place of supply">
              {stateCode}
              {STATES[stateCode] ? `, ${STATES[stateCode]}` : ""}
            </Row>
            <Row label="Delivery">At the counter</Row>
            {seller.phone && <Row label="Store contact">{seller.phone}</Row>}
          </dl>
        </section>

        {/* Items */}
        <table className="w-full border-collapse text-[9.5px] tabular-nums">
          <thead>
            <tr>
              <th className={head}>Sr.</th>
              <th className={`${head} text-left`}>Article · Description</th>
              <th className={head}>Metal / Purity</th>
              <th className={head}>Rate /g (₹)</th>
              <th className={head}>HSN</th>
              <th className={head}>Qty</th>
              <th className={head}>Gross wt (g)</th>
              <th className={head}>Net wt (g)</th>
              <th className={head}>Stone wt (g)</th>
              <th className={head}>Metal value (₹)</th>
              <th className={head}>Stones &amp; other (₹)</th>
              <th className={head}>Making (₹)</th>
              <th className={head}>Discount (₹)</th>
              <th className={head}>Base value (₹)</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={line.itemId}>
                <td className={`${cell} text-center`}>{index + 1}</td>
                <td className={cell}>
                  <span className="font-semibold">{line.description}</span>
                  <span className="block font-mono text-[8.5px]">{line.tagNumber}</span>
                  {line.huid && <span className="block font-mono text-[8.5px]">HUID {line.huid}</span>}
                  {line.returnedAt && <span className="block font-semibold text-risk">Returned on {line.creditNoteNumber}</span>}
                </td>
                <td className={`${cell} text-center`}>
                  {METALS[line.metal] ?? line.metal}
                  <span className="block">{line.purity}</span>
                </td>
                <td className={num}>{money(line.ratePerGram)}</td>
                <td className={`${cell} text-center`}>{line.hsn}</td>
                <td className={`${cell} text-center`}>1</td>
                <td className={num}>{grams(line.grossWeight)}</td>
                <td className={num}>{grams(line.netWeight)}</td>
                <td className={num}>{grams(line.stoneWeight)}</td>
                <td className={num}>{money(line.metalValue)}</td>
                <td className={num}>{money(line.stoneValue + line.otherCharges)}</td>
                <td className={num}>
                  {money(line.makingCharge)}
                  <span className="block text-[8px] text-ash">{line.making.type === "percent" ? `${line.making.value}%` : line.making.type === "per_gram" ? `₹${line.making.value}/g` : "fixed"}</span>
                </td>
                <td className={num}>{money(line.makingDiscount)}</td>
                <td className={`${num} font-semibold`}>{money(line.taxableValue)}</td>
              </tr>
            ))}
            <tr className="bg-navy/[0.04] font-bold">
              <td className={cell} />
              <td className={cell}>Sub total</td>
              <td className={cell} />
              <td className={cell} />
              <td className={cell} />
              <td className={`${cell} text-center`}>{lines.length}</td>
              <td className={num}>{grams(sum((line) => line.grossWeight))}</td>
              <td className={num}>{grams(sum((line) => line.netWeight))}</td>
              <td className={num}>{grams(sum((line) => line.stoneWeight))}</td>
              <td className={num}>{money(sum((line) => line.metalValue))}</td>
              <td className={num}>{money(sum((line) => line.stoneValue + line.otherCharges))}</td>
              <td className={num}>{money(sum((line) => line.makingCharge))}</td>
              <td className={num}>{money(sum((line) => line.makingDiscount))}</td>
              <td className={num}>{money(invoice.taxableValue)}</td>
            </tr>
          </tbody>
        </table>

        {/* Tax summary and totals */}
        <section className="grid grid-cols-[1fr_68mm] gap-3">
          <div className="grid content-start gap-2">
            <table className="w-full border-collapse text-[9.5px] tabular-nums">
              <thead>
                <tr>
                  <th className={head} colSpan={8}>
                    Tax summary
                  </th>
                </tr>
                <tr>
                  <th className={head} rowSpan={2}>
                    HSN
                  </th>
                  <th className={head} rowSpan={2}>
                    Taxable (₹)
                  </th>
                  <th className={head} colSpan={2}>
                    CGST
                  </th>
                  <th className={head} colSpan={2}>
                    SGST
                  </th>
                  <th className={head} rowSpan={2}>
                    IGST (₹)
                  </th>
                  <th className={head} rowSpan={2}>
                    Total tax (₹)
                  </th>
                </tr>
                <tr>
                  <th className={head}>Rate</th>
                  <th className={head}>Amount</th>
                  <th className={head}>Rate</th>
                  <th className={head}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {taxes.map((tax) => (
                  <tr key={tax.hsn}>
                    <td className={`${cell} text-center`}>{tax.hsn}</td>
                    <td className={num}>{money(tax.taxable)}</td>
                    <td className={num}>{tax.rate}%</td>
                    <td className={num}>{money(tax.cgst)}</td>
                    <td className={num}>{tax.rate}%</td>
                    <td className={num}>{money(tax.sgst)}</td>
                    <td className={num}>0.00</td>
                    <td className={num}>{money(tax.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="rounded-md border border-navy/20 bg-navy/[0.03] px-2.5 py-1.5">
              <b>Amount in words:</b> {invoice.amountInWords}
            </p>
            <p className="text-[9px] text-ash">
              Rates of {formatDate(invoice.rates.effectiveFrom)}:{" "}
              {invoice.rates.lines
                .filter((line) => lines.some((entry) => entry.purity === line.purity))
                .map((line) => `${line.purity} ₹${money(line.ratePerGram)}/g`)
                .join(" · ")}
            </p>
          </div>
          <table className="w-full self-start border-collapse tabular-nums">
            <tbody>
              {[
                ["Taxable value", invoice.taxableValue],
                ["Total GST", invoice.cgst + invoice.sgst],
                ["Invoice value incl. GST", invoice.taxableValue + invoice.cgst + invoice.sgst],
                ["Rounded off", invoice.roundOff],
              ].map(([label, value]) => (
                <tr key={label as string}>
                  <td className={cell}>{label}</td>
                  <td className={num}>{money(value as number)}</td>
                </tr>
              ))}
              <tr className="bg-navy text-white">
                <td className={`${cell} border-navy font-bold`}>Total invoice value</td>
                <td className={`${num} border-navy text-[11px] font-bold`}>₹{money(invoice.total)}</td>
              </tr>
              {invoice.oldGoldValue > 0 && (
                <tr>
                  <td className={cell}>Less old gold</td>
                  <td className={num}>{money(invoice.oldGoldValue)}</td>
                </tr>
              )}
              {invoice.creditNoteUsed > 0 && (
                <tr>
                  <td className={cell}>Less credit notes</td>
                  <td className={num}>{money(invoice.creditNoteUsed)}</td>
                </tr>
              )}
              {invoice.advanceUsed > 0 && (
                <tr>
                  <td className={cell}>Less advances</td>
                  <td className={num}>{money(invoice.advanceUsed)}</td>
                </tr>
              )}
              {invoice.oldGoldValue + invoice.creditNoteUsed + invoice.advanceUsed > 0 && (
                <tr className="font-bold">
                  <td className={cell}>Paid now</td>
                  <td className={num}>₹{money(invoice.amountDue)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Old gold taken in */}
        {invoice.oldGold && (
          <table className="w-full border-collapse text-[9.5px] tabular-nums">
            <thead>
              <tr>
                <th className={`${head} text-left`} colSpan={7}>
                  Old gold received · {invoice.oldGold.number}
                </th>
              </tr>
              <tr>
                <th className={`${head} text-left`}>Description</th>
                <th className={head}>Gross (g)</th>
                <th className={head}>Less (g)</th>
                <th className={head}>Tested</th>
                <th className={head}>Fine (g)</th>
                <th className={head}>Rate /g, less %</th>
                <th className={head}>Value (₹)</th>
              </tr>
            </thead>
            <tbody>
              {invoice.oldGold.lines.map((line, index) => (
                <tr key={index}>
                  <td className={cell}>{line.description}</td>
                  <td className={num}>{grams(line.grossWeight)}</td>
                  <td className={num}>{grams(line.lessWeight)}</td>
                  <td className={num}>{line.fineness}</td>
                  <td className={num}>{grams(line.fineWeight)}</td>
                  <td className={num}>
                    {money(line.pureRate)} less {line.deductionPercent}%
                  </td>
                  <td className={num}>{money(line.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Payments */}
        <table className="w-[130mm] border-collapse text-[9.5px] tabular-nums">
          <thead>
            <tr>
              <th className={`${head} text-left`}>Mode of payment</th>
              <th className={`${head} text-left`}>Reference no.</th>
              <th className={head}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {invoice.payments.length ? (
              invoice.payments.map((payment, index) => (
                <tr key={index}>
                  <td className={cell}>{PAYMENT_MODE_LABELS[payment.mode]}</td>
                  <td className={`${cell} font-mono`}>{payment.reference || "—"}</td>
                  <td className={num}>{money(payment.amount)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className={cell} colSpan={3}>
                  Nothing further to pay: settled by old gold, advances or credit notes.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {invoice.notes && (
          <p>
            <b>Note:</b> {invoice.notes}
          </p>
        )}

        <p className="rounded-md border border-navy/20 px-2.5 py-1.5 font-semibold">
          I confirm the weight, purity and invoice value stated above, have read and accept the terms below, and have received the products in good condition with
          their hallmark details.
        </p>

        {/* Signatures sit at the foot of the page. */}
        <div className="mt-auto grid gap-3 pt-4">
          <div className="grid grid-cols-2 gap-10">
            <div className="grid gap-1">
              <span className="h-12 border-b border-black" />
              <span>Customer signature · {invoice.customer.name}</span>
            </div>
            <div className="grid justify-items-end gap-1 text-right">
              <span className="font-semibold">For {seller.tradeName || seller.name}</span>
              <span className="h-9 w-56 border-b border-black" />
              <span>Authorised signatory{invoice.cashier ? ` · ${invoice.cashier}` : ""}</span>
            </div>
          </div>

          <footer className="grid gap-1 border-t-[3px] border-gold pt-2 text-[8.5px] text-ash">
            <p>
              <b className="text-black">Terms:</b> Prices are worked out on the day&apos;s rate for each purity. Hallmarked pieces carry the BIS HUID shown; the purity of any
              hallmarked piece can be checked at a BIS recognised assaying and hallmarking centre (www.bis.gov.in). Exchange and buyback as per the shop&apos;s policy, against
              this invoice. Subject to local jurisdiction. E&amp;OE.
            </p>
            <p>
              {seller.name}
              {seller.address ? ` · ${seller.address}` : ""}
              {seller.gstin ? ` · GSTIN ${seller.gstin}` : ""}
              {seller.phone ? ` · ${seller.phone}` : ""}
              {seller.email ? ` · ${seller.email}` : ""}
            </p>
          </footer>
        </div>
      </div>
    </article>
  );
}
