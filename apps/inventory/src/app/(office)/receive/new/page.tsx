"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@webfudge/auth/components";
import { PURITIES } from "@webfudge/config";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Field, Input, PageHeader, Select, Textarea } from "@webfudge/ui";
import type { Design, FileRef, ImageRef, MakingCharge, Supplier } from "@webfudge/utils/api";
import { formatWeight } from "@webfudge/utils/formatters";
import { Attachments } from "@/components/attachments";
import { PhotoStrip } from "@/components/photos";
import { DesignPicker, LocationSelect, MakingInput, useLocations } from "@/components/pickers";
import { errorMessage, useApi, useResource } from "@/lib/api";
import { useBranch } from "@/lib/branch";
import { useScale } from "@/lib/scale";

type Line = {
  key: number;
  design: Design | null;
  purity: string;
  gross: string;
  stone: string;
  huid: string;
  making: MakingCharge | null;
  stoneValue: string;
  cost: string;
  locationId: number | null;
  photos: ImageRef[];
};

let nextKey = 1;
const blankLine = (locationId: number | null, from?: Line): Line => ({
  key: nextKey++,
  design: from?.design ?? null,
  purity: from?.purity ?? "",
  gross: "",
  stone: "",
  huid: "",
  making: from?.making ?? null,
  stoneValue: "",
  cost: "",
  locationId: from?.locationId ?? locationId,
  // Every piece is photographed on its own, so "another like this" starts without photos.
  photos: [],
});

function net(line: Line): number | null {
  const gross = Number(line.gross);
  const stone = Number(line.stone || 0);
  if (!line.gross || !Number.isFinite(gross) || gross <= 0 || !Number.isFinite(stone) || stone >= gross) return null;
  return Math.round((gross - stone) * 1000) / 1000;
}

export default function ReceivePage({ searchParams }: { searchParams: Promise<{ jobWork?: string; karigar?: string; job?: string; supplier?: string; source?: string }> }) {
  const params = use(searchParams);
  // Opened from a karigar job: the pieces count against that job.
  const jobWorkId = Number(params.jobWork) || null;
  const router = useRouter();
  const api = useApi();
  const { hasRole } = useAuth();
  const canCost = hasRole("owner", "branch_manager", "stock_keeper", "accountant");
  const { branch } = useBranch();
  const { locations } = useLocations(branch?.id);
  const scale = useScale();

  // Opened from a supplier's page: that supplier is already chosen.
  const [source, setSource] = useState<"purchase" | "karigar">(jobWorkId || params.source === "karigar" ? "karigar" : "purchase");
  const suppliers = useResource<{ data: Supplier[] }>(`/stock/suppliers?kind=${source === "karigar" ? "karigar" : "supplier"}`);
  const [supplierId, setSupplierId] = useState(params.karigar ?? params.supplier ?? "");
  const [billNumber, setBillNumber] = useState("");
  const [billDate, setBillDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<FileRef[]>([]);
  const [lines, setLines] = useState<Line[]>(() => [blankLine(null)]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: number, patch: Partial<Line>) => setLines((all) => all.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  const ready = lines.filter((line) => line.design && net(line) !== null);
  const totalNet = ready.reduce((sum, line) => sum + (net(line) ?? 0), 0);
  // Says why the receive button is off, piece by piece.
  const blockers = lines.flatMap((line, index) => {
    if (!line.design && !line.gross) return lines.length > 1 ? [`Piece ${index + 1} is empty: fill it in or remove it.`] : [];
    const missing = [!line.design && "pick a design from the catalogue", net(line) === null && "enter a gross weight above the stone weight"].filter(Boolean);
    return missing.length ? [`Piece ${index + 1}: ${missing.join(" and ")}.`] : [];
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!branch) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.post<{ data: { id: number } }>("/stock/receipts", {
        branchId: branch.id,
        source,
        supplierId: Number(supplierId) || undefined,
        ...(jobWorkId ? { jobWorkId } : {}),
        billNumber,
        billDate,
        notes,
        attachmentIds: attachments.map((file) => file.id),
        lines: lines.map((line) => ({
          designId: line.design?.id,
          purity: line.purity,
          grossWeight: line.gross,
          stoneWeight: line.stone || 0,
          huid: line.huid,
          making: line.making ?? undefined,
          stoneValue: line.stoneValue || 0,
          ...(canCost && line.cost ? { costPrice: line.cost } : {}),
          locationId: line.locationId ?? undefined,
          photoIds: line.photos.map((photo) => photo.id),
        })),
      });
      router.replace(`/receive/${result.data.id}?new=1`);
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6" noValidate>
      <PageHeader title="Receive pieces" description={jobWorkId ? `Pieces back from the karigar for job ${params.job ?? ""}. They count against the gold given.` : `Into ${branch?.name ?? "this branch"}. Each line becomes one tagged piece.`} />

      <Card>
        <CardHeader title="Delivery" />
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Type" htmlFor="receive-source">
            <Select
              id="receive-source"
              value={source}
              onChange={(event) => {
                setSource(event.target.value as typeof source);
                setSupplierId("");
              }}
            >
              <option value="purchase">Supplier bill</option>
              <option value="karigar">Karigar delivery</option>
            </Select>
          </Field>
          <Field
            label={source === "karigar" ? "Karigar" : "Supplier"}
            htmlFor="receive-supplier"
            hint={
              <Link href="/suppliers" className="underline">
                Add a {source === "karigar" ? "karigar" : "supplier"}
              </Link>
            }
          >
            <Select id="receive-supplier" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
              <option value="">Choose</option>
              {suppliers.data?.data.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                  {supplier.city ? `, ${supplier.city}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Bill or challan number" htmlFor="receive-bill">
            <Input id="receive-bill" value={billNumber} onChange={(event) => setBillNumber(event.target.value)} />
          </Field>
          <Field label="Bill date" htmlFor="receive-date">
            <Input id="receive-date" type="date" value={billDate} onChange={(event) => setBillDate(event.target.value)} />
          </Field>
          <Field label="Notes" htmlFor="receive-notes" className="sm:col-span-2 lg:col-span-4">
            <Textarea id="receive-notes" value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-12" />
          </Field>
          <div className="grid gap-1.5 sm:col-span-2 lg:col-span-4">
            <p className="text-[13px] font-semibold text-ink">
              {source === "karigar" ? "Karigar's challan" : "Supplier's bill or challan"} <span className="font-normal text-ash">· optional, photo or PDF. Kept with the receipt and on the supplier&apos;s page.</span>
            </p>
            <Attachments id="receive-bill-files" files={attachments} onChange={setAttachments} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Pieces"
          description="Weigh each piece. Net weight is worked out for you."
          action={
            scale.supported ? (
              scale.connected ? (
                <Badge tone="ok">Scale connected{scale.reading !== null ? ` · ${formatWeight(scale.reading)}` : ""}</Badge>
              ) : (
                <Button size="sm" variant="secondary" onClick={scale.connect}>
                  Connect scale
                </Button>
              )
            ) : (
              <span className="text-[12px] text-ash">Type weights, or use Chrome or Edge to read the scale.</span>
            )
          }
        />
        {scale.error && <Alert tone="warn" className="mx-5 mt-4">{scale.error}</Alert>}
        <div className="grid gap-3 p-4">
          {lines.map((line, index) => {
            const purities = PURITIES.filter((entry) => !line.design || entry.metal === line.design.metal);
            const lineNet = net(line);
            return (
              <div key={line.key} className="grid gap-3 rounded-xl border border-gray-200 p-4 md:grid-cols-12">
                <div className="flex items-center justify-between md:col-span-12">
                  <span className="text-[12px] font-semibold text-ash">Piece {index + 1}</span>
                  <span className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setLines((all) => [...all.slice(0, index + 1), blankLine(null, line), ...all.slice(index + 1)])}>
                      Another like this
                    </Button>
                    {lines.length > 1 && (
                      <Button size="sm" variant="ghost" onClick={() => setLines((all) => all.filter((entry) => entry.key !== line.key))}>
                        Remove
                      </Button>
                    )}
                  </span>
                </div>
                <Field label="Design" htmlFor={`line-${line.key}-design`} className="md:col-span-4">
                  <DesignPicker
                    id={`line-${line.key}-design`}
                    value={line.design}
                    purity={line.purity}
                    making={line.making}
                    onChange={(design) =>
                      update(line.key, {
                        design,
                        purity: design?.defaultPurity ?? PURITIES.find((entry) => entry.metal === design?.metal)?.code ?? "",
                        making: design?.making ?? null,
                      })
                    }
                  />
                </Field>
                <Field label="Purity" htmlFor={`line-${line.key}-purity`} className="md:col-span-2">
                  <Select id={`line-${line.key}-purity`} value={line.purity} onChange={(event) => update(line.key, { purity: event.target.value })}>
                    <option value="">Choose</option>
                    {purities.map((entry) => (
                      <option key={entry.code} value={entry.code}>
                        {entry.code}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Gross (g)" htmlFor={`line-${line.key}-gross`} className="md:col-span-2">
                  <div className="flex gap-1">
                    <Input id={`line-${line.key}-gross`} inputMode="decimal" value={line.gross} onChange={(event) => update(line.key, { gross: event.target.value })} className="tabular-nums" />
                    {scale.connected && scale.reading !== null && (
                      <Button size="sm" variant="secondary" className="h-10" onClick={() => update(line.key, { gross: String(scale.reading) })} title="Use the scale reading">
                        ⚖
                      </Button>
                    )}
                  </div>
                </Field>
                <Field label="Stones (g)" htmlFor={`line-${line.key}-stone`} className="md:col-span-2">
                  <Input id={`line-${line.key}-stone`} inputMode="decimal" value={line.stone} onChange={(event) => update(line.key, { stone: event.target.value })} className="tabular-nums" />
                </Field>
                <div className="grid content-end gap-1 md:col-span-2">
                  <span className="text-[13px] font-semibold">Net</span>
                  <span className="flex h-10 items-center rounded-[var(--radius-control)] bg-sunk px-3 text-sm font-semibold tabular-nums">
                    {lineNet === null ? "—" : formatWeight(lineNet)}
                  </span>
                </div>
                <Field label="HUID" htmlFor={`line-${line.key}-huid`} className="md:col-span-2">
                  <Input id={`line-${line.key}-huid`} maxLength={6} value={line.huid} onChange={(event) => update(line.key, { huid: event.target.value })} className="font-mono uppercase" />
                </Field>
                <Field label="Making" htmlFor={`line-${line.key}-making`} className="md:col-span-4">
                  <MakingInput id={`line-${line.key}-making`} value={line.making} onChange={(making) => update(line.key, { making })} />
                </Field>
                <Field label="Stone value (₹)" htmlFor={`line-${line.key}-stone-value`} className="md:col-span-2">
                  <Input id={`line-${line.key}-stone-value`} inputMode="decimal" value={line.stoneValue} onChange={(event) => update(line.key, { stoneValue: event.target.value })} className="tabular-nums" />
                </Field>
                {canCost && (
                  <Field label="Cost (₹)" htmlFor={`line-${line.key}-cost`} className="md:col-span-2">
                    <Input id={`line-${line.key}-cost`} inputMode="decimal" value={line.cost} onChange={(event) => update(line.key, { cost: event.target.value })} className="tabular-nums" />
                  </Field>
                )}
                <Field label="Tray" htmlFor={`line-${line.key}-tray`} className={canCost ? "md:col-span-2" : "md:col-span-4"}>
                  <LocationSelect id={`line-${line.key}-tray`} locations={locations} value={line.locationId} onChange={(locationId) => update(line.key, { locationId })} emptyLabel="Decide later" />
                </Field>
                <div className="grid gap-1.5 md:col-span-12">
                  <span className="text-sm font-medium text-gray-700">
                    Photos <span className="font-normal text-ash">(optional, shown on the showroom tablets)</span>
                  </span>
                  <PhotoStrip id={`line-${line.key}-photos`} photos={line.photos} onChange={(photos) => update(line.key, { photos })} compact />
                </div>
              </div>
            );
          })}
          <Button variant="secondary" className="justify-self-start" onClick={() => setLines((all) => [...all, blankLine(all.at(-1)?.locationId ?? null)])}>
            Add a piece
          </Button>
        </div>
      </Card>

      {error && <Alert tone="risk">{error}</Alert>}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" loading={busy} disabled={!ready.length || ready.length !== lines.length}>
          Receive {lines.length} {lines.length === 1 ? "piece" : "pieces"} and create tags
        </Button>
        <span className="text-[13px] text-ash tabular-nums">Total net {formatWeight(totalNet)}</span>
      </div>
      {blockers.length > 0 && (
        <ul className="-mt-2 grid gap-1 text-[13px] text-risk">
          {blockers.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </form>
  );
}
