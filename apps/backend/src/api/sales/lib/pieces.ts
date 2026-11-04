import type { Staff } from "../../../utils/staff";
import { recordMovement, type MovementInput } from "../../stock/lib/items";

const ITEM = "api::item.item";

type Change = {
  status: string;
  type: MovementInput["type"];
  heldBy?: number | null;
  reference?: string | null;
  note?: string | null;
  /** Clears the tray, for pieces that leave the showroom (sold) or come back without one (returns). */
  clearLocation?: boolean;
};

/** Changes a piece's status and writes the ledger row in the same step. Call inside a transaction. */
export async function changePiece(strapi: any, staff: Staff, item: any, change: Change) {
  const data: Record<string, unknown> = { status: change.status };
  if (change.heldBy !== undefined) {
    data.heldBy = change.heldBy;
    data.heldSince = change.heldBy ? new Date().toISOString() : null;
  }
  if (change.clearLocation) {
    data.location = null;
    data.slot = null;
  }
  await strapi.db.query(ITEM).update({ where: { id: item.id }, data });
  await recordMovement(strapi, staff, {
    type: change.type,
    item: item.id,
    fromStatus: item.status,
    toStatus: change.status,
    fromLocation: change.clearLocation ? (item.location?.id ?? null) : null,
    reference: change.reference ?? null,
    note: change.note ?? null,
  });
}
