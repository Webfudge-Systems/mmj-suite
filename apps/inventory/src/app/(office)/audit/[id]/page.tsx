"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useAuth } from "@webfudge/auth/components";
import { CheckCircle2, ClipboardList, SearchX } from "lucide-react";
import { Alert, Badge, Button, Card, CardBody, CardHeader, KpiCard, PageHeader, ScanInput, Spinner, StatusBadge, Table, Td, Th, Tr } from "@webfudge/ui";
import type { StockAudit, StockItem } from "@webfudge/utils/api";
import { formatDateTime, formatWeight } from "@webfudge/utils/formatters";
import { pieces } from "@/lib/labels";
import { errorMessage, useApi, useResource } from "@/lib/api";

type Verdict = "expected" | "duplicate" | "elsewhere" | "unknown";
type Scan = { verdict: Verdict; message: string; code: string };

const VERDICT_STYLE: Record<Verdict, string> = {
  expected: "bg-ok-soft text-ok",
  duplicate: "bg-sunk text-ash",
  elsewhere: "bg-warn-soft text-warn",
  unknown: "bg-risk-soft text-risk",
};

function ItemTable({ items, title, description }: { items: StockItem[]; title: string; description: string }) {
  if (!items.length) return null;
  return (
    <Card>
      <CardHeader title={`${title} (${items.length})`} description={description} />
      <Table minWidth={640}>
        <thead>
          <tr>
            <Th>Tag</Th>
            <Th>Design</Th>
            <Th align="right">Net</Th>
            <Th>System location</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <Tr key={item.id}>
              <Td>
                <Link href={`/stock/${item.id}`} className="font-mono font-semibold hover:underline">
                  {item.tagNumber}
                </Link>
              </Td>
              <Td>{item.design?.name}</Td>
              <Td align="right">{formatWeight(item.netWeight)}</Td>
              <Td className="font-mono text-[12px]">{item.location?.fullCode ?? item.branch?.name ?? "—"}</Td>
              <Td>
                <StatusBadge status={item.status} />
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

export default function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const api = useApi();
  const { hasRole } = useAuth();
  const { data, error, loading, setData } = useResource<{ data: StockAudit }>(`/stock/audits/${id}`);
  const [scans, setScans] = useState<Scan[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const audit = data?.data;

  async function scan(code: string) {
    setActionError(null);
    try {
      const response = await api.post<{ data: { verdict: Verdict; message: string; tagNumber: string | null; audit: StockAudit } }>(`/stock/audits/${id}/scan`, { code });
      setScans((current) => [{ verdict: response.data.verdict, message: response.data.message, code: response.data.tagNumber ?? code }, ...current].slice(0, 50));
      setData({ data: response.data.audit });
    } catch (cause) {
      setActionError(errorMessage(cause));
    }
  }

  async function close() {
    setClosing(true);
    setActionError(null);
    try {
      const response = await api.post<{ data: StockAudit }>(`/stock/audits/${id}/close`, {});
      setData({ data: response.data });
    } catch (cause) {
      setActionError(errorMessage(cause));
    } finally {
      setClosing(false);
    }
  }

  if (loading) return <Spinner className="text-navy" />;
  if (error || !audit) return <p className="text-sm text-risk">{error ?? "Count not found."}</p>;
  const area = audit.location ? audit.location.fullCode : `All of ${audit.branch?.name}`;
  const left = audit.expectedCount - audit.foundCount;
  const result = audit.result;

  return (
    <div className="grid gap-6">
      <PageHeader
        title={`Count of ${area}`}
        description={`Started ${formatDateTime(audit.startedAt)}${audit.startedBy ? ` by ${audit.startedBy}` : ""}${audit.closedAt ? `. Closed ${formatDateTime(audit.closedAt)}${audit.closedBy ? ` by ${audit.closedBy}` : ""}` : ""}.`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard compact title="Expected" value={audit.expectedCount} icon={ClipboardList} subtitle="Pieces the system has here" />
        <KpiCard compact title="Found" value={audit.foundCount} icon={CheckCircle2} tone="ok" subtitle="Scanned in this count" />
        <KpiCard compact title="Still to find" value={left} icon={SearchX} tone={left ? "warn" : "ok"} subtitle={left ? "Not scanned yet" : "All accounted for"} />
      </div>

      {audit.status === "open" && hasRole("owner", "branch_manager", "stock_keeper") && (
        <Card>
          <CardHeader title="Scan every piece in the area" description="Each scan says straight away whether the piece belongs here." />
          <CardBody className="grid gap-4">
            <ScanInput id="audit-scan" onScan={scan} />
            {actionError && <Alert tone="risk">{actionError}</Alert>}
            {scans.length > 0 && (
              <ul className="grid max-h-72 gap-1 overflow-y-auto">
                {scans.map((entry, index) => (
                  <li key={`${entry.code}-${index}`} className={`flex flex-wrap gap-x-3 rounded-md px-3 py-1.5 text-[13px] ${VERDICT_STYLE[entry.verdict]}`}>
                    <span className="font-mono font-semibold">{entry.code}</span>
                    <span>{entry.message}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
              <Button variant={left === 0 ? "primary" : "secondary"} onClick={close} loading={closing}>
                Finish count
              </Button>
              <span className="text-[13px] text-ash">
                {left === 0 ? "Everything expected has been found." : `${pieces(left)} not scanned yet will be reported as missing.`}
              </span>
            </div>
          </CardBody>
        </Card>
      )}

      {result && (
        <>
          {result.missing.length === 0 && result.misplaced.length === 0 && result.unknown.length === 0 ? (
            <Alert tone="ok" title="Everything is where the system says it is">
              {pieces(result.matched)} counted.
            </Alert>
          ) : (
            <Alert tone="warn" title="Differences found">
              Nothing in stock was changed by this count. Check the missing pieces first: they are often with a salesperson or in the wrong tray.
            </Alert>
          )}
          <ItemTable items={result.missing} title="Missing" description="Expected here but not scanned." />
          <ItemTable items={result.misplaced} title="Found but the system has them elsewhere" description="Scan them into this tray from Locations if this is where they belong." />
          {result.unknown.length > 0 && (
            <Card>
              <CardHeader title={`Unknown codes (${result.unknown.length})`} description="Scanned codes that match no piece. Often an old tag that was never imported." />
              <CardBody className="flex flex-wrap gap-2">
                {result.unknown.map((code) => (
                  <Badge key={code} tone="risk">
                    <span className="font-mono">{code}</span>
                  </Badge>
                ))}
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
