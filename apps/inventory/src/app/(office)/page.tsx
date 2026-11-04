"use client";

import Link from "next/link";
import { useAuth } from "@webfudge/auth/components";
import { PURITIES, RATE_EDITOR_ROLES } from "@webfudge/config";
import { useCurrentRates } from "@webfudge/hooks";
import { Badge, Card, CardBody, CardHeader, PageHeader, RateBoard, Table, Td, Th, Tr, buttonClass } from "@webfudge/ui";
import type { StockSummary } from "@webfudge/utils/api";
import { formatDate, formatDateTime, formatWeight } from "@webfudge/utils/formatters";
import { useResource } from "@/lib/api";
import { useBranch } from "@/lib/branch";
import { API_URL } from "@/lib/env";

function isToday(iso: string) {
  return formatDate(iso) === formatDate(new Date().toISOString());
}

function Stat({ label, value, href, tone }: { label: string; value: number | string; href?: string; tone?: "warn" }) {
  const body = (
    <div className="grid gap-1 rounded-[var(--radius-panel)] border border-line bg-surface px-4 py-3">
      <span className={`text-2xl font-semibold tabular-nums ${tone === "warn" ? "text-warn" : "text-navy"}`}>{value}</span>
      <span className="text-[13px] text-ash">{label}</span>
    </div>
  );
  return href ? (
    <Link href={href} className="rounded-[var(--radius-panel)] transition-shadow hover:shadow-md">
      {body}
    </Link>
  ) : (
    body
  );
}

export default function DashboardPage() {
  const { staff, hasRole } = useAuth();
  const { branch } = useBranch();
  const { card, loading, error } = useCurrentRates(API_URL);
  const summary = useResource<{ data: StockSummary }>(branch ? `/stock/summary?branchId=${branch.id}` : null);
  const stock = summary.data?.data;
  const canPublish = hasRole(...RATE_EDITOR_ROLES);
  const stale = card && !isToday(card.effectiveFrom);
  const order = PURITIES.map((purity) => purity.code);

  return (
    <div className="grid gap-6">
      <PageHeader
        title={`Good day, ${staff?.fullName?.split(" ")[0] || staff?.username}`}
        description={branch ? `${branch.name} branch` : undefined}
        actions={
          <Link href="/receive/new" className={buttonClass("primary")}>
            Receive stock
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Pieces in stock" value={stock?.inStock ?? "–"} href="/stock" />
        <Stat label="Waiting for a tray" value={stock?.untrayed ?? "–"} href="/stock?untrayed=true" tone={stock?.untrayed ? "warn" : undefined} />
        <Stat label="With salespeople" value={stock?.withStaff ?? "–"} />
        <Stat label="Received today" value={stock?.receivedToday ?? "–"} href="/receive" />
        <Stat label="In transit" value={stock?.inTransit ?? "–"} href="/transfers" />
        <Stat label="Arriving here" value={stock?.incomingTransfers ?? "–"} href="/transfers" />
      </div>
      {summary.error && <p className="text-[13px] text-risk">{summary.error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Today's rates"
            description="The website, tablets and billing counter all price from this card."
            action={stale ? <Badge tone="warn">Not updated today</Badge> : card ? <Badge tone="ok">Updated today</Badge> : null}
          />
          <CardBody className="grid gap-4">
            <RateBoard card={card} loading={loading} error={error} />
            {canPublish && (
              <Link href="/rates" className={buttonClass(stale || !card ? "gold" : "secondary", "md", "justify-self-start")}>
                {card ? "Publish new rates" : "Publish the first rates"}
              </Link>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Stock by purity"
            description={stock?.lastAuditAt ? `Last count closed ${formatDateTime(stock.lastAuditAt)}` : "No stock count closed yet"}
          />
          {stock && stock.byPurity.length ? (
            <Table minWidth={360}>
              <thead>
                <tr>
                  <Th>Purity</Th>
                  <Th align="right">Pieces</Th>
                  <Th align="right">Net weight</Th>
                  <Th align="right">Gross weight</Th>
                </tr>
              </thead>
              <tbody>
                {[...stock.byPurity]
                  .sort((a, b) => order.indexOf(a.purity) - order.indexOf(b.purity))
                  .map((row) => (
                    <Tr key={row.purity}>
                      <Td>{PURITIES.find((purity) => purity.code === row.purity)?.label ?? row.purity}</Td>
                      <Td align="right">{row.pieces}</Td>
                      <Td align="right">{formatWeight(row.netWeight)}</Td>
                      <Td align="right">{formatWeight(row.grossWeight)}</Td>
                    </Tr>
                  ))}
              </tbody>
            </Table>
          ) : (
            <CardBody>
              <p className="text-[13px] text-ash">
                No pieces in stock yet. <Link href="/receive/import" className="font-semibold text-navy underline">Import your current stock</Link> or{" "}
                <Link href="/receive/new" className="font-semibold text-navy underline">receive new pieces</Link>.
              </p>
            </CardBody>
          )}
        </Card>
      </div>
    </div>
  );
}
