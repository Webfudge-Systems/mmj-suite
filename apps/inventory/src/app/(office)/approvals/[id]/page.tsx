"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Alert, Badge, Button, Card, CardHeader, PageHeader, ScanInput, Spinner, Table, Td, Th, Tr } from "@webfudge/ui";
import type { ApprovalMemo } from "@webfudge/utils/api";
import { formatDate, formatDateTime, formatWeight } from "@webfudge/utils/formatters";
import { errorMessage, useApi, useResource } from "@/lib/api";

const STATE = { out: { label: "Out", tone: "warn" }, returned: { label: "Back in stock", tone: "ok" }, billed: { label: "Billed", tone: "navy" } } as const;

export default function ApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const api = useApi();
  const { data, error, loading, reload } = useResource<{ data: ApprovalMemo }>(`/approvals/${id}`);
  const memo = data?.data;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "risk"; text: string } | null>(null);

  if (loading && !memo) return <Spinner className="text-navy" />;
  if (error || !memo) return <p className="text-sm text-risk">{error ?? "Memo not found."}</p>;

  async function giveBack(codes: string[]) {
    setBusy(true);
    setMessage(null);
    try {
      const { data: result } = await api.post<{ data: ApprovalMemo }>(`/approvals/${id}/return`, { codes });
      setMessage({ tone: "ok", text: result.status === "closed" ? "Everything is back or billed. The memo is closed." : "Back in stock." });
      reload();
    } catch (cause) {
      setMessage({ tone: "risk", text: errorMessage(cause) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title={`${memo.number} · ${memo.party.name}`}
        description={`${memo.counts.out} of ${memo.counts.total} still out · ${formatWeight(memo.netWeightOut)} net${memo.dueBackOn ? ` · back by ${formatDate(memo.dueBackOn)}` : ""}`}
        actions={
          memo.counts.out > 0 && (
            <Button variant="secondary" loading={busy} onClick={() => giveBack([])}>
              Take everything back
            </Button>
          )
        }
      />

      {memo.counts.out > 0 && (
        <Card className="p-5">
          <p className="mb-3 text-sm text-ash">Scan pieces as they come back. Pieces the customer keeps: bill them at the POS by scanning the tag there.</p>
          <ScanInput id="approval-return" onScan={(code) => giveBack([code])} placeholder="Scan a returned piece" />
        </Card>
      )}
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      {memo.note && <Alert tone="navy">{memo.note}</Alert>}

      <Card className="overflow-hidden">
        <CardHeader title="Pieces" />
        <Table minWidth={640}>
          <thead>
            <tr>
              <Th>Tag</Th>
              <Th>Design</Th>
              <Th align="right">Net</Th>
              <Th>State</Th>
              <Th>
                <span className="sr-only">Action</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {memo.lines.map((line) => (
              <Tr key={line.itemId}>
                <Td>
                  <Link href={`/stock/${line.itemId}`} className="font-mono font-semibold hover:underline">
                    {line.tagNumber}
                  </Link>
                </Td>
                <Td>
                  {line.design ?? "—"} · {line.purity}
                </Td>
                <Td align="right">{formatWeight(line.netWeight)}</Td>
                <Td>
                  <Badge tone={STATE[line.state].tone} dot>
                    {STATE[line.state].label}
                  </Badge>
                </Td>
                <Td align="right">
                  {line.state === "out" && (
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => giveBack([line.tagNumber])}>
                      Back
                    </Button>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <CardHeader title="History" />
        <ol className="grid px-6 py-4">
          {[...memo.log].reverse().map((entry, index) => (
            <li key={`${entry.at}-${index}`} className="relative border-l-2 border-gray-100 pb-4 pl-5 last:pb-0">
              <span className="absolute top-1 -left-[7px] size-3 rounded-full border-2 border-white bg-navy" aria-hidden />
              <p className="text-sm">{entry.text}</p>
              <p className="text-[12px] text-ash">
                {formatDateTime(entry.at)}
                {entry.by ? ` · ${entry.by}` : ""}
              </p>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
