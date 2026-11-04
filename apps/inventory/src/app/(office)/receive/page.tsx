"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader, Pager, Spinner, Table, Td, Th, Tr, buttonClass } from "@webfudge/ui";
import type { Page, Receipt } from "@webfudge/utils/api";
import { formatDate, formatDateTime } from "@webfudge/utils/formatters";
import { useResource } from "@/lib/api";
import { useBranch } from "@/lib/branch";
import { SOURCE_LABELS } from "@/lib/labels";

export default function ReceiptsPage() {
  const { branch } = useBranch();
  const [page, setPage] = useState(1);
  const receipts = useResource<Page<Receipt>>(branch ? `/stock/receipts?branchId=${branch.id}&page=${page}` : null);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Receive stock"
        description="Every delivery is recorded as a receipt. Each piece on it gets its own tag."
        actions={
          <>
            <Link href="/receive/import" className={buttonClass("secondary")}>
              Import current stock
            </Link>
            <Link href="/receive/new" className={buttonClass("primary")}>
              Receive pieces
            </Link>
          </>
        }
      />
      <Card>
        {receipts.loading ? (
          <div className="grid place-items-center p-10 text-navy">
            <Spinner />
          </div>
        ) : receipts.error ? (
          <p className="p-5 text-[13px] text-risk">{receipts.error}</p>
        ) : !receipts.data?.data.length ? (
          <EmptyState title="Nothing received yet" description="Start by importing your current stock, then receive new deliveries here." />
        ) : (
          <>
            <Table minWidth={760}>
              <thead>
                <tr>
                  <Th>Receipt</Th>
                  <Th>Type</Th>
                  <Th>From</Th>
                  <Th>Bill</Th>
                  <Th align="right">Pieces</Th>
                  <Th>Received</Th>
                </tr>
              </thead>
              <tbody>
                {receipts.data.data.map((receipt) => (
                  <Tr key={receipt.id} className="hover:bg-sunk/60">
                    <Td>
                      <Link href={`/receive/${receipt.id}`} className="font-mono font-semibold hover:underline">
                        {receipt.number}
                      </Link>
                    </Td>
                    <Td>
                      <Badge tone={receipt.source === "opening_stock" ? "gold" : "neutral"}>{SOURCE_LABELS[receipt.source]}</Badge>
                    </Td>
                    <Td>{receipt.supplier?.name ?? "—"}</Td>
                    <Td>
                      {receipt.billNumber ?? "—"}
                      {receipt.billDate && <span className="block text-[12px] text-ash">{formatDate(receipt.billDate)}</span>}
                    </Td>
                    <Td align="right">{receipt.pieces ?? 0}</Td>
                    <Td>
                      {formatDateTime(receipt.createdAt)}
                      {receipt.receivedBy && <span className="block text-[12px] text-ash">by {receipt.receivedBy}</span>}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pager pagination={receipts.data.meta.pagination} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
