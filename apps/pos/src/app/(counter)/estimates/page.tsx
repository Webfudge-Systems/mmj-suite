"use client";

import { useState } from "react";
import Link from "next/link";
import { errorMessage, useApi, useBranch, useResource } from "@webfudge/auth/components";
import { Alert, Badge, Button, Card, EmptyState, PageHeader, Select, Spinner, Table, Td, Th, Tr, buttonClass } from "@webfudge/ui";
import type { Estimate } from "@webfudge/utils/api";
import { formatDateTime } from "@webfudge/utils/formatters";

const STATUS = { open: { label: "Waiting", tone: "gold" }, billed: { label: "Billed", tone: "ok" }, cancelled: { label: "Cancelled", tone: "neutral" } } as const;

export default function EstimatesPage() {
  const api = useApi();
  const { branch } = useBranch();
  const [status, setStatus] = useState("open");
  const estimates = useResource<{ data: Estimate[] }>(branch ? `/sales/estimates?branchId=${branch.id}${status ? `&status=${status}` : ""}` : null);
  const [error, setError] = useState<string | null>(null);

  async function cancel(estimate: Estimate) {
    setError(null);
    try {
      await api.post(`/sales/estimates/${estimate.id}/cancel`, {});
      estimates.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Estimates"
        description="Pieces sent from the showroom tablets. Open one to bill it. Cancelling hands the pieces back to the salesperson."
        actions={
          <Button variant="secondary" onClick={estimates.reload}>
            Refresh
          </Button>
        }
      />
      <Select id="estimate-status" aria-label="Show" value={status} onChange={(event) => setStatus(event.target.value)} className="max-w-[200px]">
        <option value="open">Waiting to be billed</option>
        <option value="billed">Billed</option>
        <option value="cancelled">Cancelled</option>
        <option value="">All</option>
      </Select>
      {error && <Alert tone="risk">{error}</Alert>}
      <Card>
        {estimates.loading ? (
          <div className="grid place-items-center p-10 text-navy">
            <Spinner />
          </div>
        ) : !estimates.data?.data.length ? (
          <EmptyState title={status === "open" ? "Nothing waiting" : "No estimates"} description="Salespeople send pieces here from the tablet." />
        ) : (
          <Table minWidth={720}>
            <thead>
              <tr>
                <Th>Estimate</Th>
                <Th>Customer</Th>
                <Th>Pieces</Th>
                <Th>From</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {estimates.data.data.map((estimate) => (
                <Tr key={estimate.id}>
                  <Td>
                    <span className="font-mono font-semibold">{estimate.number}</span>
                    <span className="block text-[12px] text-ash">{formatDateTime(estimate.createdAt)}</span>
                  </Td>
                  <Td>{estimate.customer ? `${estimate.customer.name} · ${estimate.customer.phone}` : "Not given"}</Td>
                  <Td className="font-mono text-[12px]">{estimate.lines.map((line) => line.tagNumber).join(", ")}</Td>
                  <Td>{estimate.salesperson ?? "—"}</Td>
                  <Td>
                    <Badge tone={STATUS[estimate.status].tone}>{STATUS[estimate.status].label}</Badge>
                    {estimate.invoice && (
                      <Link href={`/invoices/${estimate.invoice.id}`} className="block font-mono text-[12px] underline">
                        {estimate.invoice.number}
                      </Link>
                    )}
                  </Td>
                  <Td>
                    {estimate.status === "open" && (
                      <span className="flex gap-2">
                        <Link href={`/?estimate=${estimate.id}`} className={buttonClass("primary", "sm")}>
                          Bill
                        </Link>
                        <Button size="sm" variant="ghost" onClick={() => cancel(estimate)}>
                          Cancel
                        </Button>
                      </span>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
