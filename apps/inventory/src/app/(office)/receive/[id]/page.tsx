"use client";

import { use } from "react";
import Link from "next/link";
import { Alert, Card, CardHeader, PageHeader, Spinner, StatusBadge, Table, Td, Th, Tr, buttonClass } from "@webfudge/ui";
import type { Receipt } from "@webfudge/utils/api";
import { formatDate, formatDateTime, formatINR, formatWeight } from "@webfudge/utils/formatters";
import { useResource } from "@/lib/api";
import { SOURCE_LABELS } from "@/lib/labels";

export default function ReceiptPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = use(params);
  const { new: justCreated } = use(searchParams);
  const { data, error, loading } = useResource<{ data: Receipt }>(`/stock/receipts/${id}`);
  const receipt = data?.data;

  if (loading) return <Spinner className="text-navy" />;
  if (error || !receipt) return <p className="text-sm text-risk">{error ?? "Receipt not found."}</p>;
  const items = receipt.items ?? [];
  const untrayed = items.filter((item) => !item.location).length;
  const showCost = items.some((item) => item.costPrice !== undefined);

  return (
    <div className="grid gap-6">
      <Link href="/receive" className="text-[13px] text-ash hover:text-navy">
        ← Receive stock
      </Link>
      <PageHeader
        title={<span className="font-mono">{receipt.number}</span>}
        description={`${SOURCE_LABELS[receipt.source]}${receipt.supplier ? ` from ${receipt.supplier.name}` : ""}${receipt.billNumber ? `, bill ${receipt.billNumber}` : ""}${receipt.billDate ? ` of ${formatDate(receipt.billDate)}` : ""}. Received ${formatDateTime(receipt.createdAt)}${receipt.receivedBy ? ` by ${receipt.receivedBy}` : ""}.`}
        actions={
          <Link href={`/tags?receipt=${receipt.id}`} className={buttonClass("gold")}>
            Print {items.length === 1 ? "the tag" : `${items.length} tags`}
          </Link>
        }
      />
      {justCreated && (
        <Alert tone="ok" title={items.length === 1 ? "1 piece tagged" : `${items.length} pieces tagged`}>
          Print the tags and fix them to the pieces before they go to a tray.
        </Alert>
      )}
      {untrayed > 0 && (
        <Alert tone="warn" title={untrayed === 1 ? "1 piece needs a tray" : `${untrayed} pieces need a tray`}>
          <Link href="/locations" className="underline">Open Locations</Link>, choose the tray, and scan the pieces into it.
        </Alert>
      )}
      <Card>
        <CardHeader title="Pieces" />
        <Table minWidth={760}>
          <thead>
            <tr>
              <Th>Tag</Th>
              <Th>Design</Th>
              <Th>Purity</Th>
              <Th align="right">Gross</Th>
              <Th align="right">Net</Th>
              <Th>HUID</Th>
              {showCost && <Th align="right">Cost</Th>}
              <Th>Tray</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <Tr key={item.id}>
                <Td>
                  <Link href={`/stock/${item.id}`} className="font-mono font-semibold hover:underline">
                    {item.tagNumber}
                  </Link>
                  {item.legacyTag && <span className="block font-mono text-[11px] text-ash">old {item.legacyTag}</span>}
                </Td>
                <Td>{item.design?.name}</Td>
                <Td>{item.purity}</Td>
                <Td align="right">{formatWeight(item.grossWeight)}</Td>
                <Td align="right">{formatWeight(item.netWeight)}</Td>
                <Td className="font-mono">{item.huid ?? "—"}</Td>
                {showCost && <Td align="right">{item.costPrice == null ? "—" : formatINR(item.costPrice)}</Td>}
                <Td className="font-mono text-[12px]">{item.location?.fullCode ?? "—"}</Td>
                <Td>
                  <StatusBadge status={item.status} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
