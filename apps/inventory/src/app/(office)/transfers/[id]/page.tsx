"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarClock, CheckCircle2, PackageCheck, Scale, ScanBarcode, Send, Truck, UserRound } from "lucide-react";
import { useAuth } from "@webfudge/auth/components";
import {
  ActivityLog,
  Alert,
  Badge,
  Card,
  CardBody,
  CardHeader,
  CopyText,
  DetailHero,
  Field,
  HeroFact,
  InfoGrid,
  InfoRow,
  KpiCard,
  PageHeader,
  ScanInput,
  Spinner,
  StatusPill,
  Table,
  Td,
  Th,
  Tr,
  type ActivityEntry,
} from "@webfudge/ui";
import type { ScanResult, StockItem, Transfer, TransferLine } from "@webfudge/utils/api";
import { formatDateTime, formatWeight } from "@webfudge/utils/formatters";
import { PieceThumb } from "@/components/photos";
import { LocationSelect, useLocations } from "@/components/pickers";
import { ScanLog } from "@/components/scan-log";
import { errorMessage, useApi, useResource } from "@/lib/api";
import { useBranch } from "@/lib/branch";
import { TRANSFER_STATUS } from "@/lib/labels";

/** The line in the shape PieceThumb reads: its own photo, else the design's. */
const thumbOf = (line: TransferLine) =>
  ({
    tagNumber: line.tagNumber,
    photos: line.photo ? [line.photo] : [],
    design: line.design ? { ...line.design, category: null, image: line.designImage ?? null } : null,
  }) as Pick<StockItem, "photos" | "design" | "tagNumber">;

export default function TransferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const api = useApi();
  const router = useRouter();
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

  if (loading && !transfer) return <Spinner className="text-navy" />;
  if (error || !transfer) return <p className="text-sm text-risk">{error ?? "Transfer not found."}</p>;
  const status = TRANSFER_STATUS[transfer.status];
  const waiting = transfer.pieces - transfer.received;
  const net = transfer.lines.reduce((sum, line) => sum + (line.netWeight ?? 0), 0);
  const netWaiting = transfer.lines.filter((line) => !line.receivedAt).reduce((sum, line) => sum + (line.netWeight ?? 0), 0);
  // Pieces still on the way first, then the rest by when they arrived.
  const lines = [...transfer.lines].sort((a, b) => (a.receivedAt ? 1 : 0) - (b.receivedAt ? 1 : 0) || (b.receivedAt ?? "").localeCompare(a.receivedAt ?? ""));

  // The story of the transfer: sent, each piece arriving, done.
  const history: ActivityEntry[] = [
    ...(transfer.completedAt ? [{ at: transfer.completedAt, by: transfer.receivedBy, text: `Every piece received at ${transfer.toBranch?.name}`, icon: CheckCircle2, tone: "ok" as const }] : []),
    ...transfer.lines
      .filter((line) => line.receivedAt)
      .sort((a, b) => (b.receivedAt ?? "").localeCompare(a.receivedAt ?? ""))
      .map((line) => ({ at: line.receivedAt as string, text: `${line.tagNumber} scanned in`, icon: PackageCheck, tone: "navy" as const })),
    { at: transfer.dispatchedAt, by: transfer.dispatchedBy, text: `${transfer.pieces} ${transfer.pieces === 1 ? "piece" : "pieces"} sent from ${transfer.fromBranch?.name}`, icon: Send, tone: "gold" as const },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader
        title={
          <CopyText value={transfer.number} label="Copy transfer number">
            <span className="font-mono">{transfer.number}</span>
          </CopyText>
        }
        description={`${transfer.fromBranch?.name} to ${transfer.toBranch?.name}.`}
      />

      <DetailHero
        icon={Truck}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {transfer.fromBranch?.name}
            <ArrowRight className="size-5 text-ash" aria-hidden />
            {transfer.toBranch?.name}
          </span>
        }
        badges={
          <>
            <StatusPill tone={status.tone}>{status.label}</StatusPill>
            {receivingHere && <StatusPill tone="gold">Arriving here</StatusPill>}
          </>
        }
        meta={
          <>
            <HeroFact icon={Send}>Sent {formatDateTime(transfer.dispatchedAt)}</HeroFact>
            {transfer.dispatchedBy && <HeroFact icon={UserRound}>{transfer.dispatchedBy}</HeroFact>}
            {transfer.completedAt && <HeroFact icon={CalendarClock}>Completed {formatDateTime(transfer.completedAt)}</HeroFact>}
          </>
        }
        stat={{ label: "Received", value: `${transfer.received} of ${transfer.pieces}`, note: waiting ? `${waiting} still on the way` : "All in" }}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard compact title="Pieces sent" value={transfer.pieces} icon={Send} subtitle={`From ${transfer.fromBranch?.name ?? ""}`} />
        <KpiCard compact title="Received" value={transfer.received} icon={PackageCheck} tone="ok" subtitle={`At ${transfer.toBranch?.name ?? ""}`} />
        <KpiCard compact title="Still on the way" value={waiting} icon={Truck} tone={waiting ? "warn" : "ok"} subtitle={waiting ? `${formatWeight(netWaiting)} net` : "Nothing missing"} />
        <KpiCard compact title="Net weight" value={formatWeight(net)} icon={Scale} tone="gold" subtitle="Of every piece sent" />
      </div>

      {receivingHere && hasRole("owner", "branch_manager", "stock_keeper") && (
        <Card>
          <CardHeader icon={ScanBarcode} title="Receive at this branch" description="Scan each piece as it comes out of the bag. It moves into stock here straight away." />
          <CardBody className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_280px]">
              <Field label="Scan a piece" htmlFor="receive-scan">
                <ScanInput id="receive-scan" onScan={receive} />
              </Field>
              <Field label="Put into" htmlFor="receive-tray">
                <LocationSelect id="receive-tray" locations={locations} value={locationId} onChange={setLocationId} emptyLabel="Decide later" />
              </Field>
            </div>
            {scanError && <Alert tone="risk">{scanError}</Alert>}
            <ScanLog results={results} />
          </CardBody>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader title="Pieces" description="Click a piece to open it." />
          <Table minWidth={760}>
            <thead>
              <tr>
                <Th className="w-16">
                  <span className="sr-only">Photo</span>
                </Th>
                <Th>Tag</Th>
                <Th>Design</Th>
                <Th>Purity</Th>
                <Th align="right">Net</Th>
                <Th>State</Th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <Tr key={line.itemId} className="cursor-pointer" onClick={() => router.push(`/stock/${line.itemId}`)}>
                  <Td className="py-2 pr-0">
                    <PieceThumb item={thumbOf(line)} />
                  </Td>
                  <Td>
                    <span className="grid leading-tight">
                      <Link href={`/stock/${line.itemId}`} className="font-mono font-semibold text-ink hover:underline" onClick={(event) => event.stopPropagation()}>
                        {line.tagNumber}
                      </Link>
                      {line.legacyTag && <span className="font-mono text-[11px] text-ash">old {line.legacyTag}</span>}
                    </span>
                  </Td>
                  <Td>{line.design?.name ?? "—"}</Td>
                  <Td>{line.purity ?? "—"}</Td>
                  <Td align="right" className="font-semibold text-ink">
                    {line.netWeight !== undefined ? formatWeight(line.netWeight) : "—"}
                  </Td>
                  <Td>
                    {line.receivedAt ? (
                      <span className="grid gap-0.5">
                        <Badge tone="ok" dot className="justify-self-start">
                          Received
                        </Badge>
                        <span className="text-[11.5px] text-ash">
                          {formatDateTime(line.receivedAt)}
                          {line.location ? ` · ${line.location}` : ""}
                        </span>
                      </span>
                    ) : (
                      <Badge tone="navy" dot>
                        On the way
                      </Badge>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="grid gap-4">
              <InfoGrid>
                <InfoRow label="Transfer" mono>
                  {transfer.number}
                </InfoRow>
                <InfoRow label="Status">{status.label}</InfoRow>
                <InfoRow label="From">{transfer.fromBranch?.name}</InfoRow>
                <InfoRow label="To">{transfer.toBranch?.name}</InfoRow>
                <InfoRow label="Sent">{formatDateTime(transfer.dispatchedAt)}</InfoRow>
                <InfoRow label="Sent by">{transfer.dispatchedBy}</InfoRow>
                <InfoRow label="Completed">{transfer.completedAt && formatDateTime(transfer.completedAt)}</InfoRow>
                <InfoRow label="Received by">{transfer.receivedBy}</InfoRow>
              </InfoGrid>
              {transfer.note && <p className="rounded-lg bg-gray-50 p-3 text-sm whitespace-pre-line text-ink">{transfer.note}</p>}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="History" />
            <CardBody>
              <ActivityLog entries={history} formatTime={formatDateTime} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
