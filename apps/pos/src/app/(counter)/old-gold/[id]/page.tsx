"use client";

import { use } from "react";
import Link from "next/link";
import { CalendarClock, Coins, FileText, IdCard, Phone, Printer, Scale, UserRound, Wallet } from "lucide-react";
import { useResource } from "@webfudge/auth/components";
import { Alert, Button, CopyText, DetailHero, HeroFact, KpiCard, PageHeader, PrintPreview, Spinner, StatusPill, buttonClass } from "@webfudge/ui";
import { PAYMENT_MODE_LABELS, type OldGoldDetail } from "@webfudge/utils/api";
import { formatDateTime, formatINR, formatWeight } from "@webfudge/utils/formatters";
import { OldGoldReceipt } from "@/components/old-gold-receipt";

export default function OldGoldReceiptPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = use(params);
  const { new: justRecorded } = use(searchParams);
  const { data, error, loading } = useResource<{ data: OldGoldDetail }>(`/sales/old-gold/${id}`);
  const record = data?.data;

  if (loading && !record) return <Spinner className="text-navy" />;
  if (error || !record) return <p className="text-sm text-risk">{error ?? "Old gold record not found."}</p>;
  const exchange = record.kind === "exchange";
  const fine = (metal: "gold" | "silver") => record.lines.filter((line) => line.metal === metal).reduce((sum, line) => sum + line.fineWeight, 0);
  const gross = record.lines.reduce((sum, line) => sum + line.grossWeight, 0);

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 print:hidden">
        <PageHeader
          title={
            <CopyText value={record.number} label="Copy receipt number">
              <span className="font-mono">{record.number}</span>
            </CopyText>
          }
          description={exchange ? `Old gold taken against ${record.invoice?.number ?? "a bill"}.` : `Old gold bought from ${record.customer?.name ?? "a customer"}. Print the receipt for them.`}
          actions={
            <Button variant="gold" onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden />
              Print receipt
            </Button>
          }
        />
        {justRecorded && (
          <Alert tone="ok" title={`${record.number} recorded`}>
            Paid {formatINR(record.totalValue)} to {record.customer?.name}. Print two copies: one for the seller to sign and keep, one for the file.
          </Alert>
        )}

        <DetailHero
          icon={Coins}
          title={record.customer?.name ?? "Old gold"}
          badges={
            <>
              <StatusPill tone={exchange ? "navy" : "gold"}>{exchange ? "Against a bill" : "Bought outright"}</StatusPill>
              {record.cashOverride && <StatusPill tone="warn">Cash above limit, approved</StatusPill>}
            </>
          }
          meta={
            <>
              {record.customer && <HeroFact icon={Phone}>{record.customer.phone}</HeroFact>}
              {record.idProof && <HeroFact icon={IdCard}>{record.idProof}</HeroFact>}
              <HeroFact icon={CalendarClock}>{formatDateTime(record.createdAt)}</HeroFact>
              {record.by && <HeroFact icon={UserRound}>{record.by}</HeroFact>}
              {exchange && record.invoice && (
                <HeroFact icon={FileText}>
                  <Link href={`/invoices/${record.invoice.id}`} className="font-mono font-semibold text-ink hover:text-navy">
                    {record.invoice.number}
                  </Link>
                </HeroFact>
              )}
            </>
          }
          stat={{ label: exchange ? "Value adjusted" : "Paid to seller", value: formatINR(record.totalValue), note: `${record.lines.length} ${record.lines.length === 1 ? "item" : "items"}, ${formatWeight(gross)} gross` }}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard compact title="Fine gold" value={formatWeight(fine("gold"))} icon={Scale} tone="gold" subtitle="After the tested purity" />
          <KpiCard compact title="Fine silver" value={formatWeight(fine("silver"))} icon={Scale} subtitle="After the tested purity" />
          <KpiCard compact title={exchange ? "Taken off the bill" : "Paid"} value={formatINR(record.totalValue)} icon={Wallet} tone="navy" subtitle={exchange ? record.invoice?.number ?? " " : record.payouts.map((payout) => PAYMENT_MODE_LABELS[payout.mode]).join(" + ") || " "} />
          <KpiCard compact title="Deduction" value={`${record.lines[0]?.deductionPercent ?? 0}%`} icon={Coins} tone="ok" subtitle="Shop's deduction on the value" />
        </div>

        {record.customer && (
          <div className="flex flex-wrap gap-2">
            <Link href={`/customers/${record.customer.id}`} className={buttonClass("secondary")}>
              <UserRound className="size-4" aria-hidden />
              Open customer
            </Link>
            <Link href="/old-gold" className={buttonClass("ghost")}>
              Back to old gold
            </Link>
          </div>
        )}
      </div>

      <PrintPreview>
        <OldGoldReceipt record={record} />
      </PrintPreview>
    </div>
  );
}
