"use client";

import { use } from "react";
import Link from "next/link";
import { CalendarClock, FilePlus2, Lock, Phone, Printer, UserRound, Wallet } from "lucide-react";
import { useApi, useAuth, useResource } from "@webfudge/auth/components";
import { Alert, Button, Card, CardBody, CardHeader, DetailHero, HeroFact, KpiCard, PageHeader, PrintPreview, Spinner, StatusPill, buttonClass } from "@webfudge/ui";
import type { AdvanceDetail } from "@webfudge/utils/api";
import { formatDate, formatINR, formatWeight } from "@webfudge/utils/formatters";
import { ADVANCE_STATUS, AdvanceReceipt } from "@/components/advance-receipt";
import { PayoutForm } from "@/components/payout-form";

export default function AdvancePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = use(params);
  const { new: justTaken } = use(searchParams);
  const api = useApi();
  const { hasRole } = useAuth();
  const { data, error, loading, reload } = useResource<{ data: AdvanceDetail }>(`/sales/advances/${id}`);
  const advance = data?.data;

  if (loading && !advance) return <Spinner className="text-navy" />;
  if (error || !advance) return <p className="text-sm text-risk">{error ?? "Advance not found."}</p>;
  const status = ADVANCE_STATUS[advance.status];
  const gramsLeft = Math.max(0, (advance.lockedWeight ?? 0) - advance.lockedWeightUsed);
  const ended = advance.status === "open" && advance.validUntil && advance.validUntil < new Date().toISOString().slice(0, 10);

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 print:hidden">
        <PageHeader title={<span className="font-mono">{advance.number}</span>} description={`Advance from ${advance.customer?.name ?? "a customer"}. Print the receipt for them.`} />
        {justTaken && (
          <Alert tone="ok" title={`${advance.number} taken`}>
            Print the receipt for the customer. The advance comes off their next bill automatically.
          </Alert>
        )}
        <DetailHero
          icon={Wallet}
          title={<span className="font-mono">{advance.number}</span>}
          badges={
            <>
              <StatusPill tone={status.tone === "neutral" ? "neutral" : status.tone}>{status.label}</StatusPill>
              {ended && <StatusPill tone="risk">Ended</StatusPill>}
            </>
          }
          meta={
            <>
              {advance.customer && (
                <HeroFact icon={UserRound}>
                  <Link href={`/customers/${advance.customer.id}`} className="font-semibold text-ink hover:text-navy">
                    {advance.customer.name}
                  </Link>
                </HeroFact>
              )}
              {advance.customer && <HeroFact icon={Phone}>{advance.customer.phone}</HeroFact>}
              {advance.validUntil && <HeroFact icon={CalendarClock}>Valid until {formatDate(advance.validUntil)}</HeroFact>}
            </>
          }
          stat={{ label: "Left to use", value: formatINR(advance.balance), note: `of ${formatINR(advance.amount)} paid on ${formatDate(advance.createdAt)}` }}
        />

        <div className="flex flex-wrap gap-2">
          <Button variant="gold" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden />
            Print receipt
          </Button>
          {advance.status === "open" && advance.customer && (
            <Link href={`/?customer=${advance.customer.id}`} className={buttonClass("primary")}>
              <FilePlus2 className="size-4" aria-hidden />
              Bill this customer
            </Link>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard compact title="Paid" value={formatINR(advance.amount)} icon={Wallet} subtitle={`${advance.payments.length} ${advance.payments.length === 1 ? "payment" : "payments"}`} />
          <KpiCard compact title="Used on bills" value={formatINR(advance.amount - advance.balance)} icon={FilePlus2} tone="ok" subtitle={`${(advance.usage ?? []).filter((entry) => entry.invoice).length} bills`} />
          <KpiCard
            compact
            title="Rate booked"
            value={advance.lockedPurity ? formatWeight(gramsLeft) : "None"}
            icon={Lock}
            tone="gold"
            subtitle={advance.lockedPurity && advance.lockedRate ? `${advance.lockedPurity} at ${formatINR(advance.lockedRate)}/g, left` : "Billed at the day's rate"}
          />
        </div>

        {advance.status === "open" && hasRole("owner", "branch_manager") && (
          <Card>
            <CardHeader title="Refund this advance" description="Pays back what is left. Owner or branch manager only." />
            <CardBody>
              <PayoutForm
                due={advance.balance}
                label={`Refund ${formatINR(advance.balance)}`}
                submitLabel="Refund advance"
                onSubmit={async (payouts, cashOverride) => {
                  await api.post(`/sales/advances/${advance.id}/refund`, { payouts, ...(cashOverride ? { cashOverride } : {}) });
                  reload();
                }}
              />
            </CardBody>
          </Card>
        )}
      </div>

      <PrintPreview>
        <AdvanceReceipt advance={advance} />
      </PrintPreview>
    </div>
  );
}
