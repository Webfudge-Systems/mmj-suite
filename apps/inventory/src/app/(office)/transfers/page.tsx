"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader, Pager, Spinner, Table, Td, Th, Tr, buttonClass } from "@webfudge/ui";
import type { Page, Transfer } from "@webfudge/utils/api";
import { formatDateTime } from "@webfudge/utils/formatters";
import { useResource } from "@/lib/api";
import { useBranch } from "@/lib/branch";
import { TRANSFER_STATUS } from "@/lib/labels";

export default function TransfersPage() {
  const { branch } = useBranch();
  const [page, setPage] = useState(1);
  const transfers = useResource<Page<Transfer>>(`/stock/transfers?page=${page}`);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Transfers"
        description="Pieces sent between branches. A piece is in transit from the moment it is sent until the other branch scans it in."
        actions={
          <Link href="/transfers/new" className={buttonClass("primary")}>
            Send pieces
          </Link>
        }
      />
      <Card>
        {transfers.loading ? (
          <div className="grid place-items-center p-10 text-navy">
            <Spinner />
          </div>
        ) : transfers.error ? (
          <p className="p-5 text-[13px] text-risk">{transfers.error}</p>
        ) : !transfers.data?.data.length ? (
          <EmptyState title="No transfers yet" />
        ) : (
          <>
            <Table minWidth={720}>
              <thead>
                <tr>
                  <Th>Transfer</Th>
                  <Th>From</Th>
                  <Th>To</Th>
                  <Th align="right">Pieces</Th>
                  <Th>Status</Th>
                  <Th>Sent</Th>
                </tr>
              </thead>
              <tbody>
                {transfers.data.data.map((transfer) => {
                  const incoming = transfer.toBranch?.id === branch?.id && transfer.status !== "received";
                  return (
                    <Tr key={transfer.id} className="hover:bg-sunk/60">
                      <Td>
                        <Link href={`/transfers/${transfer.id}`} className="font-mono font-semibold hover:underline">
                          {transfer.number}
                        </Link>
                      </Td>
                      <Td>{transfer.fromBranch?.name}</Td>
                      <Td>{transfer.toBranch?.name}</Td>
                      <Td align="right">
                        {transfer.received}/{transfer.pieces}
                      </Td>
                      <Td>
                        <span className="flex flex-wrap gap-1">
                          <Badge tone={TRANSFER_STATUS[transfer.status].tone}>{TRANSFER_STATUS[transfer.status].label}</Badge>
                          {incoming && <Badge tone="gold">Arriving here</Badge>}
                        </span>
                      </Td>
                      <Td>
                        {formatDateTime(transfer.dispatchedAt)}
                        {transfer.dispatchedBy && <span className="block text-[12px] text-ash">by {transfer.dispatchedBy}</span>}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
            <Pager pagination={transfers.data.meta.pagination} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
