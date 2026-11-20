"use client";

import { use } from "react";
import Link from "next/link";
import { CreditCard, FilePlus2, HandCoins, MessageCircle, Phone, Printer, ReceiptText, UserRound } from "lucide-react";
import { useApi, useAuth, useResource } from "@webfudge/auth/components";
import { Button, Card, CardBody, CardHeader, DetailHero, HeroFact, KpiCard, PageHeader, PrintPreview, Spinner, StatusPill, buttonClass } from "@webfudge/ui";
import type { CreditNoteDetail } from "@webfudge/utils/api";
import { formatDate, formatINR } from "@webfudge/utils/formatters";
import { CREDIT_STATUS, CreditNoteDocument } from "@/components/credit-note";
import { PayoutForm } from "@/components/payout-form";

export default function CreditNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const api = useApi();
  const { hasRole } = useAuth();
  const { data, error, loading, reload } = useResource<{ data: CreditNoteDetail }>(`/sales/credit-notes/${id}`);
  const note = data?.data;

  if (loading && !note) return <Spinner className="text-navy" />;
  if (error || !note) return <p className="text-sm text-risk">{error ?? "Credit note not found."}</p>;
  const status = CREDIT_STATUS[note.status];
  const paidOut = (note.refunds ?? []).reduce((sum, refund) => sum + refund.amount, 0);
  const used = (note.usage ?? []).reduce((sum, use) => sum + use.amount, 0);
  const first = note.customer?.name.replace(/^Demo\s*[–-]\s*/, "").split(" ")[0] ?? "";
  const whatsapp = note.customer
    ? `https://wa.me/91${note.customer.phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(
        `Namaste ${first}, credit note ${note.number} for ₹${note.amount} has been issued by ${note.seller.tradeName || note.seller.name}${note.status === "refunded" ? ` and ₹${paidOut} has been paid back to you` : ` and ₹${note.balance} is left to use on your next purchase`}.`,
      )}`
    : null;

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 print:hidden">
        <PageHeader title={<span className="font-mono">{note.number}</span>} description={`Credit note for ${note.customer?.name ?? "a customer"}. Print it as their proof.`} />
        <DetailHero
          icon={CreditCard}
          title={<span className="font-mono">{note.number}</span>}
          badges={<StatusPill tone={status.tone === "neutral" ? "neutral" : status.tone}>{status.label}</StatusPill>}
          meta={
            <>
              {note.customer && (
                <HeroFact icon={UserRound}>
                  <Link href={`/customers/${note.customer.id}`} className="font-semibold text-ink hover:text-navy">
                    {note.customer.name}
                  </Link>
                </HeroFact>
              )}
              {note.customer && <HeroFact icon={Phone}>{note.customer.phone}</HeroFact>}
              {note.invoice && (
                <HeroFact icon={ReceiptText}>
                  <Link href={`/invoices/${note.invoice.id}`} className="font-mono hover:text-navy">
                    {note.invoice.number}
                  </Link>
                </HeroFact>
              )}
            </>
          }
          stat={{ label: "Left to use", value: formatINR(note.balance), note: `of ${formatINR(note.amount)} credited on ${formatDate(note.createdAt)}` }}
        />

        <div className="flex flex-wrap gap-2">
          <Button variant="gold" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden />
            Print credit note
          </Button>
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
              <MessageCircle className="size-4" aria-hidden />
              Send on WhatsApp
            </a>
          )}
          {note.status === "open" && note.customer && (
            <Link href={`/?customer=${note.customer.id}`} className={buttonClass("primary")}>
              <FilePlus2 className="size-4" aria-hidden />
              Use on a new bill
            </Link>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard compact title="Credit given" value={formatINR(note.amount)} icon={CreditCard} subtitle={`After ${note.deductionPercent}% return deduction`} />
          <KpiCard compact title="Used on bills" value={formatINR(used)} icon={ReceiptText} tone="gold" subtitle={`${(note.usage ?? []).length} bills`} />
          <KpiCard compact title="Paid back" value={formatINR(paidOut)} icon={HandCoins} tone="ok" subtitle={paidOut ? "Customer signs the printout as proof" : "Nothing paid out"} />
        </div>

        {note.status === "open" && hasRole("owner", "branch_manager") && (
          <Card>
            <CardHeader title="Pay out the balance" description="Hands the money back. Print the credit note afterwards and have the customer sign it as proof." />
            <CardBody>
              <PayoutForm
                due={note.balance}
                label={`Pay out ${formatINR(note.balance)}`}
                submitLabel="Pay out"
                onSubmit={async (payouts, cashOverride) => {
                  await api.post(`/sales/credit-notes/${note.id}/refund`, { payouts, ...(cashOverride ? { cashOverride } : {}) });
                  reload();
                }}
              />
            </CardBody>
          </Card>
        )}
      </div>

      <PrintPreview>
        <CreditNoteDocument note={note} />
      </PrintPreview>
    </div>
  );
}
