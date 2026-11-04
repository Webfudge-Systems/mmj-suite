"use client";

import { use, useState } from "react";
import Link from "next/link";
import { errorMessage, useApi, useAuth, useResource } from "@webfudge/auth/components";
import { Alert, Badge, Button, Spinner, cn } from "@webfudge/ui";
import type { Design, FloorPiece } from "@webfudge/utils/api";
import { formatINR, formatRupees, formatWeight } from "@webfudge/utils/formatters";
import { mediaUrl } from "@/lib/device";
import { useFloor } from "@/lib/floor";

type Detail = Design & {
  pieces: FloorPiece[];
  otherBranches: { branch: { id: number; name: string; code: string }; pieces: number }[];
  rateCard: { id: number; effectiveFrom: string } | null;
};

/** Showcase › Tray › Slot, in the words the floor uses. */
function Where({ piece }: { piece: FloorPiece }) {
  if (!piece.location) return <span className="text-warn">Not in a tray yet. Ask the stock keeper.</span>;
  const parts = [piece.location.parent && `Showcase ${piece.location.parent}`, `Tray ${piece.location.code}`, piece.slot && `Slot ${piece.slot}`].filter(Boolean);
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      {parts.map((part, index) => (
        <span key={index} className="flex items-baseline gap-2">
          {index > 0 && <span className="text-taupe">›</span>}
          <span className="font-semibold text-navy">{part}</span>
        </span>
      ))}
      {piece.location.name && <span className="text-ash">({piece.location.name})</span>}
    </span>
  );
}

function PieceCard({ piece, design, onChanged }: { piece: FloorPiece; design: Detail; onChanged: () => void }) {
  const api = useApi();
  const { staff } = useAuth();
  const { tray, addToTray, removeFromTray } = useFloor();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const mine = piece.status === "with_staff" && piece.heldBy?.id === staff?.id;
  const inTray = tray.some((entry) => entry.id === piece.id);
  const trayPiece = { ...piece, design: { id: design.id, code: design.code, name: design.name, image: design.images[0]?.url ?? null } };

  async function act(path: "/floor/pick" | "/floor/put-back", then?: () => void) {
    setBusy(true);
    setError(null);
    try {
      await api.post(path, { itemId: piece.id });
      then?.();
      onChanged();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className={cn("grid gap-3 rounded-[var(--radius-panel)] bg-surface p-4 ring-1", inTray ? "ring-2 ring-gold" : "ring-line")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <span className="text-2xl font-semibold text-navy tabular-nums">{piece.pricing ? formatRupees(piece.pricing.price) : "Ask at the counter"}</span>
          <span className="text-[14px] text-ash tabular-nums">
            {piece.purity} · {formatWeight(piece.grossWeight)} gross · {formatWeight(piece.netWeight)} net
            {piece.huid ? ` · HUID ${piece.huid}` : ""}
          </span>
        </div>
        {piece.status === "in_stock" ? (
          piece.location ? <Badge tone="ok">In the tray</Badge> : <Badge tone="warn">In stock, no tray</Badge>
        ) : piece.status === "reserved" ? (
          <Badge tone="navy">On an estimate</Badge>
        ) : mine ? (
          <Badge tone="gold">In your hands</Badge>
        ) : (
          <Badge tone="warn">With {piece.heldBy?.name ?? "someone"}</Badge>
        )}
      </div>

      <div className="rounded-lg bg-sunk px-3 py-2.5 text-[15px]">
        <Where piece={piece} />
        <span className="mt-0.5 block font-mono text-[12px] text-ash">{piece.tagNumber}</span>
      </div>

      {open && piece.pricing && (
        <dl className="grid gap-1 text-[13.5px] tabular-nums">
          {[
            [`Metal · ${formatINR(piece.pricing.ratePerGram)} × ${formatWeight(piece.netWeight)}`, piece.pricing.metalValue],
            ["Making", piece.pricing.makingCharge],
            ["Stones", piece.pricing.stoneValue],
            ["Hallmark", piece.pricing.otherCharges],
            ["GST 3%", piece.pricing.gst],
          ].map(([label, value]) => (
            <div key={label as string} className="flex justify-between gap-3 border-b border-dashed border-line py-1">
              <dt className="text-ash">{label}</dt>
              <dd>{formatINR(value as number)}</dd>
            </div>
          ))}
        </dl>
      )}

      {error && <Alert tone="risk">{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        {piece.status === "in_stock" && (
          <Button size="lg" loading={busy} onClick={() => act("/floor/pick", () => addToTray(trayPiece))}>
            Take out for the customer
          </Button>
        )}
        {mine && !inTray && (
          <Button size="lg" variant="gold" onClick={() => addToTray(trayPiece)}>
            Add to the customer&apos;s tray
          </Button>
        )}
        {mine && inTray && (
          <Button size="lg" variant="secondary" onClick={() => removeFromTray(piece.id)}>
            Take off the tray
          </Button>
        )}
        {mine && (
          <Button size="lg" variant="ghost" loading={busy} onClick={() => act("/floor/put-back", () => removeFromTray(piece.id))}>
            Put back in the tray
          </Button>
        )}
        {piece.pricing && (
          <Button size="lg" variant="ghost" onClick={() => setOpen((value) => !value)}>
            {open ? "Hide price details" : "How the price is made"}
          </Button>
        )}
      </div>
    </li>
  );
}

export default function DesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { branchId } = useFloor();
  const { data, error, loading, reload } = useResource<{ data: Detail }>(`/floor/designs/${id}?branchId=${branchId}`);
  const [photo, setPhoto] = useState(0);
  const design = data?.data;

  if (loading) {
    return (
      <div className="grid place-items-center py-20 text-navy">
        <Spinner />
      </div>
    );
  }
  if (error || !design) return <Alert tone="risk">{error ?? "This design could not be found."}</Alert>;

  const image = design.images[photo] ?? design.images[0];

  return (
    <div className="grid gap-6">
      <Link href="/" className="text-[14px] font-semibold text-navy">
        ← Back to the collection
      </Link>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="grid content-start gap-3 lg:sticky lg:top-36">
          <div className="grid aspect-square place-items-center overflow-hidden rounded-[var(--radius-panel)] bg-[radial-gradient(circle_at_50%_40%,var(--color-surface),var(--color-sunk))] ring-1 ring-line">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(image.url)} alt={design.name} className="size-full object-contain" />
            ) : (
              <span className="font-mono tracking-widest text-taupe">{design.code}</span>
            )}
          </div>
          {design.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {design.images.map((entry, index) => (
                <button key={entry.id} type="button" onClick={() => setPhoto(index)} className={cn("size-20 shrink-0 overflow-hidden rounded-lg ring-2", index === photo ? "ring-gold" : "ring-transparent")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaUrl(entry.thumbnailUrl)} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid content-start gap-5">
          <div className="grid gap-1">
            <span className="text-[13px] font-semibold tracking-wide text-gold-deep uppercase">{design.category?.name}</span>
            <h1 className="text-3xl font-semibold text-balance text-navy">{design.name}</h1>
            <span className="font-mono text-[13px] text-ash">{design.code}</span>
            {design.description && <p className="mt-2 max-w-prose text-[15px] text-ink/80">{design.description}</p>}
          </div>

          <div className="grid gap-3">
            <h2 className="text-lg font-semibold">
              {design.pieces.length ? `${design.pieces.length} ${design.pieces.length === 1 ? "piece" : "pieces"} here` : "No pieces at this branch"}
            </h2>
            <ul className="grid gap-3">
              {design.pieces.map((piece) => (
                <PieceCard key={piece.id} piece={piece} design={design} onChanged={reload} />
              ))}
            </ul>
            {design.otherBranches.length > 0 && (
              <Alert tone="warn" title="Also at other branches">
                {design.otherBranches.map((entry) => `${entry.branch.name}: ${entry.pieces}`).join(" · ")}. Ask the counter to bring one over for the customer.
              </Alert>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
