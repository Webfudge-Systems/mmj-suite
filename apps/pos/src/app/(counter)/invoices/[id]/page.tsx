"use client";

import { use, useState } from "react";
import Link from "next/link";
import { errorMessage, useApi, useAuth, useResource } from "@webfudge/auth/components";
import { Alert, Badge, Button, Card, CardBody, CardHeader, CopyText, Field, Input, PageHeader, Spinner, buttonClass } from "@webfudge/ui";
import type { Invoice } from "@webfudge/utils/api";
import { formatDateTime, formatINR } from "@webfudge/utils/formatters";
import { TaxInvoice } from "@/components/tax-invoice";

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
        <PageHeader
          title={
            <CopyText value={invoice.number} label="Copy invoice number">
              <span className="font-mono">{invoice.number}</span>
            </CopyText>
          }
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
      <div className="overflow-x-auto rounded-[var(--radius-panel)] border border-line bg-gray-100 p-4 sm:p-6 print:overflow-visible print:border-0 print:bg-white print:p-0">
        <div className="mx-auto w-fit shadow-xl print:shadow-none">
          <TaxInvoice invoice={invoice} />
        </div>
      </div>
    </div>
  );
}
