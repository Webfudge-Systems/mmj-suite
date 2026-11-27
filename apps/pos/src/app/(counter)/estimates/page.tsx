"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Clock, FilePlus2, ReceiptText, RefreshCw, UsersRound, X } from "lucide-react";
import { errorMessage, useApi, useBranch, useResource } from "@webfudge/auth/components";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  KpiCard,
  PageHeader,
  ResultsCount,
  Spinner,
  StatusPill,
  Table,
  Tabs,
  Td,
  Th,
  ToolbarActions,
  ToolbarButton,
  ToolbarSearch,
  Tr,
  buttonClass,
} from "@webfudge/ui";
import type { Estimate } from "@webfudge/utils/api";
import { formatDateTime } from "@webfudge/utils/formatters";
import { initials } from "@/components/customer-avatar";
import { ESTIMATE_STATUS, waited } from "@/components/estimate-status";

type View = "open" | "billed" | "cancelled" | "all";

export default function EstimatesPage() {
  const api = useApi();
  const router = useRouter();
  const { branch } = useBranch();
  const [view, setView] = useState<View>("open");
  const [q, setQ] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const estimates = useResource<{ data: Estimate[] }>(branch ? `/sales/estimates?branchId=${branch.id}` : null);
  const [error, setError] = useState<string | null>(null);
  const { reload } = estimates;

  // Salespeople send estimates from the floor all day: look again every 30 seconds.
  useEffect(() => {
    const timer = window.setInterval(() => {
      reload();
      setNow(Date.now());
    }, 30000);
    return () => window.clearInterval(timer);
  }, [reload]);

  async function cancel(estimate: Estimate) {
    setError(null);
    try {
      await api.post(`/sales/estimates/${estimate.id}/cancel`, {});
      reload();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  const all = estimates.data?.data ?? [];
  const open = all.filter((estimate) => estimate.status === "open");
  const billed = all.filter((estimate) => estimate.status === "billed");
  const cancelled = all.filter((estimate) => estimate.status === "cancelled");
  const today = new Date(now).toISOString().slice(0, 10);
  const billedToday = billed.filter((estimate) => (estimate.billedAt ?? "").slice(0, 10) === today).length;
  const sentToday = all.filter((estimate) => estimate.createdAt.slice(0, 10) === today);
  const oldest = open.reduce<string | null>((first, estimate) => (!first || estimate.createdAt < first ? estimate.createdAt : first), null);
  const inView = view === "open" ? open : view === "billed" ? billed : view === "cancelled" ? cancelled : all;
  const needle = q.trim().toLowerCase();
  const rows = inView.filter(
    (estimate) =>
      !needle ||
      [estimate.number, estimate.customer?.name, estimate.customer?.phone, estimate.salesperson, estimate.invoice?.number, ...estimate.lines.map((line) => line.tagNumber)].some((value) => value?.toLowerCase().includes(needle)),
  );

  return (
    <div className="grid gap-6">
      <PageHeader title="Estimates" description="Pieces sent from the showroom tablets. Open one to bill it. Cancelling hands the pieces back to the salesperson." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          compact
          title="Waiting to be billed"
          value={estimates.data ? open.length : "–"}
          icon={ClipboardList}
          tone={open.length ? "gold" : "ok"}
          subtitle={`${open.reduce((sum, estimate) => sum + estimate.lines.length, 0)} pieces at the counter`}
        />
        <KpiCard compact title="Longest wait" value={oldest ? waited(oldest, now) : "—"} icon={Clock} tone={oldest && now - Date.parse(oldest) > 30 * 60000 ? "warn" : "navy"} subtitle={oldest ? "Since it was sent" : "Nobody waiting"} />
        <KpiCard compact title="Billed today" value={estimates.data ? billedToday : "–"} icon={ReceiptText} tone="ok" subtitle={`of ${sentToday.length} sent today`} />
        <KpiCard compact title="Salespeople today" value={estimates.data ? new Set(sentToday.map((estimate) => estimate.salesperson).filter(Boolean)).size : "–"} icon={UsersRound} subtitle="Sent at least one estimate" />
      </div>

      <Tabs<View>
        label="Estimate status"
        active={view}
        onChange={setView}
        tabs={[
          { key: "open", label: "Waiting", count: open.length },
          { key: "billed", label: "Billed", count: billed.length },
          { key: "cancelled", label: "Cancelled", count: cancelled.length },
          { key: "all", label: "All", count: all.length },
        ]}
        actions={
          <ToolbarActions>
            <ToolbarSearch value={q} onChange={setQ} placeholder="Estimate, customer, tag or salesperson…" />
            <ToolbarButton
              icon={RefreshCw}
              label="Refresh"
              onClick={() => {
                reload();
                setNow(Date.now());
              }}
            />
          </ToolbarActions>
        }
      />
      {error && <Alert tone="risk">{error}</Alert>}
      {estimates.data && <ResultsCount shown={rows.length} total={inView.length} noun="estimate" />}

      <Card className="overflow-hidden">
        {estimates.loading && !estimates.data ? (
          <div className="grid place-items-center p-10 text-navy">
            <Spinner />
          </div>
        ) : estimates.error ? (
          <p className="p-5 text-[13px] text-risk">{estimates.error}</p>
        ) : !rows.length ? (
          <EmptyState
            icon={ClipboardList}
            title={q ? "No estimate matches" : view === "open" ? "Nothing waiting" : "No estimates"}
            description={q ? "Try another number, name or tag." : "Salespeople send pieces here from the tablet. This list checks for new ones every 30 seconds."}
          />
        ) : (
          <Table minWidth={960}>
            <thead>
              <tr>
                <Th>Estimate</Th>
                <Th>Customer</Th>
                <Th>Pieces</Th>
                <Th>Salesperson</Th>
                <Th>Status</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((estimate) => {
                const status = ESTIMATE_STATUS[estimate.status];
                return (
                  <Tr key={estimate.id} className="cursor-pointer" onClick={() => router.push(`/estimates/${estimate.id}`)}>
                    <Td>
                      <Link href={`/estimates/${estimate.id}`} className="grid leading-tight" onClick={(event) => event.stopPropagation()}>
                        <span className="font-mono font-semibold text-ink hover:underline">{estimate.number}</span>
                        <span className="text-[12px] text-ash">
                          {formatDateTime(estimate.createdAt)}
                          {estimate.status === "open" ? ` · waiting ${waited(estimate.createdAt, now)}` : ""}
                        </span>
                      </Link>
                    </Td>
                    <Td>
                      {estimate.customer ? (
                        <span className="flex items-center gap-2.5">
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-navy to-navy-deep text-[11px] font-bold text-gold" aria-hidden>
                            {initials(estimate.customer.name)}
                          </span>
                          <span className="grid leading-tight">
                            <span className="font-semibold text-ink">{estimate.customer.name}</span>
                            <span className="text-[12px] text-ash tabular-nums">{estimate.customer.phone}</span>
                          </span>
                        </span>
                      ) : (
                        <span className="text-ash">Not given</span>
                      )}
                    </Td>
                    <Td>
                      <span className="grid leading-tight">
                        <span className="font-semibold text-ink">
                          {estimate.lines.length} {estimate.lines.length === 1 ? "piece" : "pieces"}
                        </span>
                        <span className="line-clamp-1 max-w-[220px] font-mono text-[11.5px] text-ash">{estimate.lines.map((line) => line.tagNumber).join(", ")}</span>
                      </span>
                    </Td>
                    <Td>{estimate.salesperson ?? <span className="text-ash">—</span>}</Td>
                    <Td>
                      <span className="grid gap-1">
                        <span className="justify-self-start">
                          <StatusPill tone={status.tone}>{status.label}</StatusPill>
                        </span>
                        {estimate.invoice && (
                          <Link href={`/invoices/${estimate.invoice.id}`} className="font-mono text-[12px] text-navy hover:underline" onClick={(event) => event.stopPropagation()}>
                            {estimate.invoice.number}
                          </Link>
                        )}
                      </span>
                    </Td>
                    <Td align="right">
                      {estimate.status === "open" && (
                        <span className="flex justify-end gap-1.5" onClick={(event) => event.stopPropagation()}>
                          <Link href={`/?estimate=${estimate.id}`} className={buttonClass("primary", "sm")}>
                            <FilePlus2 className="size-3.5" aria-hidden />
                            Bill
                          </Link>
                          <Button size="sm" variant="ghost" onClick={() => cancel(estimate)}>
                            <X className="size-3.5" aria-hidden />
                            Cancel
                          </Button>
                        </span>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
