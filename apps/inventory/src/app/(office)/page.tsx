"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { ArrowDownToLine, Boxes, Inbox, PackagePlus, Truck, UserRound } from "lucide-react";
import { useAuth } from "@webfudge/auth/components";
import { PURITIES, RATE_EDITOR_ROLES } from "@webfudge/config";
import { useCurrentRates } from "@webfudge/hooks";
import { Badge, Card, CardBody, CardHeader, KpiCard, PageHeader, RateBoard, Table, Td, Th, Tr, buttonClass, type KpiTone } from "@webfudge/ui";
import type { StockSummary } from "@webfudge/utils/api";
import { formatDate, formatDateTime, formatWeight } from "@webfudge/utils/formatters";
import { useResource } from "@/lib/api";
import { useBranch } from "@/lib/branch";
import { API_URL } from "@/lib/env";

function isToday(iso: string) {
  return formatDate(iso) === formatDate(new Date().toISOString());
}

function Stat({ label, value, href, icon, tone, note }: { label: string; value: number | string; href?: string; icon: ComponentType<{ className?: string }>; tone?: KpiTone; note?: string }) {
  const card = <KpiCard title={label} value={value} icon={icon} tone={tone} subtitle={note} compact hoverable={Boolean(href)} />;
  return href ? (
    <Link href={href} className="rounded-xl">
      {card}
    </Link>
  ) : (
    card
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
            <PackagePlus className="size-4" aria-hidden />
            Receive stock
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Pieces in stock" value={stock?.inStock ?? "–"} href="/stock" icon={Boxes} note="Across every tray in this branch" />
        <Stat
          label="Waiting for a tray"
          value={stock?.untrayed ?? "–"}
          href="/stock?untrayed=true"
          icon={Inbox}
          tone={stock?.untrayed ? "warn" : "navy"}
          note={stock?.untrayed ? "Put these away before the floor opens" : "Everything is in a tray"}
        />
        <Stat label="With salespeople" value={stock?.withStaff ?? "–"} icon={UserRound} tone="gold" note="Picked on the showroom tablets" />
        <Stat label="Received today" value={stock?.receivedToday ?? "–"} href="/receive" icon={PackagePlus} tone="ok" note="New pieces tagged today" />
        <Stat label="In transit" value={stock?.inTransit ?? "–"} href="/transfers" icon={Truck} note="Sent to the other branch" />
        <Stat label="Arriving here" value={stock?.incomingTransfers ?? "–"} href="/transfers" icon={ArrowDownToLine} tone="gold" note="Transfers to receive" />
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
