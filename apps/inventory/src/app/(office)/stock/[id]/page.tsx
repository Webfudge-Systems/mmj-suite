"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Calculator,
  CalendarClock,
  Gem,
  Hammer,
  ImagePlus,
  IndianRupee,
  MapPin,
  Pencil,
  Printer,
  Scale,
  ScanBarcode,
  Store,
  Truck,
} from "lucide-react";
import { useAuth } from "@webfudge/auth/components";
import { HALLMARK_CHARGE_PER_PIECE, PURITIES } from "@webfudge/config";
import { useCurrentRates } from "@webfudge/hooks";
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
  Field,
  HeroFact,
  InfoGrid,
  InfoRow,
  InfoSection,
  Input,
  KpiCard,
  Modal,
  PageHeader,
  Select,
  Spinner,
  StatusBadge,
  buttonClass,
} from "@webfudge/ui";
import type { ImageRef, MakingCharge, Movement, StockItem } from "@webfudge/utils/api";
import {
  formatDate,
  formatDateTime,
  formatINR,
  formatRupees,
  formatWeight,
} from "@webfudge/utils/formatters";
import { calculatePrice, rateFor } from "@webfudge/utils/pricing";
import { PhotoStrip } from "@/components/photos";
import { MakingInput } from "@/components/pickers";
import { errorMessage, useApi, useResource } from "@/lib/api";
import { API_URL, mediaUrl } from "@/lib/env";

type Detail = StockItem & { movements: Movement[] };

const MOVEMENT_LABELS: Partial<Record<string, string>> = {
  received: "Received",
  imported: "Imported as opening stock",
  moved: "Moved",
  edited: "Details corrected",
  dispatched: "Sent to another branch",
  arrived: "Arrived from another branch",
  audited: "Counted",
  sold: "Sold",
  returned: "Returned by the customer",
  approval_out: "Sent out on approval",
  approval_back: "Back from approval",
  picked: "Taken out by a salesperson",
  put_back: "Put back in the tray",
  reserved: "Put on an estimate",
  released: "Taken off the estimate",
  sale_cancelled: "Sale cancelled, back in stock",
};

function describe(movement: Movement): string {
  const parts: string[] = [];
  if (movement.fromLocation || movement.toLocation) {
    parts.push(
      `${movement.fromLocation?.fullCode ?? "no tray"} → ${movement.toLocation?.fullCode ?? "no tray"}`,
    );
  }
  if (movement.fromBranch && movement.toBranch && movement.fromBranch.id !== movement.toBranch.id) {
    parts.push(`${movement.fromBranch.name} → ${movement.toBranch.name}`);
  }
  if (movement.changes) {
    parts.push(
      Object.entries(movement.changes)
        .map(
          ([field, [before, after]]) =>
            `${field}: ${typeof before === "object" ? JSON.stringify(before) : (before ?? "—")} → ${typeof after === "object" ? JSON.stringify(after) : (after ?? "—")}`,
        )
        .join(", "),
    );
  }
  if (movement.reference) parts.push(movement.reference);
  return parts.join(" · ");
}

function Price({ item }: { item: StockItem }) {
  const { card } = useCurrentRates(API_URL);
  const rate = card ? rateFor(card.rates, item.purity) : undefined;
  if (!rate || !item.making)
    return <p className="text-[13px] text-ash">No rate published for {item.purity} yet.</p>;
  const price = calculatePrice({
    netWeight: item.netWeight,
    ratePerGram: rate,
    making:
      item.making.type === "percent"
        ? { type: "percent", percent: item.making.value }
        : { type: item.making.type, amount: item.making.value },
    stoneValue: item.stoneValue,
    otherCharges: item.huid ? HALLMARK_CHARGE_PER_PIECE : 0,
  });
  const rows: [string, number][] = [
    [`Metal · ${formatINR(rate)} × ${formatWeight(item.netWeight)}`, price.metalValue],
    ["Making", price.makingCharge],
    ["Stones", price.stoneValue],
    ["Hallmark", price.otherCharges],
    ["GST 3%", price.gst],
  ];
  return (
    <div className="grid gap-1 text-[13.5px]">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex justify-between gap-4 border-b border-dashed border-line py-1 tabular-nums"
        >
          <span className="text-ash">{label}</span>
          <span>{formatINR(value)}</span>
        </div>
      ))}
      <div className="flex justify-between gap-4 pt-2 text-lg font-semibold text-navy tabular-nums">
        <span>Price today</span>
        <span>{formatRupees(price.roundedTotal)}</span>
      </div>
    </div>
  );
}

function EditForm({ item, onSaved }: { item: StockItem; onSaved: (item: StockItem) => void }) {
  const api = useApi();
  const { hasRole } = useAuth();
  const canCost = hasRole("owner", "branch_manager", "stock_keeper", "accountant");
  const [purity, setPurity] = useState<string>(item.purity);
  const [gross, setGross] = useState(String(item.grossWeight));
  const [stone, setStone] = useState(String(item.stoneWeight));
  const [huid, setHuid] = useState(item.huid ?? "");
  const [making, setMaking] = useState<MakingCharge | null>(item.making);
  const [stoneValue, setStoneValue] = useState(String(item.stoneValue));
  const [cost, setCost] = useState(item.costPrice == null ? "" : String(item.costPrice));
  const [legacyTag, setLegacyTag] = useState(item.legacyTag ?? "");
  const [rfid, setRfid] = useState(item.rfid ?? "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api.put<{ data: StockItem }>(`/stock/items/${item.id}`, {
        purity,
        grossWeight: gross,
        stoneWeight: stone,
        huid,
        making,
        stoneValue,
        legacyTag,
        rfid,
        reason,
        ...(canCost ? { costPrice: cost } : {}),
      });
      onSaved(result.data);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Purity" htmlFor="edit-purity">
        <Select id="edit-purity" value={purity} onChange={(event) => setPurity(event.target.value)}>
          {PURITIES.filter((entry) => entry.metal === item.metal).map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="HUID" htmlFor="edit-huid">
        <Input
          id="edit-huid"
          value={huid}
          maxLength={6}
          onChange={(event) => setHuid(event.target.value)}
          className="font-mono uppercase"
        />
      </Field>
      <Field label="Gross weight (g)" htmlFor="edit-gross">
        <Input
          id="edit-gross"
          inputMode="decimal"
          value={gross}
          onChange={(event) => setGross(event.target.value)}
          className="tabular-nums"
        />
      </Field>
      <Field label="Stone weight (g)" htmlFor="edit-stone">
        <Input
          id="edit-stone"
          inputMode="decimal"
          value={stone}
          onChange={(event) => setStone(event.target.value)}
          className="tabular-nums"
        />
      </Field>
      <Field label="Making charge" htmlFor="edit-making">
        <MakingInput id="edit-making" value={making} onChange={setMaking} />
      </Field>
      <Field label="Stone value (₹)" htmlFor="edit-stone-value">
        <Input
          id="edit-stone-value"
          inputMode="decimal"
          value={stoneValue}
          onChange={(event) => setStoneValue(event.target.value)}
          className="tabular-nums"
        />
      </Field>
      {canCost && (
        <Field label="Cost (₹)" htmlFor="edit-cost" hint="Never shown to salespeople or cashiers.">
          <Input
            id="edit-cost"
            inputMode="decimal"
            value={cost}
            onChange={(event) => setCost(event.target.value)}
            className="tabular-nums"
          />
        </Field>
      )}
      <Field
        label="RFID tag"
        htmlFor="edit-rfid"
        hint="Scan the RFID tag with the reader to fill this in."
      >
        <Input
          id="edit-rfid"
          value={rfid}
          onChange={(event) => setRfid(event.target.value)}
          className="font-mono uppercase"
        />
      </Field>
      <Field label="Old tag number" htmlFor="edit-legacy">
        <Input
          id="edit-legacy"
          value={legacyTag}
          onChange={(event) => setLegacyTag(event.target.value)}
          className="font-mono uppercase"
        />
      </Field>
      <Field
        label="Reason for the change"
        htmlFor="edit-reason"
        hint="Saved in the piece's history."
        className="sm:col-span-2"
      >
        <Input
          id="edit-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
      {error && (
        <Alert tone="risk" className="sm:col-span-2">
          {error}
        </Alert>
      )}
      <Button type="submit" loading={busy} className="justify-self-start">
        Save changes
      </Button>
    </form>
  );
}

/**
 * The piece's photos, shop style: one large photo with small ones underneath;
 * tapping a small one shows it large. "Manage photos" adds, removes or changes
 * the main photo, saving straight away. Falls back to the design's photo.
 */
function PieceGallery({ item, canEdit, onSaved }: { item: Detail; canEdit: boolean; onSaved: () => void }) {
  const api = useApi();
  const [photos, setPhotos] = useState<ImageRef[]>(item.photos);
  const [shown, setShown] = useState(0);
  const [managing, setManaging] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fallback = !photos.length ? (item.design?.image ?? null) : null;
  const big = photos[Math.min(shown, photos.length - 1)] ?? fallback;

  async function save(next: ImageRef[]) {
    const before = photos;
    setPhotos(next);
    setShown(0);
    setSaving(true);
    setError(null);
    try {
      await api.put(`/stock/items/${item.id}/photos`, { photoIds: next.map((photo) => photo.id) });
      onSaved();
    } catch (cause) {
      setPhotos(before);
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative grid aspect-square w-full place-items-center bg-[radial-gradient(circle_at_50%_40%,var(--color-surface),var(--color-sunk))]">
        {big ? (
          <button type="button" onClick={() => setZoom(true)} className="size-full cursor-zoom-in" title="View large">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl(big.url)} alt={item.design?.name ?? item.tagNumber} className="size-full object-contain" />
          </button>
        ) : (
          <span className="grid justify-items-center gap-2 text-gray-300">
            <Gem className="size-14" aria-hidden />
            <span className="text-[13px] font-semibold text-ash">No photo yet</span>
          </span>
        )}
        {fallback && <span className="absolute top-3 left-3 rounded-lg bg-white/90 px-2 py-1 text-[11px] font-semibold text-ash shadow-sm">Design photo</span>}
        {saving && (
          <span className="absolute top-3 right-3 rounded-full bg-white/90 p-1.5 shadow-sm">
            <Spinner className="size-4 text-navy" label="Saving photos" />
          </span>
        )}
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto border-t border-gray-100 p-3">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setShown(index)}
              aria-label={`Show photo ${index + 1}`}
              aria-pressed={index === shown}
              className={`size-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${index === shown ? "border-gold shadow-md" : "border-transparent opacity-70 hover:opacity-100"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(photo.thumbnailUrl)} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {canEdit && (
        <div className="grid gap-3 border-t border-gray-100 p-3">
          <button type="button" onClick={() => setManaging((value) => !value)} className="flex items-center gap-1.5 justify-self-start text-[13px] font-semibold text-navy hover:underline">
            <ImagePlus className="size-4" aria-hidden />
            {managing ? "Done" : photos.length ? "Manage photos" : "Add photos"}
          </button>
          {managing && <PhotoStrip id={`piece-${item.id}-photos`} photos={photos} onChange={save} disabled={saving} compact />}
          {managing && <p className="text-[12px] text-ash">Tap a photo to make it the main one. The main photo is what the tablets and the stock list show.</p>}
        </div>
      )}
      {error && (
        <div className="px-3 pb-3">
          <Alert tone="risk">{error}</Alert>
        </div>
      )}
      {zoom && big && (
        <button type="button" onClick={() => setZoom(false)} className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-6" aria-label="Close photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl(big.url)} alt="" className="max-h-full max-w-full rounded-xl shadow-2xl" />
        </button>
      )}
    </Card>
  );
}

const MOVEMENT_TONES: Partial<Record<string, "navy" | "gold" | "ok" | "risk">> = {
  received: "ok",
  imported: "ok",
  sold: "gold",
  returned: "risk",
  edited: "navy",
  audited: "navy",
};

export default function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasRole } = useAuth();
  const canEdit = hasRole("owner", "branch_manager", "stock_keeper");
  const { data, error, loading, reload } = useResource<{ data: Detail }>(`/stock/items/${id}`);
  const { card } = useCurrentRates(API_URL);
  const [editing, setEditing] = useState(false);
  const [breakdown, setBreakdown] = useState(false);
  const [now] = useState(() => Date.now());
  const item = data?.data;

  if (loading && !item) return <Spinner className="text-navy" />;
  if (error || !item) return <p className="text-sm text-risk">{error ?? "Piece not found."}</p>;

  const rate = card ? rateFor(card.rates, item.purity) : undefined;
  const price =
    rate && item.making
      ? calculatePrice({
          netWeight: item.netWeight,
          ratePerGram: rate,
          making: item.making.type === "percent" ? { type: "percent", percent: item.making.value } : { type: item.making.type, amount: item.making.value },
          stoneValue: item.stoneValue,
          otherCharges: item.huid ? HALLMARK_CHARGE_PER_PIECE : 0,
        })
      : null;
  const days = item.receivedAt ? Math.max(0, Math.floor((now - new Date(item.receivedAt).getTime()) / 86400000)) : null;
  const photo = item.photos[0] ?? item.design?.image ?? null;
  const editable = canEdit && !["sold", "melted", "in_transit"].includes(item.status);
  const making = item.making
    ? item.making.type === "percent"
      ? `${item.making.value}% of metal`
      : `${formatINR(item.making.value)}${item.making.type === "per_gram" ? " per gram" : " fixed"}`
    : null;

  return (
    <div className="grid gap-6">
      <PageHeader
        title={
          <CopyText value={item.tagNumber} label="Copy tag number">
            <span className="font-mono">{item.tagNumber}</span>
          </CopyText>
        }
        description={item.design ? `${item.design.name} · ${item.purity}` : item.purity}
        actions={
          <>
            <Link href={`/tags?ids=${item.id}`} className={buttonClass("secondary")}>
              <Printer className="size-4" aria-hidden />
              Print tag
            </Link>
            {editable && !editing && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="size-4" aria-hidden />
                Correct details
              </Button>
            )}
            {item.design && (
              <Link href={`/stock?designId=${item.design.id}`} className={buttonClass("ghost")}>
                More of this design
              </Link>
            )}
          </>
        }
      />
      <DetailHero
        image={
          <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-white bg-white text-gray-300 shadow-lg">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(photo.thumbnailUrl)} alt={item.design?.name ?? item.tagNumber} className="size-full object-cover" />
            ) : (
              <Gem className="size-8" aria-hidden />
            )}
          </span>
        }
        title={<span className="font-mono">{item.tagNumber}</span>}
        badges={
          <>
            <StatusBadge status={item.status} />
            <Badge tone="gold">{item.purity}</Badge>
            {item.huid && <Badge tone="ok">Hallmarked</Badge>}
          </>
        }
        meta={
          <>
            {item.design && (
              <HeroFact icon={Gem}>
                {item.design.name} <span className="font-mono text-[12px]">({item.design.code})</span>
              </HeroFact>
            )}
            <HeroFact icon={MapPin}>{item.location ? `${item.location.fullCode}${item.slot ? ` · slot ${item.slot}` : ""}` : "Needs a tray"}</HeroFact>
            {item.branch && <HeroFact icon={Store}>{item.branch.name}</HeroFact>}
          </>
        }
        stat={{ label: "Price today", value: price ? formatRupees(price.roundedTotal) : "—", note: rate ? `${item.purity} at ${formatINR(rate)}/g` : `No ${item.purity} rate yet` }}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard compact title="Net weight" value={formatWeight(item.netWeight)} icon={Scale} subtitle={`Gross ${formatWeight(item.grossWeight)} · stones ${formatWeight(item.stoneWeight)}`} />
        <KpiCard compact title="Making" value={making ?? "—"} icon={Hammer} tone="gold" subtitle={price ? `${formatINR(price.makingCharge)} on today's price` : "Charged on the bill"} />
        <KpiCard compact title="In stock for" value={days === null ? "—" : `${days} ${days === 1 ? "day" : "days"}`} icon={CalendarClock} tone={days !== null && days > 180 ? "warn" : "navy"} subtitle={item.receivedAt ? `Since ${formatDate(item.receivedAt)}` : "Date not known"} />
        {item.costPrice !== undefined ? (
          <KpiCard compact title="Cost" value={item.costPrice == null ? "—" : formatINR(item.costPrice)} icon={IndianRupee} tone="ok" subtitle={price && item.costPrice ? `Margin about ${formatINR(price.roundedTotal - price.gst - item.costPrice)}` : "Bought for"} />
        ) : (
          <KpiCard compact title="Stone value" value={formatINR(item.stoneValue)} icon={IndianRupee} tone="ok" subtitle="Added to the price" />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid content-start gap-6 lg:col-span-2">
          <Card>
            <CardHeader title={editing ? "Correct details" : "Piece details"} description={editing ? "Every change is written to the history with your name and reason." : "Weights, codes and where it is."} />
            <CardBody className="grid gap-5">
              {editing ? (
                <EditForm
                  item={item}
                  onSaved={() => {
                    setEditing(false);
                    reload();
                  }}
                />
              ) : (
                <>
                  <InfoSection title="Design" icon={Gem} first>
                    <InfoGrid columns={3}>
                      <InfoRow label="Design">{item.design?.name}</InfoRow>
                      <InfoRow label="Code" mono>
                        {item.design?.code}
                      </InfoRow>
                      <InfoRow label="Category">{item.design?.category?.name}</InfoRow>
                    </InfoGrid>
                  </InfoSection>
                  <InfoSection title="Weight and purity" icon={Scale}>
                    <InfoGrid columns={4}>
                      <InfoRow label="Purity">{item.purity}</InfoRow>
                      <InfoRow label="Gross">{formatWeight(item.grossWeight)}</InfoRow>
                      <InfoRow label="Stones">{formatWeight(item.stoneWeight)}</InfoRow>
                      <InfoRow label="Net">{formatWeight(item.netWeight)}</InfoRow>
                    </InfoGrid>
                  </InfoSection>
                  <InfoSection title="Codes" icon={ScanBarcode}>
                    <InfoGrid columns={4}>
                      <InfoRow label="Tag" mono>
                        {item.tagNumber}
                      </InfoRow>
                      <InfoRow label="HUID" mono>
                        {item.huid}
                      </InfoRow>
                      <InfoRow label="RFID" mono>
                        {item.rfid}
                      </InfoRow>
                      <InfoRow label="Old tag" mono>
                        {item.legacyTag}
                      </InfoRow>
                    </InfoGrid>
                  </InfoSection>
                  <InfoSection title="Where it came from" icon={Truck}>
                    <InfoGrid columns={3}>
                      <InfoRow label="Supplier">
                        {item.supplier ? (
                          <Link href={`/suppliers/${item.supplier.id}`} className="text-navy hover:underline">
                            {item.supplier.name}
                          </Link>
                        ) : null}
                      </InfoRow>
                      <InfoRow label="Received">{item.receivedAt && formatDateTime(item.receivedAt)}</InfoRow>
                      <InfoRow label="Branch">{item.branch?.name}</InfoRow>
                    </InfoGrid>
                  </InfoSection>
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="History" description="Every change to this piece, newest first. Entries are never edited." />
            <CardBody>
              <ActivityLog
                formatTime={formatDateTime}
                entries={item.movements.map((movement) => ({
                  at: movement.at,
                  by: movement.by,
                  tone: MOVEMENT_TONES[movement.type] ?? "navy",
                  text: (
                    <>
                      <span className="font-semibold">{MOVEMENT_LABELS[movement.type] ?? movement.type}</span>
                      {describe(movement) && <span className="block text-[12.5px] text-ash">{describe(movement)}</span>}
                      {movement.note && <span className="block text-[12.5px] text-ash">“{movement.note}”</span>}
                    </>
                  ),
                }))}
              />
            </CardBody>
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <PieceGallery item={item} canEdit={canEdit} onSaved={reload} />
          <Card>
            <CardHeader
              title="Price today"
              action={
                <Button size="sm" variant="secondary" onClick={() => setBreakdown(true)}>
                  <Calculator className="size-3.5" aria-hidden />
                  Breakdown
                </Button>
              }
            />
            <CardBody>
              <p className="text-3xl font-bold text-ink tabular-nums">{price ? formatRupees(price.roundedTotal) : "—"}</p>
              <p className="mt-1 text-[13px] text-ash">What the counter and the tablets quote, with GST.</p>
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal open={breakdown} onClose={() => setBreakdown(false)} title="Price at today's rate" description={`${item.tagNumber} · ${item.purity} · ${formatWeight(item.netWeight)} net`}>
        <Price item={item} />
      </Modal>
    </div>
  );
}
