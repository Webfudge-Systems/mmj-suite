import { num } from "./common";

/** Populate shape that gives every field serializeItem reads. */
export const ITEM_POPULATE = {
  making: true,
  design: { select: ["id", "code", "name"], populate: { category: { select: ["id", "name", "code"] } } },
  branch: { select: ["id", "code", "name"] },
  location: { select: ["id", "code", "fullCode", "name", "kind"] },
  supplier: { select: ["id", "name", "kind"] },
  receipt: { select: ["id", "number"] },
};

export const making = (value: any) => (value ? { type: value.type, value: Number(value.value) } : null);

export function serializeLocationRef(location: any) {
  return location ? { id: location.id, code: location.code, fullCode: location.fullCode, name: location.name ?? null, kind: location.kind } : null;
}

export function serializeItem(item: any, { cost }: { cost: boolean }) {
  return {
    id: item.id,
    tagNumber: item.tagNumber,
    legacyTag: item.legacyTag ?? null,
    huid: item.huid ?? null,
    metal: item.metal,
    purity: item.purity,
    grossWeight: num(item.grossWeight),
    stoneWeight: num(item.stoneWeight) ?? 0,
    netWeight: num(item.netWeight),
    making: making(item.making),
    stoneValue: num(item.stoneValue) ?? 0,
    ...(cost ? { costPrice: num(item.costPrice) } : {}),
    status: item.status,
    slot: item.slot ?? null,
    notes: item.notes ?? null,
    receivedAt: item.receivedAt ?? null,
    design: item.design
      ? {
          id: item.design.id,
          code: item.design.code,
          name: item.design.name,
          category: item.design.category ? { id: item.design.category.id, name: item.design.category.name, code: item.design.category.code } : null,
        }
      : null,
    branch: item.branch ? { id: item.branch.id, code: item.branch.code, name: item.branch.name } : null,
    location: serializeLocationRef(item.location),
    supplier: item.supplier ? { id: item.supplier.id, name: item.supplier.name, kind: item.supplier.kind } : null,
    receipt: item.receipt ? { id: item.receipt.id, number: item.receipt.number } : null,
  };
}

export function serializeDesign(design: any) {
  return {
    id: design.id,
    code: design.code,
    name: design.name,
    metal: design.metal,
    defaultPurity: design.defaultPurity ?? null,
    occasion: design.occasion ?? null,
    description: design.description ?? null,
    making: making(design.making),
    isOnline: !!design.isOnline,
    isActive: design.isActive !== false,
    category: design.category ? { id: design.category.id, name: design.category.name, code: design.category.code } : null,
    collection: design.collection ? { id: design.collection.id, name: design.collection.name } : null,
    images: (design.images ?? []).map((image: any) => ({
      id: image.id,
      url: image.url,
      thumbnailUrl: image.formats?.thumbnail?.url ?? image.url,
      alternativeText: image.alternativeText ?? null,
    })),
  };
}

export const DESIGN_POPULATE = {
  making: true,
  category: { select: ["id", "name", "code"] },
  collection: { select: ["id", "name"] },
  images: true,
};

export function serializeSupplier(supplier: any) {
  return {
    id: supplier.id,
    name: supplier.name,
    kind: supplier.kind,
    phone: supplier.phone ?? null,
    gstin: supplier.gstin ?? null,
    city: supplier.city ?? null,
    notes: supplier.notes ?? null,
    isActive: supplier.isActive !== false,
  };
}

export function serializeMovement(movement: any) {
  return {
    id: movement.id,
    type: movement.type,
    at: movement.createdAt,
    fromStatus: movement.fromStatus ?? null,
    toStatus: movement.toStatus ?? null,
    reference: movement.reference ?? null,
    note: movement.note ?? null,
    changes: movement.changes ?? null,
    fromLocation: serializeLocationRef(movement.fromLocation),
    toLocation: serializeLocationRef(movement.toLocation),
    fromBranch: movement.fromBranch ? { id: movement.fromBranch.id, code: movement.fromBranch.code, name: movement.fromBranch.name } : null,
    toBranch: movement.toBranch ? { id: movement.toBranch.id, code: movement.toBranch.code, name: movement.toBranch.name } : null,
    by: movement.by ? movement.by.fullName || movement.by.username : null,
  };
}

export const MOVEMENT_POPULATE = {
  fromLocation: { select: ["id", "code", "fullCode", "name", "kind"] },
  toLocation: { select: ["id", "code", "fullCode", "name", "kind"] },
  fromBranch: { select: ["id", "code", "name"] },
  toBranch: { select: ["id", "code", "name"] },
  by: { select: ["id", "fullName", "username"] },
};
