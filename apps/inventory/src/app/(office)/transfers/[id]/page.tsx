"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useAuth } from "@webfudge/auth/components";
import { Alert, Badge, Card, CardBody, CardHeader, Field, PageHeader, ScanInput, Spinner, Table, Td, Th, Tr } from "@webfudge/ui";
import type { ScanResult, Transfer } from "@webfudge/utils/api";
import { formatDateTime } from "@webfudge/utils/formatters";
import { LocationSelect, useLocations } from "@/components/pickers";
import { ScanLog } from "@/components/scan-log";
import { errorMessage, useApi, useResource } from "@/lib/api";
import { useBranch } from "@/lib/branch";
import { TRANSFER_STATUS } from "@/lib/labels";

export default function TransferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const api = useApi();
  const { hasRole } = useAuth();
  const { branch } = useBranch();
  const { data, error, loading, setData } = useResource<{ data: Transfer }>(`/stock/transfers/${id}`);
  const transfer = data?.data;
  const receivingHere = !!transfer && transfer.toBranch?.id === branch?.id && transfer.status !== "received";
  const { locations } = useLocations(receivingHere ? branch?.id : undefined);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);

  async function receive(code: string) {
    setScanError(null);
    try {
      const response = await api.post<{ data: { transfer: Transfer; results: ScanResult[] } }>(`/stock/transfers/${id}/receive`, {
        codes: [code],
        locationId: locationId ?? undefined,
      });
      setResults((current) => [...response.data.results, ...current]);
      setData({ data: response.data.transfer });
    } catch (cause) {
      setScanError(errorMessage(cause));
    }
  }

  if (loading) return <Spinner className="text-navy" />;
  if (error || !transfer) return <p className="text-sm text-risk">{error ?? "Transfer not found."}</p>;
  const status = TRANSFER_STATUS[transfer.status];

  return (
    <div className="grid gap-6">
      <PageHeader
        title={<span className="font-mono">{transfer.number}</span>}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={status.tone}>{status.label}</Badge>
            {transfer.fromBranch?.name} → {transfer.toBranch?.name} · sent {formatDateTime(transfer.dispatchedAt)}
            {transfer.dispatchedBy ? ` by ${transfer.dispatchedBy}` : ""}
          </span>
        }
      />
      {transfer.note && <p className="text-sm">“{transfer.note}”</p>}

      {receivingHere && hasRole("owner", "branch_manager", "stock_keeper") && (
        <Card>
          <CardHeader title="Receive at this branch" description="Scan each piece as it comes out of the bag." />
          <CardBody className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_280px]">
              <ScanInput id="receive-scan" onScan={receive} />
              <Field label="Put into" htmlFor="receive-tray">
                <LocationSelect id="receive-tray" locations={locations} value={locationId} onChange={setLocationId} emptyLabel="Decide later" />
              </Field>
            </div>
            {scanError && <Alert tone="risk">{scanError}</Alert>}
            <ScanLog results={results} />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Pieces" description={`${transfer.received} of ${transfer.pieces} received`} />
        <Table minWidth={520}>
          <thead>
            <tr>
              <Th>Tag</Th>
              <Th>Old tag</Th>
              <Th>Received</Th>
            </tr>
          </thead>
          <tbody>
            {transfer.lines.map((line) => (
              <Tr key={line.itemId}>
                <Td>
                  <Link href={`/stock/${line.itemId}`} className="font-mono font-semibold hover:underline">
                    {line.tagNumber}
                  </Link>
                </Td>
                <Td className="font-mono">{line.legacyTag ?? "—"}</Td>
                <Td>{line.receivedAt ? formatDateTime(line.receivedAt) : <Badge tone="navy">On the way</Badge>}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
