import type { Core } from "@strapi/strapi";
import { errors } from "@strapi/utils";
import { COST_VIEWER_ROLES, type StaffRole } from "./constants";

/** The staff record the is-staff policy puts on ctx.state.staff. */
export type Staff = {
  id: number;
  documentId: string;
  username: string;
  fullName?: string | null;
  staffRole: StaffRole;
  organization: { id: number; documentId: string; slug: string; settings?: Record<string, unknown> | null };
  branches: { id: number; documentId: string; name: string; code: string }[];
};

export function staffName(staff: Staff): string {
  return staff.fullName || staff.username;
}

export function canSeeCost(staff: Staff): boolean {
  return COST_VIEWER_ROLES.includes(staff.staffRole);
}

/** Branch ids this person may work in. The owner works in every branch of the organization. */
export async function branchIdsFor(strapi: Core.Strapi, staff: Staff): Promise<number[]> {
  if (staff.staffRole === "owner") {
    const branches = await strapi.db
      .query("api::branch.branch")
      .findMany({ where: { organization: { id: staff.organization.id } }, select: ["id"] });
    return branches.map((branch: { id: number }) => branch.id);
  }
  return staff.branches.map((branch) => branch.id);
}

/** Loads a branch of the staff member's organization that they may work in, or throws. */
export async function requireBranch(strapi: Core.Strapi, staff: Staff, branchId: unknown) {
  const id = Number(branchId);
  if (!Number.isInteger(id)) throw new errors.ValidationError("Choose a branch.");
  const allowed = await branchIdsFor(strapi, staff);
  if (!allowed.includes(id)) throw new errors.ForbiddenError("You do not work at that branch.");
  const branch = await strapi.db.query("api::branch.branch").findOne({ where: { id } });
  if (!branch) throw new errors.NotFoundError("Branch not found.");
  return branch as { id: number; documentId: string; name: string; code: string };
}

/** The organization's setting, or the fallback. */
export function setting<T>(staff: Staff, key: string, fallback: T): T {
  const value = staff.organization.settings?.[key];
  return value === undefined || value === null || value === "" ? fallback : (value as T);
}

export function tagPrefix(staff: Staff): string {
  return String(setting(staff, "tagPrefix", "MMJ")).toUpperCase();
}
