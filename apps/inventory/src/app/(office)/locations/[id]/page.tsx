"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useAuth } from "@webfudge/auth/components";
import { Alert, Button, Card, CardBody, CardHeader, EmptyState, Field, Input, PageHeader, ScanInput, Spinner, Table, Td, Th, Tr } from "@webfudge/ui";
import type { ScanResult, StockItem, StockLocation } from "@webfudge/utils/api";
import { LOCATION_KIND_LABELS } from "@webfudge/utils/api";
import { formatWeight } from "@webfudge/utils/formatters";
import { PrintSheet, TrayLabel } from "@/components/labels";
import { ScanLog } from "@/components/scan-log";
import { pieces } from "@/lib/labels";
import { errorMessage, useApi, useResource } from "@/lib/api";

type Detail = StockLocation & { items: StockItem[] };

export default function LocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const api = useApi();
  const { hasRole } = useAuth();
  const canMove = hasRole("owner", "branch_manager", "stock_keeper");
  const { data, error, loading, reload } = useResource<{ data: Detail }>(`/stock/locations/${id}`);
  const [slot, setSlot] = useState("");
  const [results, setResults] = useState<ScanResult[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const location = data?.data;

  async function scan(code: string) {
    setScanError(null);
    try {
      const response = await api.post<{ data: { results: ScanResult[] } }>("/stock/move", { locationId: Number(id), codes: [code], slot: slot || undefined });
      setResults((current) => [...response.data.results, ...current]);
      reload();
    } catch (cause) {
      setScanError(errorMessage(cause));
    }
  }

  if (loading) return <Spinner className="text-navy" />;
  if (error || !location) return <p className="text-sm text-risk">{error ?? "Location not found."}</p>;
  const holds = ["tray", "safe", "back_office"].includes(location.kind);
  const netTotal = location.items.reduce((sum, item) => sum + item.netWeight, 0);

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 print:hidden">
        <PageHeader
          title={<span className="font-mono">{location.fullCode}</span>}
          description={`${LOCATION_KIND_LABELS[location.kind]}${location.name ? ` · ${location.name}` : ""} · ${pieces(location.items.length)} · ${formatWeight(netTotal)} net`}
          actions={
            <Button variant="secondary" onClick={() => window.print()}>
              Print label
            </Button>
          }
        />

        {holds && canMove && (
          <Card>
            <CardHeader title="Put pieces here" description="Scan each piece's tag. Pieces from other trays in this branch are moved here and the move is recorded." />
            <CardBody className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                <ScanInput id="tray-scan" onScan={scan} />
                <Field label="Slot (optional)" htmlFor="tray-slot">
                  <Input id="tray-slot" value={slot} onChange={(event) => setSlot(event.target.value)} placeholder="Like B4" className="font-mono uppercase" />
                </Field>
              </div>
              {scanError && <Alert tone="risk">{scanError}</Alert>}
              <ScanLog results={results} />
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader title="In this location" />
          {location.items.length === 0 ? (
            <EmptyState title="Empty" description={holds ? "Scan pieces above to put them here." : "Pieces sit in the trays inside it."} />
          ) : (
            <Table minWidth={680}>
              <thead>
                <tr>
                  <Th>Tag</Th>
                  <Th>Design</Th>
                  <Th>Purity</Th>
                  <Th align="right">Net</Th>
                  <Th>HUID</Th>
                  <Th>Place</Th>
                </tr>
              </thead>
              <tbody>
                {location.items.map((item) => (
                  <Tr key={item.id}>
                    <Td>
                      <Link href={`/stock/${item.id}`} className="font-mono font-semibold hover:underline">
                        {item.tagNumber}
                      </Link>
                    </Td>
                    <Td>{item.design?.name}</Td>
                    <Td>{item.purity}</Td>
                    <Td align="right">{formatWeight(item.netWeight)}</Td>
                    <Td className="font-mono">{item.huid ?? "—"}</Td>
                    <Td className="font-mono text-[12px]">
                      {item.location?.id !== location.id ? item.location?.code : ""}
                      {item.slot ? ` ${item.slot}` : ""}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      <div className="hidden print:block">
        <PrintSheet width={50} height={25}>
          <TrayLabel location={location} />
        </PrintSheet>
      </div>
    </div>
  );
}
