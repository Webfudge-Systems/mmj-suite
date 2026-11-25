"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes, CalendarClock, FileText, FileUp, Hammer, Inbox, IndianRupee, Printer, Scale, Store, Truck, UserRound } from "lucide-react";
import { useAuth } from "@webfudge/auth/components";
import { Alert, Card, CardBody, CardHeader, CopyText, DetailHero, HeroFact, InfoGrid, InfoRow, KpiCard, PageHeader, Spinner, StatusBadge, StatusPill, Table, Td, Th, Tr, buttonClass } from "@webfudge/ui";
import type { FileRef, Receipt } from "@webfudge/utils/api";
import { formatDate, formatDateTime, formatINR, formatWeight } from "@webfudge/utils/formatters";
import { Attachments } from "@/components/attachments";
import { PieceThumb } from "@/components/photos";
import { errorMessage, useApi, useResource } from "@/lib/api";
import { SOURCE_LABELS } from "@/lib/labels";

/** The bill or challan files of a receipt. Bills that arrive after the goods can be added here. */
function BillFiles({ receipt, onSaved }: { receipt: Receipt; onSaved: () => void }) {
  const api = useApi();
  const { hasRole } = useAuth();
  const canEdit = hasRole("owner", "branch_manager", "stock_keeper");
  const [error, setError] = useState<string | null>(null);

  async function save(files: FileRef[]) {
    setError(null);
    try {
      await api.put(`/stock/receipts/${receipt.id}/attachments`, { attachmentIds: files.map((file) => file.id) });
      onSaved();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  const files = receipt.attachments ?? [];
  if (!canEdit && !files.length) return null;
  return (
    <Card>
      <CardHeader title="Bill & challan" description={files.length ? "Open a file to view or print it." : "Nothing attached yet. Photograph the supplier's bill or attach the PDF."} />
      <CardBody className="grid gap-2">
        <Attachments id={`receipt-${receipt.id}-files`} files={files} onChange={save} disabled={!canEdit} />
        {error && <Alert tone="risk">{error}</Alert>}
      </CardBody>
    </Card>
  );
}

export default function ReceiptPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = use(params);
  const { new: justCreated } = use(searchParams);
  const router = useRouter();
  const { data, error, loading, reload } = useResource<{ data: Receipt }>(`/stock/receipts/${id}`);
  const receipt = data?.data;

  if (loading && !receipt) return <Spinner className="text-navy" />;
  if (error || !receipt) return <p className="text-sm text-risk">{error ?? "Receipt not found."}</p>;
  const items = receipt.items ?? [];
  const untrayed = items.filter((item) => !item.location).length;
  const showCost = items.some((item) => item.costPrice != null);
  const gross = items.reduce((sum, item) => sum + item.grossWeight, 0);
  const net = items.reduce((sum, item) => sum + item.netWeight, 0);
  const cost = items.reduce((sum, item) => sum + (item.costPrice ?? 0), 0);
  const sold = items.filter((item) => item.status === "sold").length;
  const byPurity = Object.entries(
    items.reduce<Record<string, { pieces: number; net: number }>>((all, item) => {
      const entry = all[item.purity] ?? { pieces: 0, net: 0 };
      entry.pieces += 1;
      entry.net += item.netWeight;
      all[item.purity] = entry;
      return all;
    }, {}),
  );
  const SourceIcon = receipt.source === "karigar" ? Hammer : receipt.source === "opening_stock" ? FileUp : Truck;

  return (
    <div className="grid gap-6">
      <PageHeader
        title={
          <CopyText value={receipt.number} label="Copy receipt number">
            <span className="font-mono">{receipt.number}</span>
          </CopyText>
        }
        description={`${SOURCE_LABELS[receipt.source]}${receipt.supplier ? ` from ${receipt.supplier.name}` : ""}.`}
        actions={
          <Link href={`/tags?receipt=${receipt.id}`} className={buttonClass("gold")}>
            <Printer className="size-4" aria-hidden />
            Print {items.length === 1 ? "the tag" : `${items.length} tags`}
          </Link>
        }
      />
      {justCreated && (
        <Alert tone="ok" title={items.length === 1 ? "1 piece tagged" : `${items.length} pieces tagged`}>
          Print the tags and fix them to the pieces before they go to a tray.
        </Alert>
      )}

      <DetailHero
        icon={SourceIcon}
        title={receipt.supplier ? receipt.supplier.name : SOURCE_LABELS[receipt.source]}
        badges={
          <>
            <StatusPill tone={receipt.source === "karigar" ? "gold" : receipt.source === "opening_stock" ? "neutral" : "navy"}>{SOURCE_LABELS[receipt.source]}</StatusPill>
            {receipt.source === "purchase" && !(receipt.attachments ?? []).length && <StatusPill tone="warn">Bill missing</StatusPill>}
          </>
        }
        meta={
          <>
            {receipt.billNumber && <HeroFact icon={FileText}>Bill {receipt.billNumber}{receipt.billDate ? ` · ${formatDate(receipt.billDate)}` : ""}</HeroFact>}
            <HeroFact icon={CalendarClock}>Received {formatDateTime(receipt.createdAt)}</HeroFact>
            {receipt.receivedBy && <HeroFact icon={UserRound}>{receipt.receivedBy}</HeroFact>}
            {receipt.branch && <HeroFact icon={Store}>{receipt.branch.name}</HeroFact>}
          </>
        }
        stat={{ label: "Net weight", value: formatWeight(net), note: `${items.length} ${items.length === 1 ? "piece" : "pieces"}, ${formatWeight(gross)} gross` }}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard compact title="Pieces" value={items.length} icon={Boxes} subtitle={byPurity.map(([purity, entry]) => `${entry.pieces} × ${purity}`).join(" · ") || " "} />
        <KpiCard compact title="Net weight" value={formatWeight(net)} icon={Scale} tone="gold" subtitle={`Stones ${formatWeight(gross - net)}`} />
        <KpiCard compact title="Waiting for a tray" value={untrayed} icon={Inbox} tone={untrayed ? "warn" : "ok"} subtitle={untrayed ? "Scan them into a tray" : "All in trays"} />
        {showCost ? (
          <KpiCard compact title="Cost" value={formatINR(cost)} icon={IndianRupee} tone="navy" subtitle={`${sold} sold so far`} />
        ) : (
          <KpiCard compact title="Sold so far" value={sold} icon={IndianRupee} tone="navy" subtitle={`of ${items.length} pieces`} />
        )}
      </div>

      {untrayed > 0 && (
        <Alert tone="warn" title={untrayed === 1 ? "1 piece needs a tray" : `${untrayed} pieces need a tray`}>
          <Link href="/locations" className="underline">
            Open Trays &amp; locations
          </Link>
          , choose the tray, and scan the pieces into it.
        </Alert>
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
                <Th align="right">Gross</Th>
                <Th align="right">Net</Th>
                {showCost && <Th align="right">Cost</Th>}
                <Th>Tray</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <Tr key={item.id} className="cursor-pointer" onClick={() => router.push(`/stock/${item.id}`)}>
                  <Td className="py-2 pr-0">
                    <PieceThumb item={item} />
                  </Td>
                  <Td>
                    <span className="grid leading-tight">
                      <span className="font-mono font-semibold text-ink">{item.tagNumber}</span>
                      {item.huid && <span className="font-mono text-[11px] text-ash">HUID {item.huid}</span>}
                      {item.legacyTag && <span className="font-mono text-[11px] text-ash">old {item.legacyTag}</span>}
                    </span>
                  </Td>
                  <Td>{item.design?.name}</Td>
                  <Td>{item.purity}</Td>
                  <Td align="right">{formatWeight(item.grossWeight)}</Td>
                  <Td align="right" className="font-semibold text-ink">
                    {formatWeight(item.netWeight)}
                  </Td>
                  {showCost && <Td align="right">{item.costPrice == null ? "—" : formatINR(item.costPrice)}</Td>}
                  <Td className="font-mono text-[12px]">{item.location?.fullCode ?? <span className="font-sans font-semibold text-warn">Needs a tray</span>}</Td>
                  <Td>
                    <StatusBadge status={item.status} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <div className="grid content-start gap-6">
          {receipt.source !== "opening_stock" && <BillFiles receipt={receipt} onSaved={reload} />}
          <Card>
            <CardHeader title="Details" />
            <CardBody className="grid gap-4">
              <InfoGrid>
                <InfoRow label="Receipt" mono>
                  {receipt.number}
                </InfoRow>
                <InfoRow label="Type">{SOURCE_LABELS[receipt.source]}</InfoRow>
                <InfoRow label={receipt.source === "karigar" ? "Karigar" : "Supplier"}>
                  {receipt.supplier ? (
                    <Link href={`/suppliers/${receipt.supplier.id}`} className="text-navy hover:underline">
                      {receipt.supplier.name}
                    </Link>
                  ) : null}
                </InfoRow>
                <InfoRow label="Bill or challan">{receipt.billNumber}</InfoRow>
                <InfoRow label="Bill date">{receipt.billDate && formatDate(receipt.billDate)}</InfoRow>
                <InfoRow label="Received by">{receipt.receivedBy}</InfoRow>
              </InfoGrid>
              {receipt.notes && <p className="rounded-lg bg-gray-50 p-3 text-sm whitespace-pre-line text-ink">{receipt.notes}</p>}
              {byPurity.length > 0 && (
                <div className="grid gap-1.5 border-t border-gray-100 pt-3 text-[13px]">
                  {byPurity.map(([purity, entry]) => (
                    <div key={purity} className="flex justify-between tabular-nums">
                      <span className="text-ash">
                        {purity} · {entry.pieces} {entry.pieces === 1 ? "piece" : "pieces"}
                      </span>
                      <span className="font-semibold text-ink">{formatWeight(entry.net)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

