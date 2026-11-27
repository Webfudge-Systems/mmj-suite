"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  PackageCheck,
  ReceiptText,
  RotateCcw,
  Scale,
  Send,
  Store,
  UserRound,
} from "lucide-react";
import {
  ActivityLog,
  Alert,
  Badge,
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
  ScanInput,
  Spinner,
  StatusPill,
  Table,
  Td,
  Th,
  Tr,
  type ActivityEntry,
} from "@webfudge/ui";
import type { ApprovalLine, ApprovalMemo, StockItem } from "@webfudge/utils/api";
import { formatDate, formatDateTime, formatWeight } from "@webfudge/utils/formatters";
import { PieceThumb } from "@/components/photos";
import { errorMessage, useApi, useResource } from "@/lib/api";

const STATE = {
  out: { label: "Out", tone: "warn" },
  returned: { label: "Back in stock", tone: "ok" },
  billed: { label: "Billed", tone: "navy" },
} as const;

/** The line in the shape PieceThumb reads: its own photo, else the design's. */
const thumbOf = (line: ApprovalLine) =>
  ({
    tagNumber: line.tagNumber,
    photos: line.photo ? [line.photo] : [],
    design: line.design ? { name: line.design, image: line.designImage ?? null } : null,
  }) as Pick<StockItem, "photos" | "design" | "tagNumber">;

/** A coloured icon per history line, from what it says. */
function logEntry(entry: ApprovalMemo["log"][number]): ActivityEntry {
  const text = entry.text.toLowerCase();
  const kind = text.includes("closed")
    ? "closed"
    : text.includes("back")
      ? "back"
      : text.includes("bill")
        ? "billed"
        : text.includes("sent")
          ? "sent"
          : "other";
  return {
    at: entry.at,
    by: entry.by,
    text: entry.text,
    icon: {
      closed: CheckCircle2,
      back: RotateCcw,
      billed: ReceiptText,
      sent: Send,
      other: undefined,
    }[kind],
    tone: kind === "closed" || kind === "back" ? "ok" : kind === "sent" ? "gold" : "navy",
  };
}

export default function ApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const api = useApi();
  const router = useRouter();
  const { data, error, loading, reload } = useResource<{ data: ApprovalMemo }>(`/approvals/${id}`);
  const memo = data?.data;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "risk"; text: string } | null>(null);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));

  if (loading && !memo) return <Spinner className="text-navy" />;
  if (error || !memo) return <p className="text-sm text-risk">{error ?? "Memo not found."}</p>;

  async function giveBack(codes: string[]) {
    setBusy(true);
    setMessage(null);
    try {
      const { data: result } = await api.post<{ data: ApprovalMemo }>(`/approvals/${id}/return`, {
        codes,
      });
      setMessage({
        tone: "ok",
        text:
          result.status === "closed"
            ? "Everything is back or billed. The memo is closed."
            : "Back in stock.",
      });
      reload();
    } catch (cause) {
      setMessage({ tone: "risk", text: errorMessage(cause) });
    } finally {
      setBusy(false);
    }
  }

  const state =
    memo.status === "closed" ? "closed" : memo.dueBackOn && memo.dueBackOn < today ? "late" : "out";
  const days = memo.dueBackOn
    ? Math.round((Date.parse(memo.dueBackOn) - Date.parse(today)) / 86400000)
    : null;
  const dueNote =
    state === "closed" || days === null
      ? null
      : days < 0
        ? `${-days} ${days === -1 ? "day" : "days"} late`
        : days === 0
          ? "due today"
          : `in ${days} ${days === 1 ? "day" : "days"}`;
  const netTotal = memo.lines.reduce((sum, line) => sum + line.netWeight, 0);
  const grossTotal = memo.lines.reduce((sum, line) => sum + line.grossWeight, 0);
  const netBack = memo.lines
    .filter((line) => line.state === "returned")
    .reduce((sum, line) => sum + line.netWeight, 0);
  const netBilled = memo.lines
    .filter((line) => line.state === "billed")
    .reduce((sum, line) => sum + line.netWeight, 0);
  // Pieces still out first, then billed, then back.
  const order = { out: 0, billed: 1, returned: 2 } as const;
  const lines = [...memo.lines].sort((a, b) => order[a.state] - order[b.state]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title={
          <CopyText value={memo.number} label="Copy memo number">
            <span className="font-mono">{memo.number}</span>
          </CopyText>
        }
        description={`On approval with ${memo.party.name}.`}
        actions={
          memo.counts.out > 0 && (
            <Button variant="secondary" loading={busy} onClick={() => giveBack([])}>
              <RotateCcw className="size-4" aria-hidden />
              Take everything back
            </Button>
          )
        }
      />

      <DetailHero
        icon={memo.customer ? UserRound : Store}
        title={memo.party.name}
        badges={
          <>
            {state === "closed" ? (
              <StatusPill tone="neutral">Closed</StatusPill>
            ) : state === "late" ? (
              <StatusPill tone="risk">Overdue</StatusPill>
            ) : (
              <StatusPill tone="warn">Out</StatusPill>
            )}
            <StatusPill tone={memo.customer ? "navy" : "gold"}>
              {memo.customer ? "Customer" : "Dealer"}
            </StatusPill>
          </>
        }
        meta={
          <>
            {memo.party.phone && <HeroFact icon={UserRound}>{memo.party.phone}</HeroFact>}
            <HeroFact icon={Send}>Sent {formatDateTime(memo.createdAt)}</HeroFact>
            {memo.dueBackOn ? (
              <HeroFact icon={CalendarClock}>
                <span className={state === "late" ? "font-semibold text-risk" : undefined}>
                  Back by {formatDate(memo.dueBackOn)}
                  {dueNote ? ` · ${dueNote}` : ""}
                </span>
              </HeroFact>
            ) : (
              <HeroFact icon={CalendarClock}>No due date</HeroFact>
            )}
            {memo.branch && <HeroFact icon={Store}>{memo.branch.name}</HeroFact>}
          </>
        }
        stat={{
          label: "Net still out",
          value: formatWeight(memo.netWeightOut),
          note: `${memo.counts.out} of ${memo.counts.total} ${memo.counts.total === 1 ? "piece" : "pieces"}`,
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          compact
          title="Still out"
          value={memo.counts.out}
          icon={Send}
          tone={state === "late" ? "risk" : memo.counts.out ? "warn" : "ok"}
          subtitle={memo.counts.out ? `of ${memo.counts.total} sent` : "Nothing out"}
        />
        <KpiCard
          compact
          title="Back in stock"
          value={memo.counts.returned}
          icon={PackageCheck}
          tone="ok"
          subtitle={`${formatWeight(netBack)} net`}
        />
        <KpiCard
          compact
          title="Kept & billed"
          value={memo.counts.billed}
          icon={ReceiptText}
          tone="navy"
          subtitle={`${formatWeight(netBilled)} net`}
        />
        <KpiCard
          compact
          title="Net out"
          value={formatWeight(memo.netWeightOut)}
          icon={Scale}
          tone="gold"
          subtitle={`of ${formatWeight(netTotal)} sent`}
        />
      </div>

      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      {memo.counts.out > 0 && (
        <Card>
          <CardHeader
            title="Take pieces back"
            description="Scan each piece as it comes back. Pieces the customer keeps are billed at the POS by scanning the tag there; the memo updates on its own."
          />
          <CardBody>
            <ScanInput
              id="approval-return"
              onScan={(code) => giveBack([code])}
              placeholder="Scan a returned piece"
              autoFocus={false}
            />
          </CardBody>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader title="Pieces" description="Click a piece to open it." />
          <Table minWidth={720}>
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
                <Th>
                  <span className="sr-only">Action</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <Tr
                  key={line.itemId}
                  className="cursor-pointer"
                  onClick={() => router.push(`/stock/${line.itemId}`)}
                >
                  <Td className="py-2 pr-0">
                    <PieceThumb item={thumbOf(line)} />
                  </Td>
                  <Td>
                    <Link
                      href={`/stock/${line.itemId}`}
                      className="font-mono font-semibold text-ink hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {line.tagNumber}
                    </Link>
                  </Td>
                  <Td>{line.design ?? "—"}</Td>
                  <Td>{line.purity}</Td>
                  <Td align="right" className="font-semibold text-ink">
                    {formatWeight(line.netWeight)}
                  </Td>
                  <Td>
                    <span className="grid gap-0.5">
                      <Badge tone={STATE[line.state].tone} dot className="justify-self-start">
                        {STATE[line.state].label}
                      </Badge>
                      {line.state === "returned" && line.returnedAt && (
                        <span className="text-[11.5px] text-ash">
                          {formatDateTime(line.returnedAt)}
                        </span>
                      )}
                    </span>
                  </Td>
                  <Td align="right">
                    {line.state === "out" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={(event) => {
                          event.stopPropagation();
                          giveBack([line.tagNumber]);
                        }}
                      >
                        <RotateCcw className="size-3.5" aria-hidden />
                        Back
                      </Button>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <div className="flex justify-between border-t border-gray-100 bg-gray-50/60 px-5 py-3 text-[13px]">
            <span className="text-ash">
              {memo.counts.total} {memo.counts.total === 1 ? "piece" : "pieces"} ·{" "}
              {formatWeight(grossTotal)} gross
            </span>
            <span className="font-semibold text-ink tabular-nums">
              {formatWeight(netTotal)} net
            </span>
          </div>
        </Card>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="grid gap-4">
              <InfoGrid>
                <InfoRow label="Memo" mono>
                  {memo.number}
                </InfoRow>
                <InfoRow label={memo.customer ? "Customer" : "Dealer"}>{memo.party.name}</InfoRow>
                <InfoRow label="Mobile">{memo.party.phone}</InfoRow>
                <InfoRow label="Branch">{memo.branch?.name}</InfoRow>
                <InfoRow label="Sent">{formatDateTime(memo.createdAt)}</InfoRow>
                <InfoRow label="Sent by">{memo.by}</InfoRow>
                <InfoRow label="Back by">{memo.dueBackOn && formatDate(memo.dueBackOn)}</InfoRow>
                <InfoRow label="Closed">{memo.closedAt && formatDateTime(memo.closedAt)}</InfoRow>
              </InfoGrid>
              {memo.note && (
                <p className="rounded-lg bg-gray-50 p-3 text-sm whitespace-pre-line text-ink">
                  {memo.note}
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="History" />
            <CardBody>
              <ActivityLog
                entries={[...memo.log].reverse().map(logEntry)}
                formatTime={formatDateTime}
                empty="No history yet."
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
