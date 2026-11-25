"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Building2,
  CalendarClock,
  FileText,
  FileWarning,
  Hammer,
  IdCard,
  IndianRupee,
  Mail,
  MapPin,
  PackageCheck,
  PackagePlus,
  Paperclip,
  Pencil,
  Phone,
  StickyNote,
  Truck,
  User,
} from "lucide-react";
import { useAuth } from "@webfudge/auth/components";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DetailHero,
  EmptyState,
  HeroFact,
  InfoGrid,
  InfoRow,
  InfoSection,
  KpiCard,
  PageHeader,
  Spinner,
  StatusBadge,
  StatusPill,
  Table,
  Tabs,
  Td,
  Th,
  ToolbarSearch,
  Tr,
  buttonClass,
} from "@webfudge/ui";
import type { JobWork, Page, StockItem, SupplierDetail } from "@webfudge/utils/api";
import { formatDate, formatINR } from "@webfudge/utils/formatters";
import { PieceThumb } from "@/components/photos";
import { SupplierForm } from "@/components/supplier-form";
import { useResource } from "@/lib/api";
import { mediaUrl } from "@/lib/env";
import { SOURCE_LABELS } from "@/lib/labels";

type Tab = "overview" | "deliveries" | "pieces" | "jobs" | "bills";

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
  const pieces = useResource<Page<StockItem>>(supplier ? `/stock/items?supplierId=${id}&status=all&pageSize=200` : null);
  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const [pieceQuery, setPieceQuery] = useState("");

  const files = useMemo(() => (supplier?.receipts ?? []).flatMap((receipt) => receipt.attachments.map((file) => ({ file, receipt }))), [supplier]);

  if (loading && !supplier) return <Spinner className="text-navy" />;
  if (error || !supplier) return <p className="text-sm text-risk">{error ?? "Supplier not found."}</p>;
  const stats = supplier.stats;
  const showCost = stats.costTotal !== undefined;
  const receiveHref = `/receive/new?supplier=${supplier.id}&source=${karigar ? "karigar" : "purchase"}`;
  const jobRows = jobs.data?.data ?? [];
  const openJobs = jobRows.filter((job) => job.status === "open");
  const goldWithThem = openJobs.filter((job) => (job.totals?.metal ?? "gold") === "gold").reduce((sum, job) => sum + (job.totals?.balanceFine ?? 0), 0);
  const allPieces = pieces.data?.data ?? [];
  const needle = pieceQuery.trim().toLowerCase();
  const pieceRows = needle ? allPieces.filter((piece) => [piece.tagNumber, piece.design?.name, piece.design?.code, piece.huid].some((value) => value?.toLowerCase().includes(needle))) : allPieces;

  const contact = [
    supplier.contactPerson && { icon: User, label: "Contact person", text: supplier.contactPerson },
    supplier.phone && { icon: Phone, label: "Phone", text: supplier.phone, href: `tel:${supplier.phone}` },
    supplier.email && { icon: Mail, label: "Email", text: supplier.email, href: `mailto:${supplier.email}` },
  ].filter(Boolean) as { icon: typeof User; label: string; text: string; href?: string }[];

  const receiptsTable = (rows: SupplierDetail["receipts"]) => (
    <Table minWidth={760}>
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
        {rows.map((receipt) => (
          <Tr key={receipt.id} className="cursor-pointer" onClick={() => router.push(`/receive/${receipt.id}`)}>
            <Td>
              <Link href={`/receive/${receipt.id}`} className="grid leading-tight" onClick={(event) => event.stopPropagation()}>
                <span className="font-mono font-semibold text-ink hover:underline">{receipt.number}</span>
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
                <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-0.5 text-[12px] font-semibold text-navy">
                  <Paperclip className="size-3" aria-hidden />
                  {receipt.attachments.length}
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
  );

  return (
    <div className="grid gap-6">
      <PageHeader
        title={supplier.name}
        description={karigar ? "Karigar: jobs, metal given, pieces made and their challans." : "Supplier: deliveries, bills and the pieces bought from them."}
        actions={
          canEdit && (
            <>
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
            </>
          )
        }
      />

      <DetailHero
        icon={karigar ? Hammer : Truck}
        title={supplier.name}
        badges={
          <>
            <StatusPill tone={karigar ? "gold" : "navy"}>{karigar ? "Karigar" : "Supplier"}</StatusPill>
            {!supplier.isActive && <StatusPill tone="neutral">Inactive</StatusPill>}
          </>
        }
        meta={
          <>
            {supplier.city && <HeroFact icon={MapPin}>{supplier.city}</HeroFact>}
            {supplier.phone && <HeroFact icon={Phone}>{supplier.phone}</HeroFact>}
            {supplier.gstin && (
              <HeroFact icon={IdCard}>
                <span className="font-mono">{supplier.gstin}</span>
              </HeroFact>
            )}
          </>
        }
        stat={
          karigar
            ? { label: "Fine gold with them", value: g(goldWithThem), note: `${openJobs.length} open ${openJobs.length === 1 ? "job" : "jobs"}` }
            : { label: showCost ? "Bought for" : "Pieces received", value: showCost ? formatINR(stats.costTotal ?? 0) : String(stats.pieces), note: stats.lastReceivedAt ? `Last delivery ${formatDate(stats.lastReceivedAt)}` : "No deliveries yet" }
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard compact title="Received" value={`${stats.pieces} pieces`} icon={Boxes} subtitle={`${g(stats.netReceived)} net on ${stats.receipts} receipts`} />
        <KpiCard compact title="Still in stock" value={`${stats.inStock} pieces`} icon={PackageCheck} tone="ok" subtitle={`${g(stats.netInStock)} net`} />
        <KpiCard compact title="Sold" value={`${stats.sold} pieces`} icon={IndianRupee} tone="gold" subtitle={stats.pieces ? `${Math.round((stats.sold / stats.pieces) * 100)}% of what came in` : "Nothing received yet"} />
        <KpiCard compact title="Bills missing" value={String(stats.billsMissing)} icon={FileWarning} tone={stats.billsMissing ? "warn" : "ok"} subtitle={stats.billsMissing ? "Attach them on the receipt" : "Every bill is attached"} />
      </div>

      <Tabs<Tab>
        variant="pill"
        label="Supplier sections"
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "overview", label: "Overview" },
          { key: "deliveries", label: "Deliveries", count: supplier.receipts.length },
          { key: "pieces", label: "Pieces", count: pieces.data?.meta.pagination.total },
          ...(karigar ? [{ key: "jobs" as const, label: "Karigar jobs", count: jobRows.length }] : []),
          { key: "bills", label: "Bills & challans", count: files.length },
        ]}
      />

      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              title={editing ? "Edit details" : "Details"}
              description={editing ? undefined : "Contact, tax and notes."}
              action={
                canEdit && !editing ? (
                  <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                    <Pencil className="size-3.5" aria-hidden />
                    Edit
                  </Button>
                ) : undefined
              }
            />
            <CardBody className="grid gap-5">
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
                <>
                  <InfoSection title="Contact" icon={User} first>
                    {contact.length ? (
                      <InfoGrid columns={3}>
                        {contact.map((entry) => (
                          <InfoRow key={entry.label} label={entry.label} icon={entry.icon}>
                            {entry.href ? (
                              <a href={entry.href} className="text-navy hover:underline">
                                {entry.text}
                              </a>
                            ) : (
                              entry.text
                            )}
                          </InfoRow>
                        ))}
                      </InfoGrid>
                    ) : (
                      <p className="text-sm text-ash">No contact details yet.{canEdit ? " Use Edit to add them." : ""}</p>
                    )}
                  </InfoSection>
                  <InfoSection title="Address and tax" icon={Building2}>
                    <InfoGrid>
                      <InfoRow label="Address" icon={MapPin}>
                        {[supplier.address, supplier.city].filter(Boolean).join(", ") || null}
                      </InfoRow>
                      <InfoRow label="GSTIN" icon={IdCard} mono>
                        {supplier.gstin}
                      </InfoRow>
                    </InfoGrid>
                  </InfoSection>
                  {supplier.notes && (
                    <InfoSection title="Notes" icon={StickyNote}>
                      <p className="rounded-lg bg-gray-50 p-3 text-sm whitespace-pre-line text-ink">{supplier.notes}</p>
                    </InfoSection>
                  )}
                </>
              )}
            </CardBody>
          </Card>
          <div className="grid content-start gap-6">
            {stats.billsMissing > 0 && (
              <Alert tone="warn" title={stats.billsMissing === 1 ? "1 receipt has no bill" : `${stats.billsMissing} receipts have no bill`}>
                Open the receipt and photograph the bill or attach its PDF.
              </Alert>
            )}
            <Card>
              <CardHeader title="Latest deliveries" action={supplier.receipts.length > 4 && <button type="button" onClick={() => setTab("deliveries")} className="text-[13px] font-semibold text-navy hover:underline">All</button>} />
              {supplier.receipts.length ? (
                <ul className="divide-y divide-gray-100">
                  {supplier.receipts.slice(0, 5).map((receipt) => (
                    <li key={receipt.id}>
                      <Link href={`/receive/${receipt.id}`} className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-navy-soft/40">
                        <span className="grid leading-tight">
                          <span className="font-mono text-[13px] font-semibold text-ink">{receipt.number}</span>
                          <span className="text-[12px] text-ash">{formatDate(receipt.createdAt)}</span>
                        </span>
                        <span className="text-right text-[13px] leading-tight">
                          <span className="block font-semibold text-ink">{receipt.pieces} pieces</span>
                          <span className="text-ash">{g(receipt.netWeight)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <CardBody>
                  <p className="text-sm text-ash">Nothing received yet.</p>
                </CardBody>
              )}
            </Card>
            {karigar && (
              <Card>
                <CardHeader title="Open jobs" action={jobRows.length > 0 && <button type="button" onClick={() => setTab("jobs")} className="text-[13px] font-semibold text-navy hover:underline">All</button>} />
                {openJobs.length ? (
                  <ul className="divide-y divide-gray-100">
                    {openJobs.slice(0, 5).map((job) => (
                      <li key={job.id}>
                        <Link href={`/karigar/${job.id}`} className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-navy-soft/40">
                          <span className="grid leading-tight">
                            <span className="font-mono text-[13px] font-semibold text-ink">{job.number}</span>
                            <span className="line-clamp-1 text-[12px] text-ash">{job.description || "—"}</span>
                          </span>
                          <span className="text-[13px] font-semibold text-ink tabular-nums">{g(job.totals?.balanceFine ?? 0)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <CardBody>
                    <p className="text-sm text-ash">No open jobs.</p>
                  </CardBody>
                )}
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === "deliveries" && (
        <Card className="overflow-hidden">
          {supplier.receipts.length ? receiptsTable(supplier.receipts) : <EmptyState icon={PackagePlus} title="Nothing received yet" description="Deliveries from them appear here." />}
        </Card>
      )}

      {tab === "pieces" && (
        <div className="grid gap-4">
          <ToolbarSearch value={pieceQuery} onChange={setPieceQuery} placeholder="Tag, design or HUID…" />
          <Card className="overflow-hidden">
            {pieces.loading && !pieces.data ? (
              <div className="grid place-items-center p-10 text-navy">
                <Spinner />
              </div>
            ) : !pieceRows.length ? (
              <EmptyState icon={Boxes} title="No pieces" description={needle ? "Nothing matches the search." : "Pieces received from them appear here."} />
            ) : (
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
                    <Th>Received</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {pieceRows.map((piece) => (
                    <Tr key={piece.id} className="cursor-pointer" onClick={() => router.push(`/stock/${piece.id}`)}>
                      <Td className="py-2 pr-0">
                        <PieceThumb item={piece} />
                      </Td>
                      <Td className="font-mono font-semibold text-ink">{piece.tagNumber}</Td>
                      <Td>{piece.design?.name}</Td>
                      <Td>{piece.purity}</Td>
                      <Td align="right">{g(piece.netWeight)}</Td>
                      <Td className="whitespace-nowrap">{piece.receivedAt ? formatDate(piece.receivedAt) : "—"}</Td>
                      <Td>
                        <StatusBadge status={piece.status} />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
      )}

      {tab === "jobs" && karigar && (
        <Card className="overflow-hidden">
          {jobRows.length ? (
            <Table minWidth={680}>
              <thead>
                <tr>
                  <Th>Job</Th>
                  <Th>Work</Th>
                  <Th align="right">Fine given</Th>
                  <Th align="right">Pieces back</Th>
                  <Th align="right">Balance</Th>
                  <Th>Due</Th>
                </tr>
              </thead>
              <tbody>
                {jobRows.map((job) => (
                  <Tr key={job.id} className="cursor-pointer" onClick={() => router.push(`/karigar/${job.id}`)}>
                    <Td>
                      <span className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-ink">{job.number}</span>
                        <Badge tone={job.status === "closed" ? "ok" : "gold"} dot>
                          {job.status === "closed" ? "Closed" : "Open"}
                        </Badge>
                      </span>
                    </Td>
                    <Td className="max-w-64">
                      <span className="line-clamp-1 text-[13px]">{job.description || "—"}</span>
                    </Td>
                    <Td align="right">{g(job.totals?.issuedFine ?? 0)}</Td>
                    <Td align="right">{job.totals?.receivedPieces ?? 0}</Td>
                    <Td align="right" className={(job.totals?.balanceFine ?? 0) < 0 ? "text-risk" : "font-semibold text-ink"}>
                      {g(job.totals?.balanceFine ?? 0)}
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="size-3.5 text-gray-400" aria-hidden />
                        {job.dueOn ? formatDate(job.dueOn) : "—"}
                      </span>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState icon={Hammer} title="No jobs yet" description="Jobs with this karigar appear here." />
          )}
        </Card>
      )}

      {tab === "bills" && (
        <Card>
          <CardHeader title="Bills & challans" description="Every file attached to their deliveries. Open one to view or print it." />
          {files.length ? (
            <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {files.map(({ file, receipt }) => (
                <a key={file.id} href={mediaUrl(file.url)} target="_blank" rel="noreferrer" className="group grid overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <span className="grid aspect-[4/3] place-items-center bg-gray-50">
                    {file.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaUrl(file.thumbnailUrl)} alt="" className="size-full object-cover" />
                    ) : (
                      <FileText className="size-10 text-risk" aria-hidden />
                    )}
                  </span>
                  <span className="grid gap-0.5 p-3 leading-tight">
                    <span className="truncate text-[13px] font-semibold text-ink group-hover:underline">{file.name}</span>
                    <span className="text-[12px] text-ash">
                      {receipt.number}
                      {receipt.billNumber ? ` · bill ${receipt.billNumber}` : ""} · {formatDate(receipt.createdAt)}
                    </span>
                  </span>
                </a>
              ))}
            </CardBody>
          ) : (
            <EmptyState icon={Paperclip} title="No files yet" description="Photograph the bill or attach its PDF when you receive goods." />
          )}
        </Card>
      )}
    </div>
  );
}
