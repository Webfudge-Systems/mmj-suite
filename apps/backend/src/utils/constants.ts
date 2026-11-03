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
