import { errors } from "@strapi/utils";
import { HOLDING_KINDS, PURITY_CODES } from "../../../utils/constants";
import { reserveSequence } from "../../../utils/sequence";
import { formatTagNumber, metalForPurity, netWeight, normaliseCode, normaliseHuid, StockRuleError, toNumber } from "../../../utils/stock";
import { tagPrefix, type Staff } from "../../../utils/staff";
import { parseMaking } from "../controllers/catalogue";
import { DESIGN, ITEM, LOCATION, MOVEMENT, codeWhere, orgWhere, text } from "./common";

export type MovementInput = {
  type: "received" | "imported" | "moved" | "edited" | "dispatched" | "arrived" | "audited";
  item: number;
  fromStatus?: string | null;
  toStatus?: string | null;
  fromLocation?: number | null;
  toLocation?: number | null;
  fromBranch?: number | null;
  toBranch?: number | null;
  reference?: string | null;
  note?: string | null;
  changes?: Record<string, unknown> | null;
};

/** Appends one row to the stock ledger. */
export async function recordMovement(strapi: any, staff: Staff, movement: MovementInput) {
  await strapi.db.query(MOVEMENT).create({
    data: { ...movement, by: staff.id, organization: staff.organization.id },
  });
}

/** A location in the branch that can hold pieces directly (a tray, safe or back office). */
export async function holdingLocation(strapi: any, staff: Staff, locationId: number, branchId: number) {
  const location = await strapi.db.query(LOCATION).findOne({
    where: { id: locationId, ...orgWhere(staff) },
    populate: { branch: { select: ["id", "code"] } },
  });
  if (!location) throw new errors.ValidationError("That location does not exist.");
  if (location.branch?.id !== branchId) throw new errors.ValidationError(`${location.fullCode} is in another branch.`);
  if (!HOLDING_KINDS.includes(location.kind)) {
    throw new errors.ValidationError(`${location.fullCode} is a ${location.kind}. Put pieces in one of its trays.`);
  }
  if (location.isActive === false) throw new errors.ValidationError(`${location.fullCode} is no longer in use.`);
  return location as { id: number; documentId: string; fullCode: string; kind: string };
}

/** Finds a piece of this organization by tag number, old tag or HUID. */
export async function findByCode(strapi: any, staff: Staff, code: string, populate: any = { branch: true, location: true }) {
  if (!code || !code.trim()) return null;
  return strapi.db.query(ITEM).findOne({ where: { ...codeWhere(code), ...orgWhere(staff) }, populate });
}

export type PieceInput = {
  designId: number;
  purity: string;
  grossWeight: number;
  stoneWeight: number;
  huid: string | null;
  making?: { type: string; value: number };
  stoneValue: number;
  costPrice: number | null;
  locationId: number | null;
  slot: string | null;
  legacyTag: string | null;
  notes: string | null;
};

/** Checks one line of a receipt or import. Throws StockRuleError or ValidationError with a readable message. */
export function parsePiece(raw: any): PieceInput {
  const purity = String(raw?.purity ?? "").toUpperCase();
  if (!PURITY_CODES.includes(purity)) throw new StockRuleError(`${raw?.purity || "Purity"} is not a purity the suite knows.`);
  const grossWeight = toNumber(raw?.grossWeight, NaN);
  const stoneWeight = toNumber(raw?.stoneWeight, 0);
  netWeight(grossWeight, stoneWeight);
  const stoneValue = toNumber(raw?.stoneValue, 0);
  if (stoneValue < 0) throw new StockRuleError("Stone value cannot be negative.");
  const costPrice = raw?.costPrice === undefined || raw?.costPrice === null || raw?.costPrice === "" ? null : toNumber(raw.costPrice, NaN);
  if (costPrice !== null && (!Number.isFinite(costPrice) || costPrice < 0)) throw new StockRuleError("Cost cannot be negative.");
  const designId = Number(raw?.designId);
  if (!Number.isInteger(designId) || designId <= 0) throw new StockRuleError("Choose a design.");
  const slot = text(raw?.slot, 8);

  return {
    designId,
    purity,
    grossWeight,
    stoneWeight,
    huid: normaliseHuid(raw?.huid),
    making: raw?.making ? parseMaking(raw.making, false) : undefined,
    stoneValue,
    costPrice,
    locationId: raw?.locationId ? Number(raw.locationId) : null,
    slot: slot ? normaliseCode(slot) : null,
    legacyTag: text(raw?.legacyTag, 64) ? normaliseCode(raw.legacyTag) : null,
    notes: text(raw?.notes, 1000),
  };
}

/** Rejects HUIDs and old tags already used by another piece, and repeats within the batch. */
export async function assertUniqueCodes(strapi: any, staff: Staff, pieces: PieceInput[]) {
  for (const field of ["huid", "legacyTag"] as const) {
    const values = pieces.map((piece) => piece[field]).filter((value): value is string => !!value);
    const label = field === "huid" ? "HUID" : "Old tag";
    const repeated = values.find((value, index) => values.indexOf(value) !== index);
    if (repeated) throw new errors.ValidationError(`${label} ${repeated} appears twice in this list.`);
    if (!values.length) continue;
    const taken = await strapi.db.query(ITEM).findOne({
      where: { [field]: { $in: values }, status: { $ne: "melted" }, ...orgWhere(staff) },
      select: ["tagNumber", field],
    });
    if (taken) throw new errors.ValidationError(`${label} ${taken[field]} is already on piece ${taken.tagNumber}.`);
  }
}

type CreateOptions = {
  branch: { id: number; documentId: string };
  receipt: { id: number; documentId: string; number: string };
  supplier: { documentId: string } | null;
  movementType: "received" | "imported";
};

/**
 * Creates tagged pieces and their ledger rows. Must run inside a transaction:
 * tag numbers, pieces and movements are saved together or not at all.
 */
export async function createPieces(strapi: any, staff: Staff, pieces: PieceInput[], options: CreateOptions) {
  const designs = new Map<number, any>();
  for (const id of new Set(pieces.map((piece) => piece.designId))) {
    const design = await strapi.db.query(DESIGN).findOne({ where: { id, ...orgWhere(staff) }, populate: { making: true } });
    if (!design) throw new errors.ValidationError("A chosen design does not exist.");
    designs.set(id, design);
  }

  const locations = new Map<number, any>();
  for (const id of new Set(pieces.map((piece) => piece.locationId).filter((id): id is number => !!id))) {
    locations.set(id, await holdingLocation(strapi, staff, id, options.branch.id));
  }

  const prefix = tagPrefix(staff);
  const now = new Date().toISOString();
  const created: { id: number; tagNumber: string }[] = [];

  for (const [index, piece] of pieces.entries()) {
    const design = designs.get(piece.designId);
    const metal = metalForPurity(piece.purity);
    if (metal !== design.metal) {
      throw new errors.ValidationError(`Line ${index + 1}: ${piece.purity} is not ${design.metal}, but ${design.code} is a ${design.metal} design.`);
    }
    const making = piece.making ?? (design.making ? { type: design.making.type, value: Number(design.making.value) } : null);
    if (!making) throw new errors.ValidationError(`Line ${index + 1}: enter a making charge, or set one on design ${design.code}.`);

    const tagNumber = formatTagNumber(prefix, metal, await reserveSequence(strapi, `tag:${staff.organization.id}:${metal}`));
    const location = piece.locationId ? locations.get(piece.locationId) : null;

    const item = await strapi.documents(ITEM).create({
      data: {
        tagNumber,
        legacyTag: piece.legacyTag,
        huid: piece.huid,
        metal,
        purity: piece.purity,
        grossWeight: piece.grossWeight,
        stoneWeight: piece.stoneWeight,
        netWeight: netWeight(piece.grossWeight, piece.stoneWeight),
        making,
        stoneValue: piece.stoneValue,
        costPrice: piece.costPrice,
        status: "in_stock",
        slot: location ? piece.slot : null,
        notes: piece.notes,
        receivedAt: now,
        design: design.documentId,
        branch: options.branch.documentId,
        location: location?.documentId ?? null,
        supplier: options.supplier?.documentId ?? null,
        receipt: options.receipt.documentId,
        organization: staff.organization.documentId,
      },
    });

    await recordMovement(strapi, staff, {
      type: options.movementType,
      item: item.id,
      toStatus: "in_stock",
      toLocation: location?.id ?? null,
      toBranch: options.branch.id,
      reference: options.receipt.number,
    });

    created.push({ id: item.id, tagNumber });
  }

  return created;
}
