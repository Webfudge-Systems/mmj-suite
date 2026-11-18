"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes, FileWarning, Hammer, IndianRupee, Mail, MapPin, PackageCheck, PackagePlus, Paperclip, Pencil, Phone, User } from "lucide-react";
import { useAuth } from "@webfudge/auth/components";
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState, KpiCard, PageHeader, Spinner, Table, Td, Th, Tr, buttonClass } from "@webfudge/ui";
import type { JobWork, SupplierDetail } from "@webfudge/utils/api";
import { formatDate, formatINR } from "@webfudge/utils/formatters";
import { SupplierForm } from "@/components/supplier-form";
import { useResource } from "@/lib/api";
import { mediaUrl } from "@/lib/env";
import { SOURCE_LABELS } from "@/lib/labels";

const g = (value: number) => `${value.toFixed(3)} g`;

export default function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { hasRole } = useAuth();
  const canEdit = hasRole("owner", "branch_manager", "stock_keeper");
  const { data, error, loading, reload } = useResource<{ data: SupplierDetail }>(`/stock/suppliers/${id}`);
  const supplier = data?.data;
  const karigar = supplier?.kind === "karigar";
  const jobs = useResource<{ data: JobWork[] }>(karigar ? `/karigar/jobs?karigarId=${id}` : null);
  const [editing, setEditing] = useState(false);

  if (loading && !supplier) return <Spinner className="text-navy" />;
  if (error || !supplier) return <p className="text-sm text-risk">{error ?? "Supplier not found."}</p>;
  const stats = supplier.stats;
  const showCost = stats.costTotal !== undefined;
  const receiveHref = `/receive/new?supplier=${supplier.id}&source=${karigar ? "karigar" : "purchase"}`;
  const openJobs = (jobs.data?.data ?? []).filter((job) => job.status === "open");

  const contact = [
    supplier.contactPerson && { icon: User, text: supplier.contactPerson },
    supplier.phone && { icon: Phone, text: supplier.phone, href: `tel:${supplier.phone}` },
    supplier.email && { icon: Mail, text: supplier.email, href: `mailto:${supplier.email}` },
    (supplier.address || supplier.city) && { icon: MapPin, text: [supplier.address, supplier.city].filter(Boolean).join(", ") },
  ].filter(Boolean) as { icon: typeof User; text: string; href?: string }[];

  return (
    <div className="grid gap-6">
      <PageHeader
        title={supplier.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={karigar ? "gold" : "neutral"}>{karigar ? "Karigar" : "Supplier"}</Badge>
            {!supplier.isActive && <Badge>Inactive</Badge>}
            {supplier.gstin && <span className="font-mono text-[13px]">GSTIN {supplier.gstin}</span>}
            {stats.lastReceivedAt && <span>· last received {formatDate(stats.lastReceivedAt)}</span>}
          </span>
        }
        actions={
          canEdit && (
            <div className="flex flex-wrap gap-2">
              {karigar && (
                <Link href="/karigar" className={buttonClass("secondary")}>
                  <Hammer className="size-4" aria-hidden />
                  New job
                </Link>
              )}
              <Link href={receiveHref} className={buttonClass("primary")}>
                <PackagePlus className="size-4" aria-hidden />
                Receive goods
              </Link>
            </div>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard compact title="Received" value={`${stats.pieces} pieces`} icon={Boxes} subtitle={`${g(stats.netReceived)} net on ${stats.receipts} receipts`} />
        <KpiCard compact title="Still in stock" value={`${stats.inStock} pieces`} icon={PackageCheck} tone="ok" subtitle={`${g(stats.netInStock)} net`} />
        <KpiCard compact title="Sold" value={`${stats.sold} pieces`} icon={IndianRupee} tone="gold" subtitle={stats.pieces ? `${Math.round((stats.sold / stats.pieces) * 100)}% of what came in` : "Nothing received yet"} />
        {showCost ? (
          <KpiCard compact title="Bought for" value={formatINR(stats.costTotal ?? 0)} icon={IndianRupee} tone="navy" subtitle="Cost of all pieces received" />
        ) : (
          <KpiCard compact title="Bills missing" value={String(stats.billsMissing)} icon={FileWarning} tone={stats.billsMissing ? "warn" : "ok"} subtitle="Supplier receipts with no bill attached" />
        )}
      </div>

      {stats.billsMissing > 0 && (
        <Alert tone="warn" title={stats.billsMissing === 1 ? "1 receipt has no bill attached" : `${stats.billsMissing} receipts have no bill attached`}>
          Open the receipt and photograph the supplier&apos;s bill, or attach its PDF, so it is there at audit time.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader
            title="Details"
            action={
              canEdit && !editing ? (
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                  <Pencil className="size-3.5" aria-hidden />
                  Edit
                </Button>
              ) : undefined
            }
          />
          <CardBody>
            {editing ? (
              <SupplierForm
                full
                supplier={supplier}
                onSaved={() => {
                  setEditing(false);
                  reload();
                }}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <div className="grid gap-3 text-sm">
                {contact.length ? (
                  <ul className="grid gap-2">
                    {contact.map((entry) => (
                      <li key={entry.text} className="flex items-start gap-2.5">
                        <entry.icon className="mt-0.5 size-4 shrink-0 text-gray-400" aria-hidden />
                        {entry.href ? (
                          <a href={entry.href} className="text-navy hover:underline">
                            {entry.text}
                          </a>
                        ) : (
                          <span className="whitespace-pre-line">{entry.text}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-ash">No contact details yet.{canEdit ? " Use Edit to add them." : ""}</p>
                )}
                {supplier.notes && <p className="rounded-lg bg-gray-50 p-3 whitespace-pre-line text-ink">{supplier.notes}</p>}
              </div>
            )}
          </CardBody>
        </Card>

        <div className="grid content-start gap-6">
          {karigar && (
            <Card className="overflow-hidden">
              <CardHeader title="Karigar jobs" description={openJobs.length ? `${openJobs.length} open` : "No open jobs."} />
              {jobs.data?.data.length ? (
                <Table minWidth={560}>
                  <thead>
                    <tr>
                      <Th>Job</Th>
                      <Th>Work</Th>
                      <Th align="right">Fine given</Th>
                      <Th align="right">Balance</Th>
                      <Th>Due</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.data.data.map((job) => (
                      <Tr key={job.id} className="cursor-pointer" onClick={() => router.push(`/karigar/${job.id}`)}>
                        <Td>
                          <Link href={`/karigar/${job.id}`} className="font-mono font-semibold hover:underline" onClick={(event) => event.stopPropagation()}>
                            {job.number}
                          </Link>
                          {job.status === "closed" && <Badge className="ml-2">Settled</Badge>}
                        </Td>
                        <Td className="max-w-56">
                          <span className="line-clamp-1 text-[13px]">{job.description || "—"}</span>
                        </Td>
                        <Td align="right">{g(job.totals?.issuedFine ?? 0)}</Td>
                        <Td align="right" className={(job.totals?.balanceFine ?? 0) < 0 ? "text-risk" : undefined}>
                          {g(job.totals?.balanceFine ?? 0)}
                        </Td>
                        <Td>{job.dueOn ? formatDate(job.dueOn) : "—"}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <CardBody>
                  <p className="text-sm text-ash">No jobs with this karigar yet.</p>
                </CardBody>
              )}
            </Card>
          )}

          <Card className="overflow-hidden">
            <CardHeader title="Receipts" description="Every delivery received from them, with the bill or challan." />
            {supplier.receipts.length ? (
              <Table minWidth={720}>
                <thead>
                  <tr>
                    <Th>Receipt</Th>
                    <Th>Bill</Th>
                    <Th align="right">Pieces</Th>
                    <Th align="right">Net</Th>
                    {showCost && <Th align="right">Cost</Th>}
                    <Th>Bill file</Th>
                  </tr>
                </thead>
                <tbody>
                  {supplier.receipts.map((receipt) => (
                    <Tr key={receipt.id} className="cursor-pointer" onClick={() => router.push(`/receive/${receipt.id}`)}>
                      <Td>
                        <Link href={`/receive/${receipt.id}`} className="grid leading-tight" onClick={(event) => event.stopPropagation()}>
                          <span className="font-mono font-semibold hover:underline">{receipt.number}</span>
                          <span className="text-[12px] text-ash">
                            {formatDate(receipt.createdAt)} · {SOURCE_LABELS[receipt.source]}
                            {receipt.jobWork ? ` · ${receipt.jobWork.number}` : ""}
                          </span>
                        </Link>
                      </Td>
                      <Td>
                        <span className="grid leading-tight">
                          <span>{receipt.billNumber ?? "—"}</span>
                          {receipt.billDate && <span className="text-[12px] text-ash">{formatDate(receipt.billDate)}</span>}
                        </span>
                      </Td>
                      <Td align="right">{receipt.pieces}</Td>
                      <Td align="right">{g(receipt.netWeight)}</Td>
                      {showCost && <Td align="right">{formatINR(receipt.cost ?? 0)}</Td>}
                      <Td>
                        {receipt.attachments.length ? (
                          <span className="flex flex-wrap gap-1.5" onClick={(event) => event.stopPropagation()}>
                            {receipt.attachments.map((file, index) => (
                              <a
                                key={file.id}
                                href={mediaUrl(file.url)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-0.5 text-[12px] font-semibold text-navy hover:bg-navy-soft"
                                title={file.name}
                              >
                                <Paperclip className="size-3" aria-hidden />
                                {file.mime === "application/pdf" ? "PDF" : "Photo"}
                                {receipt.attachments.length > 1 ? ` ${index + 1}` : ""}
                              </a>
                            ))}
                          </span>
                        ) : receipt.source === "purchase" ? (
                          <Badge tone="warn">Missing</Badge>
                        ) : (
                          <span className="text-ash">—</span>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <EmptyState icon={PackagePlus} title="Nothing received yet" description={canEdit ? "Receive their first delivery to start the history." : "Deliveries from them appear here."} />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
