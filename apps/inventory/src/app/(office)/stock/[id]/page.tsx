"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@webfudge/auth/components";
import { HALLMARK_CHARGE_PER_PIECE, PURITIES } from "@webfudge/config";
import { useCurrentRates } from "@webfudge/hooks";
import { Alert, Button, Card, CardBody, CardHeader, Field, Input, PageHeader, Select, Spinner, StatusBadge, buttonClass } from "@webfudge/ui";
import type { MakingCharge, Movement, StockItem } from "@webfudge/utils/api";
import { formatDateTime, formatINR, formatRupees, formatWeight } from "@webfudge/utils/formatters";
import { calculatePrice, rateFor } from "@webfudge/utils/pricing";
import { MakingInput } from "@/components/pickers";
import { errorMessage, useApi, useResource } from "@/lib/api";
import { API_URL } from "@/lib/env";

type Detail = StockItem & { movements: Movement[] };

const MOVEMENT_LABELS: Record<Movement["type"], string> = {
  received: "Received",
  imported: "Imported as opening stock",
  moved: "Moved",
  edited: "Details corrected",
  dispatched: "Sent to another branch",
  arrived: "Arrived from another branch",
  audited: "Counted",
};

function describe(movement: Movement): string {
  const parts: string[] = [];
  if (movement.fromLocation || movement.toLocation) {
    parts.push(`${movement.fromLocation?.fullCode ?? "no tray"} → ${movement.toLocation?.fullCode ?? "no tray"}`);
  }
  if (movement.fromBranch && movement.toBranch && movement.fromBranch.id !== movement.toBranch.id) {
    parts.push(`${movement.fromBranch.name} → ${movement.toBranch.name}`);
  }
  if (movement.changes) {
    parts.push(
      Object.entries(movement.changes)
        .map(([field, [before, after]]) => `${field}: ${typeof before === "object" ? JSON.stringify(before) : before ?? "—"} → ${typeof after === "object" ? JSON.stringify(after) : after ?? "—"}`)
        .join(", "),
    );
  }
  if (movement.reference) parts.push(movement.reference);
  return parts.join(" · ");
}

function Price({ item }: { item: StockItem }) {
  const { card } = useCurrentRates(API_URL);
  const rate = card ? rateFor(card.rates, item.purity) : undefined;
  if (!rate || !item.making) return <p className="text-[13px] text-ash">No rate published for {item.purity} yet.</p>;
  const price = calculatePrice({
    netWeight: item.netWeight,
    ratePerGram: rate,
    making: item.making.type === "percent" ? { type: "percent", percent: item.making.value } : { type: item.making.type, amount: item.making.value },
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
        <div key={label} className="flex justify-between gap-4 border-b border-dashed border-line py-1 tabular-nums">
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
        <Input id="edit-huid" value={huid} maxLength={6} onChange={(event) => setHuid(event.target.value)} className="font-mono uppercase" />
      </Field>
      <Field label="Gross weight (g)" htmlFor="edit-gross">
        <Input id="edit-gross" inputMode="decimal" value={gross} onChange={(event) => setGross(event.target.value)} className="tabular-nums" />
      </Field>
      <Field label="Stone weight (g)" htmlFor="edit-stone">
        <Input id="edit-stone" inputMode="decimal" value={stone} onChange={(event) => setStone(event.target.value)} className="tabular-nums" />
      </Field>
      <Field label="Making charge" htmlFor="edit-making">
        <MakingInput id="edit-making" value={making} onChange={setMaking} />
      </Field>
      <Field label="Stone value (₹)" htmlFor="edit-stone-value">
        <Input id="edit-stone-value" inputMode="decimal" value={stoneValue} onChange={(event) => setStoneValue(event.target.value)} className="tabular-nums" />
      </Field>
      {canCost && (
        <Field label="Cost (₹)" htmlFor="edit-cost" hint="Never shown to salespeople or cashiers.">
          <Input id="edit-cost" inputMode="decimal" value={cost} onChange={(event) => setCost(event.target.value)} className="tabular-nums" />
        </Field>
      )}
      <Field label="Old tag number" htmlFor="edit-legacy">
        <Input id="edit-legacy" value={legacyTag} onChange={(event) => setLegacyTag(event.target.value)} className="font-mono uppercase" />
      </Field>
      <Field label="Reason for the change" htmlFor="edit-reason" hint="Saved in the piece's history." className="sm:col-span-2">
        <Input id="edit-reason" value={reason} onChange={(event) => setReason(event.target.value)} />
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

export default function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasRole } = useAuth();
  const canEdit = hasRole("owner", "branch_manager", "stock_keeper");
  const { data, error, loading, reload } = useResource<{ data: Detail }>(`/stock/items/${id}`);
  const [editing, setEditing] = useState(false);
  const item = data?.data;

  if (loading) return <Spinner className="text-navy" />;
  if (error || !item) return <p className="text-sm text-risk">{error ?? "Piece not found."}</p>;

  const facts: [string, string][] = [
    ["Design", `${item.design?.name ?? "—"} (${item.design?.code ?? "—"})`],
    ["Category", item.design?.category?.name ?? "—"],
    ["Purity", item.purity],
    ["Gross weight", formatWeight(item.grossWeight)],
    ["Stone weight", formatWeight(item.stoneWeight)],
    ["Net weight", formatWeight(item.netWeight)],
    ["HUID", item.huid ?? "—"],
    ["Making", item.making ? (item.making.type === "percent" ? `${item.making.value}% of metal` : `${formatINR(item.making.value)}${item.making.type === "per_gram" ? " per gram" : " fixed"}`) : "—"],
    ["Stone value", formatINR(item.stoneValue)],
    ...(item.costPrice !== undefined ? ([["Cost", item.costPrice == null ? "—" : formatINR(item.costPrice)]] as [string, string][]) : []),
    ["Branch", item.branch?.name ?? "—"],
    ["Location", item.location ? `${item.location.fullCode}${item.slot ? ` · slot ${item.slot}` : ""}` : "Needs a tray"],
    ["Supplier", item.supplier?.name ?? "—"],
    ["Received", item.receivedAt ? formatDateTime(item.receivedAt) : "—"],
    ["Old tag", item.legacyTag ?? "—"],
  ];

  return (
    <div className="grid gap-6">
      <Link href="/stock" className="text-[13px] text-ash hover:text-navy">
        ← Stock
      </Link>
      <PageHeader
        title={<span className="font-mono">{item.tagNumber}</span>}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={item.status} /> {item.design?.name}
          </span>
        }
        actions={
          <>
            <Link href={`/tags?ids=${item.id}`} className={buttonClass("secondary")}>
              Print tag
            </Link>
            {canEdit && !editing && !["sold", "melted", "in_transit"].includes(item.status) && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Correct details
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={editing ? "Correct details" : "Details"} />
          <CardBody>
            {editing ? (
              <EditForm
                item={item}
                onSaved={() => {
                  setEditing(false);
                  reload();
                }}
              />
            ) : (
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                {facts.map(([label, value]) => (
                  <div key={label} className="grid">
                    <dt className="text-[11px] tracking-wide text-ash uppercase">{label}</dt>
                    <dd className="font-medium tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Price at today's rate" description="What the counter and the tablets will quote." />
          <CardBody>
            <Price item={item} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="History" description="Every change to this piece, newest first. Entries are never edited." />
        <ul className="divide-y divide-line">
          {item.movements.map((movement) => (
            <li key={movement.id} className="grid gap-0.5 px-5 py-3 text-[13.5px] sm:grid-cols-[180px_1fr]">
              <span className="text-ash tabular-nums">{formatDateTime(movement.at)}</span>
              <span>
                <span className="font-semibold">{MOVEMENT_LABELS[movement.type]}</span>
                {movement.by ? ` by ${movement.by}` : ""}
                {describe(movement) && <span className="block text-[12.5px] text-ash">{describe(movement)}</span>}
                {movement.note && <span className="block text-[12.5px] text-ash">“{movement.note}”</span>}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
