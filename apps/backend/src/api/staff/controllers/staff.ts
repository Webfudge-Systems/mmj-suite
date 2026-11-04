import { errors } from "@strapi/utils";
import { hashPin, weakPin } from "../../../utils/secrets";

const branchRef = (branch: any) => ({ id: branch.id, name: branch.name, code: branch.code, city: branch.city ?? null });

/** Branches of the organization. The owner works in all of them; everyone else in their own. */
async function organizationBranches(strapi: any, organizationId: number) {
  return strapi.db.query("api::branch.branch").findMany({
    where: { organization: { id: organizationId }, isActive: { $ne: false } },
    orderBy: { code: "asc" },
  });
}

export default ({ strapi }: { strapi: any }) => {
  const controller = {
  async me(ctx: any) {
    const staff = ctx.state.staff;
    const branches =
      staff.staffRole === "owner" ? await organizationBranches(strapi, staff.organization.id) : staff.branches ?? [];
    ctx.body = {
      data: {
        id: staff.id,
        username: staff.username,
        email: staff.email,
        fullName: staff.fullName ?? null,
        staffRole: staff.staffRole,
        organization: {
          id: staff.organization.id,
          name: staff.organization.name,
          slug: staff.organization.slug,
        },
        branches: branches.map(branchRef),
      },
    };
  },

  /** Every branch of the organization, for choosing where to send a transfer. */
  async branches(ctx: any) {
    const staff = ctx.state.staff;
    ctx.body = { data: (await organizationBranches(strapi, staff.organization.id)).map(branchRef) };
  },

  /** Adds or renames a branch. Owner only (enforced by the route policy). */
  async saveBranch(ctx: any) {
    const staff = ctx.state.staff;
    const body = ctx.request.body ?? {};
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!name) throw new errors.ValidationError("Enter the branch name.");
    if (!/^[A-Z0-9]{1,6}$/.test(code)) throw new errors.ValidationError("The code must be 1 to 6 letters or digits, like B2.");

    const id = Number(ctx.params.id) || null;
    const where = { organization: { id: staff.organization.id } };
    const clash = await strapi.db.query("api::branch.branch").findOne({ where: { ...where, code, ...(id ? { id: { $ne: id } } : {}) } });
    if (clash) throw new errors.ValidationError(`${clash.name} already uses the code ${code}.`);

    const data = {
      name,
      code,
      city: typeof body.city === "string" ? body.city.trim().slice(0, 60) || null : null,
      address: typeof body.address === "string" ? body.address.trim().slice(0, 500) || null : null,
      phone: typeof body.phone === "string" ? body.phone.trim().slice(0, 20) || null : null,
      isActive: true,
    };

    if (id) {
      const existing = await strapi.db.query("api::branch.branch").findOne({ where: { ...where, id } });
      if (!existing) throw new errors.NotFoundError("Branch not found.");
      if (existing.code !== code) {
        const locations = await strapi.db.query("api::location.location").count({ where: { branch: { id } } });
        if (locations) throw new errors.ValidationError("This branch already has locations, so its code is printed on tray labels. Keep the code.");
      }
      await strapi.documents("api::branch.branch").update({ documentId: existing.documentId, data });
    } else {
      await strapi.documents("api::branch.branch").create({ data: { ...data, organization: staff.organization.documentId } });
    }

    ctx.status = id ? 200 : 201;
    ctx.body = { data: (await organizationBranches(strapi, staff.organization.id)).map(branchRef) };
  },

  /** The legal details printed on invoices. */
  async organization(ctx: any) {
    const staff = ctx.state.staff;
    const org = await strapi.db.query("api::organization.organization").findOne({ where: { id: staff.organization.id } });
    const branches = await organizationBranches(strapi, staff.organization.id);
    ctx.body = {
      data: {
        name: org.name,
        legalName: org.legalName ?? null,
        gstin: org.gstin ?? null,
        phone: org.phone ?? null,
        email: org.email ?? null,
        branches: branches.map((branch: any) => ({ ...branchRef(branch), address: branch.address ?? null, phone: branch.phone ?? null, gstin: branch.gstin ?? null })),
      },
    };
  },

  async saveOrganization(ctx: any) {
    const staff = ctx.state.staff;
    const body = ctx.request.body ?? {};
    const text = (value: unknown, max: number) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null);
    const gstin = text(body.gstin, 15)?.toUpperCase() ?? null;
    if (gstin && !/^[0-9]{2}[A-Z0-9]{13}$/.test(gstin)) throw new errors.ValidationError("A GSTIN is 15 characters and starts with the state code.");
    const org = await strapi.db.query("api::organization.organization").findOne({ where: { id: staff.organization.id } });
    await strapi.documents("api::organization.organization").update({
      documentId: org.documentId,
      data: { legalName: text(body.legalName, 120), gstin, phone: text(body.phone, 20), email: text(body.email, 120) },
    });
    for (const entry of Array.isArray(body.branches) ? body.branches : []) {
      const branch = await strapi.db.query("api::branch.branch").findOne({ where: { id: Number(entry.id), organization: { id: staff.organization.id } } });
      if (!branch) continue;
      const branchGstin = text(entry.gstin, 15)?.toUpperCase() ?? null;
      if (branchGstin && !/^[0-9]{2}[A-Z0-9]{13}$/.test(branchGstin)) throw new errors.ValidationError(`${branch.name}: a GSTIN is 15 characters.`);
      await strapi.documents("api::branch.branch").update({
        documentId: branch.documentId,
        data: { address: text(entry.address, 500), phone: text(entry.phone, 20), gstin: branchGstin },
      });
    }
    return controller.organization(ctx);
  },

  /** Staff of the organization, for managing tablet PINs. */
  async team(ctx: any) {
    const staff = ctx.state.staff;
    const people = await strapi.db.query("plugin::users-permissions.user").findMany({
      where: { organization: { id: staff.organization.id }, staffRole: { $notNull: true } },
      populate: { branches: true },
      orderBy: { fullName: "asc" },
    });
    ctx.body = {
      data: people.map((person: any) => ({
        id: person.id,
        name: person.fullName || person.username,
        email: person.email,
        staffRole: person.staffRole,
        blocked: !!person.blocked,
        hasPin: !!person.pinHash,
        branches: (person.branches ?? []).map(branchRef),
      })),
    };
  },

  /** Sets a staff member's tablet PIN. Managers set it for others; anyone may set their own. */
  async setPin(ctx: any) {
    const staff = ctx.state.staff;
    const targetId = Number(ctx.params.id);
    const self = targetId === staff.id;
    if (!self && !["owner", "branch_manager"].includes(staff.staffRole)) throw new errors.ForbiddenError("Only the owner or a branch manager can set someone else's PIN.");
    const target = await strapi.db.query("plugin::users-permissions.user").findOne({ where: { id: targetId, organization: { id: staff.organization.id } } });
    if (!target) throw new errors.NotFoundError("Staff member not found.");
    if (!self && staff.staffRole === "branch_manager" && target.staffRole === "owner") throw new errors.ForbiddenError("Only the owner can set the owner's PIN.");
    const pin = String(ctx.request.body?.pin ?? "");
    const weak = weakPin(pin);
    if (weak) throw new errors.ValidationError(weak);
    await strapi.db.query("plugin::users-permissions.user").update({ where: { id: target.id }, data: { pinHash: hashPin(pin), pinFailures: 0, pinLockedUntil: null } });
    ctx.body = { data: { ok: true } };
  },
  };
  return controller;
};
