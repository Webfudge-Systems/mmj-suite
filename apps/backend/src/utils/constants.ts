/**
 * Mirrors packages/config/src/constants. The backend compiles to CommonJS on
 * its own, so it cannot import the TypeScript source of that package. Keep the
 * two lists in step.
 */

export const PURITIES = [
  { code: "24KT", metal: "gold", label: "Gold 24KT" },
  { code: "22KT", metal: "gold", label: "Gold 22KT" },
  { code: "18KT", metal: "gold", label: "Gold 18KT" },
  { code: "14KT", metal: "gold", label: "Gold 14KT" },
  { code: "950PT", metal: "platinum", label: "Platinum 950" },
  { code: "999", metal: "silver", label: "Silver 999" },
  { code: "925", metal: "silver", label: "Silver 925" },
] as const;

export type Purity = (typeof PURITIES)[number]["code"];

export const PURITY_CODES: readonly string[] = PURITIES.map((purity) => purity.code);

/** Higher purities must never be quoted below lower ones. Catches typing slips. */
export const PURITY_ORDER: readonly Purity[][] = [
  ["24KT", "22KT", "18KT", "14KT"],
  ["999", "925"],
];

export const STAFF_ROLES = [
  "owner",
  "branch_manager",
  "cashier",
  "salesperson",
  "stock_keeper",
  "karigar_manager",
  "accountant",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const RATE_EDITOR_ROLES: StaffRole[] = ["owner", "branch_manager"];

export const LARGE_RATE_CHANGE_PERCENT = 3;

/** No rate card line may exceed this, in rupees per gram. */
export const MAX_RATE_PER_GRAM = 1_000_000;

export function defaultOrganizationSlug(): string {
  return process.env.DEFAULT_ORGANIZATION || "mmj";
}

export const METAL_LETTERS = { gold: "G", silver: "S", platinum: "P" } as const;
export type Metal = keyof typeof METAL_LETTERS;

/** Who may receive, tag, move, transfer and audit stock. */
export const STOCK_EDITOR_ROLES: StaffRole[] = ["owner", "branch_manager", "stock_keeper"];

/** Who may see what a piece cost. Salespeople and cashiers never do. */
export const COST_VIEWER_ROLES: StaffRole[] = ["owner", "branch_manager", "stock_keeper", "accountant"];

/** Who may add and edit designs, categories and suppliers. */
export const CATALOGUE_EDITOR_ROLES: StaffRole[] = ["owner", "branch_manager", "stock_keeper"];

export const ITEM_STATUSES = [
  "in_stock",
  "with_staff",
  "reserved",
  "sold",
  "on_approval",
  "at_karigar",
  "in_transit",
  "melted",
] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const LOCATION_KINDS = ["showcase", "counter", "tray", "safe", "back_office"] as const;
export type LocationKind = (typeof LOCATION_KINDS)[number];

/** Locations that hold pieces directly. Showcases and counters hold trays. */
export const HOLDING_KINDS: readonly LocationKind[] = ["tray", "safe", "back_office"];

export const MAKING_TYPES = ["per_gram", "percent", "fixed"] as const;

/** Categories created for a new organization. The code goes into design numbers. */
export const DEFAULT_CATEGORIES = [
  { name: "Rings", slug: "rings", code: "RG" },
  { name: "Earrings", slug: "earrings", code: "ER" },
  { name: "Necklaces", slug: "necklaces", code: "NK" },
  { name: "Bangles", slug: "bangles", code: "BG" },
  { name: "Mangalsutra", slug: "mangalsutra", code: "MS" },
  { name: "Chains", slug: "chains", code: "CH" },
  { name: "Pendants", slug: "pendants", code: "PD" },
  { name: "Bracelets", slug: "bracelets", code: "BR" },
  { name: "Nose pins", slug: "nosepins", code: "NP" },
  { name: "Anklets", slug: "anklets", code: "AK" },
  { name: "Coins", slug: "coins", code: "CN" },
];
