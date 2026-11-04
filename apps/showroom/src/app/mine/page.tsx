"use client";

import { useState } from "react";
import { errorMessage, useApi, useResource } from "@webfudge/auth/components";
import { Alert, Badge, Button, EmptyState, Spinner } from "@webfudge/ui";
import type { FloorPiece } from "@webfudge/utils/api";
import { formatRupees, formatWeight } from "@webfudge/utils/formatters";
import { useFloor } from "@/lib/floor";

/** Everything this salesperson has out of the trays, so nothing goes missing at day end. */
export default function MinePage() {
  const api = useApi();
  const { removeFromTray } = useFloor();
  const held = useResource<{ data: FloorPiece[] }>("/floor/held");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  async function putBack(piece: FloorPiece) {
    setBusy(piece.id);
    setError(null);
    try {
      await api.post("/floor/put-back", { itemId: piece.id });
      removeFromTray(piece.id);
      held.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  }

  const pieces = held.data?.data ?? [];

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-3xl font-semibold text-navy">In my hands</h1>
        <p className="text-[15px] text-ash">Pieces you have taken out. Put each one back in its tray when the customer is done.</p>
      </div>
      {error && <Alert tone="risk">{error}</Alert>}
      {held.loading ? (
        <Spinner className="text-navy" />
      ) : !pieces.length ? (
        <EmptyState title="Nothing out" description="Every piece you took out is back in its tray." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {pieces.map((piece) => (
            <li key={piece.id} className="grid gap-3 rounded-[var(--radius-panel)] bg-surface p-4 ring-1 ring-line">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="grid">
                  <span className="font-semibold">{piece.design?.name}</span>
                  <span className="text-[13px] text-ash tabular-nums">
                    <span className="font-mono">{piece.tagNumber}</span> · {piece.purity} · {formatWeight(piece.netWeight)}
                  </span>
                </div>
                {piece.status === "reserved" ? <Badge tone="navy">On an estimate</Badge> : <Badge tone="gold">With you</Badge>}
              </div>
              <div className="rounded-lg bg-sunk px-3 py-2 text-[15px]">
                Goes back to <span className="font-semibold text-navy">{piece.location ? `${piece.location.fullCode}${piece.slot ? ` · slot ${piece.slot}` : ""}` : "the stock keeper (no tray)"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-navy tabular-nums">{piece.pricing ? formatRupees(piece.pricing.price) : ""}</span>
                {piece.status === "with_staff" && (
                  <Button size="lg" variant="secondary" loading={busy === piece.id} onClick={() => putBack(piece)}>
                    Put back in the tray
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
