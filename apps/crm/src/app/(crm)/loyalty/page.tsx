"use client";

import Link from "next/link";
import { Gift, Settings2 } from "lucide-react";
import { useResource } from "@webfudge/auth/components";
import { Alert, Card, CardHeader, EmptyState, KpiCard, PageHeader, Spinner, Table, Td, Th, Tr, buttonClass } from "@webfudge/ui";
import type { CrmDashboard, LoyaltyEntry, LoyaltyRules } from "@webfudge/utils/api";
import { LOYALTY_KIND_LABELS } from "@webfudge/utils/api";
import { formatDateTime, formatINR } from "@webfudge/utils/formatters";

export default function LoyaltyPage() {
  const ledger = useResource<{ data: LoyaltyEntry[] }>("/crm/loyalty");
  const settings = useResource<{ data: { loyalty: LoyaltyRules } }>("/crm/settings");
  const dashboard = useResource<{ data: CrmDashboard }>("/crm/dashboard");
  const rules = settings.data?.data.loyalty;
  const totals = dashboard.data?.data.loyalty;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Loyalty points"
        description="Customers earn points on every bill. Points are redeemed from the customer's profile and become an advance the counter takes off the next bill."
        actions={
          <Link href="/settings" className={buttonClass("secondary")}>
            <Settings2 className="size-4" aria-hidden />
            Rules
          </Link>
        }
      />

      {rules && !rules.enabled && <Alert tone="warn" title="Loyalty is switched off">New bills earn no points. Switch it on in Settings.</Alert>}

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard compact title="Earn rate" value={rules ? `1 pt / ${formatINR(rules.rupeesPerPoint)}` : "–"} icon={Gift} subtitle="Of the bill total" />
        <KpiCard compact title="Points out" value={totals ? totals.pointsOutstanding.toLocaleString("en-IN") : "–"} icon={Gift} tone="gold" subtitle={totals ? `Worth ${formatINR(totals.valueOutstanding)}` : undefined} />
        <KpiCard compact title="Members with points" value={totals?.members ?? "–"} icon={Gift} tone="ok" subtitle={rules ? `Redeem from ${rules.minRedeem} points` : undefined} />
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Latest movements" description="Every point earned, taken back, redeemed or corrected. Entries are never edited." />
        {ledger.loading && !ledger.data ? (
          <div className="grid place-items-center py-12 text-navy">
            <Spinner />
          </div>
        ) : !ledger.data?.data.length ? (
          <EmptyState icon={Gift} title="No points yet" description="Points appear here as soon as a bill is issued to a customer." />
        ) : (
          <Table minWidth={720}>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Customer</Th>
                <Th>What</Th>
                <Th align="right">Points</Th>
                <Th align="right">Balance</Th>
                <Th>By</Th>
              </tr>
            </thead>
            <tbody>
              {ledger.data.data.map((entry) => (
                <Tr key={entry.id}>
                  <Td className="whitespace-nowrap">{formatDateTime(entry.createdAt)}</Td>
                  <Td>
                    {entry.customer ? (
                      <Link href={`/customers/${entry.customer.id}`} className="font-semibold text-ink hover:underline">
                        {entry.customer.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>
                    <span className="grid leading-tight">
                      <span>
                        {LOYALTY_KIND_LABELS[entry.kind]}
                        {entry.reference ? ` · ${entry.reference}` : ""}
                      </span>
                      {entry.note && <span className="text-[12px] text-ash">{entry.note}</span>}
                    </span>
                  </Td>
                  <Td align="right" className={entry.points > 0 ? "text-ok" : "text-risk"}>
                    {entry.points > 0 ? `+${entry.points}` : entry.points}
                  </Td>
                  <Td align="right">{entry.balance}</Td>
                  <Td className="text-ash">{entry.by ?? "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
