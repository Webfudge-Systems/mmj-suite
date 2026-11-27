"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, ClipboardList, FilePlus2, Gem, IndianRupee, Phone, ReceiptText, Scale, Trash2, UserRound, X } from "lucide-react";
import { errorMessage, useApi, useResource } from "@webfudge/auth/components";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CopyText,
  DetailHero,
  HeroFact,
  InfoGrid,
  InfoRow,
  KpiCard,
  PageHeader,
  Spinner,
  StatusPill,
  Table,
  Td,
  Th,
  Tr,
  buttonClass,
} from "@webfudge/ui";
import type { Estimate, Quote } from "@webfudge/utils/api";
import { formatDateTime, formatINR, formatWeight } from "@webfudge/utils/formatters";
import { ESTIMATE_STATUS, waited } from "@/components/estimate-status";

export default function EstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const api = useApi();
  const router = useRouter();
  const { data, error, loading, reload } = useResource<{ data: Estimate }>(`/sales/estimates/${id}`);
  const estimate = data?.data;
  const [busy, setBusy] = useState<number | "all" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  if (loading && !estimate) return <Spinner className="text-navy" />;
  if (error || !estimate) return <p className="text-sm text-risk">{error ?? "Estimate not found."}</p>;

  /** Takes one piece off, or cancels the whole estimate. The pieces go back to the salesperson. */
  async function remove(itemId?: number) {
    setBusy(itemId ?? "all");
    setActionError(null);
    try {
      await api.post(`/sales/estimates/${id}/cancel`, itemId ? { itemIds: [itemId] } : {});
      if (!itemId || estimate?.lines.length === 1) router.push("/estimates");
      else reload();
    } catch (cause) {
      setActionError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  }

  const status = ESTIMATE_STATUS[estimate.status];
  const open = estimate.status === "open";
  const quote = estimate.quote && !("error" in estimate.quote) ? (estimate.quote as Quote) : null;
  const quoteError = estimate.quote && "error" in estimate.quote ? estimate.quote.error : null;
  const priced = new Map((quote?.lines ?? []).map((line) => [line.itemId, line]));
  const net = quote?.lines.reduce((sum, line) => sum + line.netWeight, 0) ?? 0;

  return (
    <div className="grid gap-6">
      <PageHeader
        title={
          <CopyText value={estimate.number} label="Copy estimate number">
            <span className="font-mono">{estimate.number}</span>
          </CopyText>
        }
        description={open ? "Sent from the showroom tablet. Bill it, or hand the pieces back to the salesperson." : `This estimate is ${status.label.toLowerCase()}.`}
        actions={
          open && (
            <>
              <Link href={`/?estimate=${estimate.id}`} className={buttonClass("primary")}>
                <FilePlus2 className="size-4" aria-hidden />
                Bill this estimate
              </Link>
              <Button variant="ghost" loading={busy === "all"} onClick={() => remove()}>
                <X className="size-4" aria-hidden />
                Cancel estimate
              </Button>
            </>
          )
        }
      />
      {actionError && <Alert tone="risk">{actionError}</Alert>}

      <DetailHero
        icon={ClipboardList}
        title={estimate.customer?.name ?? "Customer not given"}
        badges={
          <>
            <StatusPill tone={status.tone}>{status.label}</StatusPill>
            {open && <StatusPill tone="neutral">Waiting {waited(estimate.createdAt, now)}</StatusPill>}
          </>
        }
        meta={
          <>
            {estimate.customer && <HeroFact icon={Phone}>{estimate.customer.phone}</HeroFact>}
            {estimate.salesperson && <HeroFact icon={UserRound}>{estimate.salesperson}</HeroFact>}
            <HeroFact icon={CalendarClock}>Sent {formatDateTime(estimate.createdAt)}</HeroFact>
            {estimate.invoice && (
              <HeroFact icon={ReceiptText}>
                <Link href={`/invoices/${estimate.invoice.id}`} className="font-mono font-semibold text-ink hover:text-navy">
                  {estimate.invoice.number}
                </Link>
              </HeroFact>
            )}
          </>
        }
        stat={quote ? { label: "At today's rate", value: formatINR(quote.total), note: "Including GST" } : { label: "Pieces", value: estimate.lines.length }}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard compact title="Pieces" value={estimate.lines.length} icon={Gem} subtitle={estimate.salesperson ? `Picked by ${estimate.salesperson}` : " "} />
        <KpiCard compact title="Net weight" value={quote ? formatWeight(net) : "—"} icon={Scale} tone="gold" subtitle="Of every piece" />
        <KpiCard compact title="Value before GST" value={quote ? formatINR(quote.taxableValue) : "—"} icon={IndianRupee} tone="navy" subtitle={quote ? `GST ${formatINR(quote.gst)}` : "Priced while it waits"} />
        <KpiCard compact title="Total today" value={quote ? formatINR(quote.total) : "—"} icon={ReceiptText} tone="ok" subtitle={quote ? "Old gold and advances come off on the bill" : " "} />
      </div>

      {quoteError && <Alert tone="warn" title="Could not price it">{quoteError}</Alert>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader title="Pieces" description={open ? "Priced at today's rate. Take a piece off if the customer does not want it." : undefined} />
          <Table minWidth={720}>
            <thead>
              <tr>
                <Th>Tag</Th>
                <Th>Piece</Th>
                <Th>Purity</Th>
                <Th align="right">Net</Th>
                <Th align="right">Price</Th>
                {open && (
                  <Th>
                    <span className="sr-only">Remove</span>
                  </Th>
                )}
              </tr>
            </thead>
            <tbody>
              {estimate.lines.map((entry) => {
                const line = priced.get(entry.itemId);
                return (
                  <Tr key={entry.itemId}>
                    <Td className="font-mono font-semibold text-ink">{entry.tagNumber}</Td>
                    <Td>
                      <span className="grid leading-tight">
                        <span>{line?.description ?? "—"}</span>
                        {line?.huid && <span className="font-mono text-[11px] text-ash">HUID {line.huid}</span>}
                      </span>
                    </Td>
                    <Td>{line?.purity ?? "—"}</Td>
                    <Td align="right">{line ? formatWeight(line.netWeight) : "—"}</Td>
                    <Td align="right" className="font-semibold text-ink">
                      {line ? formatINR(line.total) : "—"}
                    </Td>
                    {open && (
                      <Td align="right">
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-ash hover:bg-risk/10 hover:text-risk disabled:opacity-50"
                          disabled={busy !== null}
                          onClick={() => remove(entry.itemId)}
                          aria-label={`Take ${entry.tagNumber} off the estimate`}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </Td>
                    )}
                  </Tr>
                );
              })}
            </tbody>
          </Table>
          {quote && (
            <div className="grid gap-1 border-t border-gray-100 bg-gray-50/60 px-5 py-3 text-[13px] tabular-nums">
              <div className="flex justify-between">
                <span className="text-ash">Value before GST</span>
                <span>{formatINR(quote.taxableValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ash">GST</span>
                <span>{formatINR(quote.gst)}</span>
              </div>
              <div className="flex justify-between font-semibold text-ink">
                <span>Total at today&apos;s rate</span>
                <span>{formatINR(quote.total)}</span>
              </div>
            </div>
          )}
        </Card>

        <Card className="self-start">
          <CardHeader title="Details" />
          <CardBody className="grid gap-4">
            <InfoGrid>
              <InfoRow label="Estimate" mono>
                {estimate.number}
              </InfoRow>
              <InfoRow label="Customer">{estimate.customer?.name}</InfoRow>
              <InfoRow label="Mobile">{estimate.customer?.phone}</InfoRow>
              <InfoRow label="Salesperson">{estimate.salesperson}</InfoRow>
              <InfoRow label="Branch">{estimate.branch?.name}</InfoRow>
              <InfoRow label="Sent">{formatDateTime(estimate.createdAt)}</InfoRow>
              <InfoRow label="Billed">{estimate.billedAt && formatDateTime(estimate.billedAt)}</InfoRow>
              <InfoRow label="Cancelled">{estimate.cancelledAt && formatDateTime(estimate.cancelledAt)}</InfoRow>
            </InfoGrid>
            {estimate.note && <p className="rounded-lg bg-gray-50 p-3 text-sm whitespace-pre-line text-ink">{estimate.note}</p>}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
