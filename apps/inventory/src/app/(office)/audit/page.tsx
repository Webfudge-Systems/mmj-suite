"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@webfudge/auth/components";
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState, Field, PageHeader, Pager, Select, Spinner, Table, Td, Th, Tr } from "@webfudge/ui";
import { ApiError, type Page, type StockAudit } from "@webfudge/utils/api";
import { LOCATION_KIND_LABELS } from "@webfudge/utils/api";
import { formatDateTime } from "@webfudge/utils/formatters";
import { useLocations } from "@/components/pickers";
import { errorMessage, useApi, useResource } from "@/lib/api";
import { useBranch } from "@/lib/branch";

export default function AuditsPage() {
  const router = useRouter();
  const api = useApi();
  const { hasRole } = useAuth();
  const { branch } = useBranch();
  const { locations } = useLocations(branch?.id);
  const [page, setPage] = useState(1);
  const audits = useResource<Page<StockAudit>>(`/stock/audits?page=${page}`);
  const [scope, setScope] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!branch) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ data: StockAudit }>("/stock/audits", { branchId: branch.id, locationId: scope ? Number(scope) : undefined });
      router.push(`/audit/${data.id}`);
    } catch (cause) {
      const open = cause instanceof ApiError ? (cause.details as { auditId?: number } | undefined)?.auditId : undefined;
      if (open) router.push(`/audit/${open}`);
      else setError(errorMessage(cause));
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Stock audit"
        description="Count what is physically there and compare it with the system. Counting a tray takes a minute; do the whole branch at day end."
      />

      {hasRole("owner", "branch_manager", "stock_keeper") && (
        <Card>
          <CardHeader title="Start a count" />
          <CardBody className="flex flex-wrap items-end gap-3">
            <Field label="What to count" htmlFor="audit-scope">
              <Select id="audit-scope" value={scope} onChange={(event) => setScope(event.target.value)} className="min-w-[280px]">
                <option value="">The whole of {branch?.name ?? "this branch"}</option>
                {locations
                  .filter((location) => location.isActive)
                  .map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.fullCode} · {LOCATION_KIND_LABELS[location.kind]}
                      {location.kind === "showcase" || location.kind === "counter" ? " and its trays" : ""}
                    </option>
                  ))}
              </Select>
            </Field>
            <Button onClick={start} loading={busy}>
              Start counting
            </Button>
            {error && <Alert tone="risk" className="w-full">{error}</Alert>}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Counts" />
        {audits.loading ? (
          <div className="grid place-items-center p-10 text-navy">
            <Spinner />
          </div>
        ) : !audits.data?.data.length ? (
          <EmptyState title="No counts yet" />
        ) : (
          <>
            <Table minWidth={720}>
              <thead>
                <tr>
                  <Th>Started</Th>
                  <Th>Area</Th>
                  <Th align="right">Found</Th>
                  <Th align="right">Missing</Th>
                  <Th align="right">Elsewhere</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {audits.data.data.map((audit) => (
                  <Tr key={audit.id} className="hover:bg-sunk/60">
                    <Td>
                      <Link href={`/audit/${audit.id}`} className="font-semibold hover:underline">
                        {formatDateTime(audit.startedAt)}
                      </Link>
                      {audit.startedBy && <span className="block text-[12px] text-ash">by {audit.startedBy}</span>}
                    </Td>
                    <Td className="font-mono text-[12px]">{audit.location?.fullCode ?? `All of ${audit.branch?.name}`}</Td>
                    <Td align="right">
                      {audit.foundCount}/{audit.expectedCount}
                    </Td>
                    <Td align="right">{audit.result ? audit.result.missing.length : "—"}</Td>
                    <Td align="right">{audit.result ? audit.result.misplaced.length + audit.result.unknown.length : "—"}</Td>
                    <Td>
                      {audit.status === "open" ? (
                        <Badge tone="gold">Counting</Badge>
                      ) : audit.result && audit.result.missing.length === 0 && audit.result.misplaced.length === 0 && audit.result.unknown.length === 0 ? (
                        <Badge tone="ok">All present</Badge>
                      ) : (
                        <Badge tone="warn">Differences</Badge>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pager pagination={audits.data.meta.pagination} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
