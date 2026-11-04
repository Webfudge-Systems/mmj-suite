"use client";

import { use, useState } from "react";
import Link from "next/link";
import { errorMessage, useApi, useAuth, useResource } from "@webfudge/auth/components";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Field, Input, PageHeader, Spinner, buttonClass } from "@webfudge/ui";
import { PAYMENT_MODE_LABELS, type Invoice } from "@webfudge/utils/api";
import { formatDate, formatDateTime, formatINR, formatWeight } from "@webfudge/utils/formatters";

const MAKING = { per_gram: "/g", percent: "%", fixed: "" } as const;

/** The tax invoice as printed on A4. */
function TaxInvoice({ invoice }: { invoice: Invoice }) {
  const cell = "border border-black/60 px-1.5 py-1 align-top";
  const head = `${cell} bg-black/5 text-left font-semibold`;
  return (
    <article className="invoice mx-auto grid w-full max-w-[210mm] gap-3 bg-white p-6 text-[10.5px] leading-snug text-black print:max-w-none print:p-0">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-black pb-3">
        <div className="grid gap-0.5">
          <span className="text-[17px] font-bold tracking-wide">{invoice.seller.name}</span>
          {invoice.seller.address && <span>{invoice.seller.address}</span>}
          <span>
            {invoice.seller.phone ? `Phone ${invoice.seller.phone}` : ""}
            {invoice.seller.email ? ` · ${invoice.seller.email}` : ""}
          </span>
          <span className="font-semibold">GSTIN {invoice.seller.gstin ?? "not set — add it in Back Office › Settings"}</span>
        </div>
        <div className="grid justify-items-end gap-0.5 text-right">
          <span className="text-[15px] font-bold">TAX INVOICE</span>
          <span>
            No. <b className="font-mono">{invoice.number}</b>
          </span>
          <span>Date {formatDateTime(invoice.invoiceDate)}</span>
          {invoice.status === "cancelled" && <span className="text-[13px] font-bold">CANCELLED</span>}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4">
        <div className="grid gap-0.5">
          <span className="font-semibold">Billed to</span>
          <span>{invoice.customer.name}</span>
          <span>Mobile {invoice.customer.phone}</span>
          {invoice.customer.address && <span>{invoice.customer.address}</span>}
          {invoice.customer.pan && <span>PAN {invoice.customer.pan}</span>}
          {invoice.customer.gstin && <span>GSTIN {invoice.customer.gstin}</span>}
        </div>
        <div className="grid content-start justify-items-end gap-0.5 text-right">
          {invoice.seller.gstin && <span>Place of supply: state code {invoice.seller.gstin.slice(0, 2)}</span>}
          <span>
            Rates of {formatDate(invoice.rates.effectiveFrom)}:{" "}
            {invoice.rates.lines
              .filter((line) => invoice.lines.some((entry) => entry.purity === line.purity))
              .map((line) => `${line.purity} ${formatINR(line.ratePerGram)}/g`)
              .join(", ")}
          </span>
        </div>
      </section>

      <table className="w-full border-collapse tabular-nums">
        <thead>
          <tr>
            <th className={head}>#</th>
            <th className={head}>Description · HSN 7113</th>
            <th className={head}>Purity · HUID</th>
            <th className={`${head} text-right`}>Gross wt</th>
            <th className={`${head} text-right`}>Net wt</th>
            <th className={`${head} text-right`}>Rate/g</th>
            <th className={`${head} text-right`}>Metal</th>
            <th className={`${head} text-right`}>Making</th>
            <th className={`${head} text-right`}>Stones, HM</th>
            <th className={`${head} text-right`}>Taxable</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line, index) => (
            <tr key={line.itemId}>
              <td className={cell}>{index + 1}</td>
              <td className={cell}>
                {line.description}
                <span className="block font-mono text-[9.5px]">{line.tagNumber}</span>
                {line.returnedAt && <span className="block font-semibold">Returned on {line.creditNoteNumber}</span>}
              </td>
              <td className={cell}>
                {line.purity}
                {line.huid && <span className="block font-mono">{line.huid}</span>}
              </td>
              <td className={`${cell} text-right`}>{formatWeight(line.grossWeight)}</td>
              <td className={`${cell} text-right`}>{formatWeight(line.netWeight)}</td>
              <td className={`${cell} text-right`}>{formatINR(line.ratePerGram)}</td>
              <td className={`${cell} text-right`}>{formatINR(line.metalValue)}</td>
              <td className={`${cell} text-right`}>
                {formatINR(line.makingCharge - line.makingDiscount)}
                <span className="block text-[9px]">
                  {line.making.type === "percent" ? `${line.making.value}${MAKING.percent}` : `₹${line.making.value}${MAKING[line.making.type]}`}
                  {line.makingDiscount ? ` less ${formatINR(line.makingDiscount)}` : ""}
                </span>
              </td>
              <td className={`${cell} text-right`}>{formatINR(line.stoneValue + line.otherCharges)}</td>
              <td className={`${cell} text-right`}>{formatINR(line.taxableValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="grid grid-cols-[1fr_260px] gap-4">
        <div className="grid content-start gap-2">
          <p>
            <b>Amount in words:</b> {invoice.amountInWords}
          </p>
          {invoice.oldGold && (
            <div>
              <b>Old gold received ({invoice.oldGold.number}):</b>
              {invoice.oldGold.lines.map((line, index) => (
                <span key={index} className="block">
                  {line.description}: gross {formatWeight(line.grossWeight)}, less {formatWeight(line.lessWeight)}, tested {line.fineness}, fine {formatWeight(line.fineWeight)} at{" "}
                  {formatINR(line.pureRate)}/g less {line.deductionPercent}% = {formatINR(line.value)}
                </span>
              ))}
            </div>
          )}
          <div>
            <b>Paid:</b>{" "}
            {invoice.payments.length
              ? invoice.payments.map((payment) => `${PAYMENT_MODE_LABELS[payment.mode]} ${formatINR(payment.amount)}${payment.reference ? ` (${payment.reference})` : ""}`).join(", ")
              : "Nothing further"}
          </div>
          {invoice.notes && <p>{invoice.notes}</p>}
          <p className="text-[9.5px]">
            Prices are worked out on the day&apos;s rate for each purity. Hallmarked pieces carry the BIS HUID shown. Exchange and buyback as per the shop&apos;s policy. Subject to
            the shop&apos;s local jurisdiction.
          </p>
        </div>
        <table className="w-full border-collapse self-start tabular-nums">
          <tbody>
            {[
              ["Taxable value", invoice.taxableValue],
              ["CGST 1.5%", invoice.cgst],
              ["SGST 1.5%", invoice.sgst],
              ["Round off", invoice.roundOff],
            ].map(([label, value]) => (
              <tr key={label as string}>
                <td className={cell}>{label}</td>
                <td className={`${cell} text-right`}>{formatINR(value as number)}</td>
              </tr>
            ))}
            <tr>
              <td className={`${cell} font-bold`}>Invoice total</td>
              <td className={`${cell} text-right font-bold`}>{formatINR(invoice.total)}</td>
            </tr>
            {invoice.oldGoldValue > 0 && (
              <tr>
                <td className={cell}>Less old gold</td>
                <td className={`${cell} text-right`}>{formatINR(invoice.oldGoldValue)}</td>
              </tr>
            )}
            {invoice.creditNoteUsed > 0 && (
              <tr>
                <td className={cell}>Less credit notes</td>
                <td className={`${cell} text-right`}>{formatINR(invoice.creditNoteUsed)}</td>
              </tr>
            )}
            {invoice.advanceUsed > 0 && (
              <tr>
                <td className={cell}>Less advances</td>
                <td className={`${cell} text-right`}>{formatINR(invoice.advanceUsed)}</td>
              </tr>
            )}
            <tr>
              <td className={`${cell} font-bold`}>Amount paid</td>
              <td className={`${cell} text-right font-bold`}>{formatINR(invoice.amountDue)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <footer className="mt-8 flex justify-between gap-4">
        <span>Customer&apos;s signature</span>
        <span className="text-right">
          For {invoice.seller.name}
          <span className="block pt-8">Authorised signatory{invoice.cashier ? ` (${invoice.cashier})` : ""}</span>
        </span>
      </footer>
    </article>
  );
}

export default function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = use(params);
  const { new: justIssued } = use(searchParams);
  const api = useApi();
  const { hasRole } = useAuth();
  const { data, error, loading, setData } = useResource<{ data: Invoice }>(`/sales/invoices/${id}`);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const invoice = data?.data;

  async function cancel() {
    setBusy(true);
    setCancelError(null);
    try {
      setData(await api.post<{ data: Invoice }>(`/sales/invoices/${id}/cancel`, { reason }));
      setCancelling(false);
    } catch (cause) {
      setCancelError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner className="text-navy" />;
  if (error || !invoice) return <p className="text-sm text-risk">{error ?? "Invoice not found."}</p>;

  return (
    <div className="grid gap-6">
      <style>{`@media print { @page { size: A4; margin: 12mm; } }`}</style>
      <div className="grid gap-6 print:hidden">
        <Link href="/invoices" className="text-[13px] text-ash hover:text-navy">
          ← Invoices
        </Link>
        <PageHeader
          title={<span className="font-mono">{invoice.number}</span>}
          description={
            <span className="flex flex-wrap items-center gap-2">
              {invoice.status === "cancelled" ? <Badge tone="risk">Cancelled</Badge> : <Badge tone="ok">Paid</Badge>}
              {invoice.customer.name} · {formatINR(invoice.total)}
            </span>
          }
          actions={
            <>
              <Button variant="gold" onClick={() => window.print()}>
                Print
              </Button>
              {invoice.status === "paid" && (
                <Link href={`/returns?invoice=${invoice.id}`} className={buttonClass("secondary")}>
                  Return pieces
                </Link>
              )}
              {invoice.status === "paid" && hasRole("owner", "branch_manager") && !cancelling && (
                <Button variant="ghost" onClick={() => setCancelling(true)}>
                  Cancel invoice
                </Button>
              )}
            </>
          }
        />
        {justIssued && <Alert tone="ok" title="Invoice issued">The pieces are marked sold. Print two copies: one for the customer, one for the file.</Alert>}
        {invoice.status === "cancelled" && (
          <Alert tone="risk" title={`Cancelled ${invoice.cancelledAt ? formatDateTime(invoice.cancelledAt) : ""}${invoice.cancelledBy ? ` by ${invoice.cancelledBy}` : ""}`}>
            {invoice.cancelReason} The customer&apos;s payment is on a credit note in Returns.
          </Alert>
        )}
        {cancelling && (
          <Card>
            <CardHeader title="Cancel this invoice" description="The pieces go back into stock. What the customer paid becomes a credit note they can use or have refunded." />
            <CardBody className="grid gap-3">
              <Field label="Why" htmlFor="cancel-reason">
                <Input id="cancel-reason" value={reason} onChange={(event) => setReason(event.target.value)} />
              </Field>
              {cancelError && <Alert tone="risk">{cancelError}</Alert>}
              <div className="flex gap-2">
                <Button variant="danger" loading={busy} disabled={reason.trim().length < 5} onClick={cancel}>
                  Cancel invoice
                </Button>
                <Button variant="ghost" onClick={() => setCancelling(false)}>
                  Keep it
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
      <div className="overflow-x-auto rounded-[var(--radius-panel)] border border-line print:overflow-visible print:border-0">
        <TaxInvoice invoice={invoice} />
      </div>
    </div>
  );
}
