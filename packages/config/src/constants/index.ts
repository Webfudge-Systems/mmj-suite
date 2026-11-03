export type Metal = "gold" | "silver" | "platinum";

/** Karat for gold, millesimal fineness for platinum and silver. */
export type Purity = "24KT" | "22KT" | "18KT" | "14KT" | "950PT" | "999" | "925";

export type PurityInfo = {
  code: Purity;
  metal: Metal;
  label: string;
  /** Parts per thousand of pure metal, as stamped in the hallmark. */
  fineness: number;
};

/** Every purity the suite can quote a rate for, in counter order. */
export const PURITIES: readonly PurityInfo[] = [
  { code: "24KT", metal: "gold", label: "Gold 24KT", fineness: 999 },
  { code: "22KT", metal: "gold", label: "Gold 22KT", fineness: 916 },
  { code: "18KT", metal: "gold", label: "Gold 18KT", fineness: 750 },
  { code: "14KT", metal: "gold", label: "Gold 14KT", fineness: 585 },
  { code: "950PT", metal: "platinum", label: "Platinum 950", fineness: 950 },
  { code: "999", metal: "silver", label: "Silver 999", fineness: 999 },
  { code: "925", metal: "silver", label: "Silver 925", fineness: 925 },
];

export const PURITY_CODES = PURITIES.map((purity) => purity.code);

export function purityInfo(code: Purity): PurityInfo {
  const info = PURITIES.find((purity) => purity.code === code);
  if (!info) throw new Error(`Unknown purity ${code}`);
  return info;
}

export type StaffRole =
  | "owner"
  | "branch_manager"
  | "cashier"
  | "salesperson"
  | "stock_keeper"
  | "karigar_manager"
  | "accountant";

export const STAFF_ROLES: Record<StaffRole, { label: string }> = {
  owner: { label: "Owner" },
  branch_manager: { label: "Branch manager" },
  cashier: { label: "Cashier" },
  salesperson: { label: "Salesperson" },
  stock_keeper: { label: "Stock keeper" },
  karigar_manager: { label: "Karigar manager" },
  accountant: { label: "Accountant" },
};

export const STAFF_ROLE_CODES = Object.keys(STAFF_ROLES) as StaffRole[];

/** Who may publish the morning rate. */
export const RATE_EDITOR_ROLES: readonly StaffRole[] = ["owner", "branch_manager"];

/** A move bigger than this, in either direction, needs the owner to confirm it. */
export const LARGE_RATE_CHANGE_PERCENT = 3;

/** Jewellery billed as one composite supply. Confirm with the CA before changing. */
export const GST_RATE_JEWELLERY = 0.03;

/** BIS hallmarking charge per piece, in rupees. */
export const HALLMARK_CHARGE_PER_PIECE = 45;

export const APP_PORTS = {
  landing: 3000,
  inventory: 3001,
  pos: 3002,
  crm: 3003,
  showroom: 3004,
  backend: 1337,
} as const;
