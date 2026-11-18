"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useAuth } from "@webfudge/auth/components";
import { Alert, Card, CardBody, CardHeader, PageHeader, Spinner, StatusBadge, Table, Td, Th, Tr, buttonClass } from "@webfudge/ui";
import type { FileRef, Receipt } from "@webfudge/utils/api";
import { formatDate, formatDateTime, formatINR, formatWeight } from "@webfudge/utils/formatters";
import { Attachments } from "@/components/attachments";
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
  const { data, error, loading, reload } = useResource<{ data: Receipt }>(`/stock/receipts/${id}`);
  const receipt = data?.data;

  if (loading && !receipt) return <Spinner className="text-navy" />;
  if (error || !receipt) return <p className="text-sm text-risk">{error ?? "Receipt not found."}</p>;
  const items = receipt.items ?? [];
  const untrayed = items.filter((item) => !item.location).length;
  const showCost = items.some((item) => item.costPrice !== undefined);

  return (
    <div className="grid gap-6">
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
      {receipt.source !== "opening_stock" && <BillFiles receipt={receipt} onSaved={reload} />}
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
