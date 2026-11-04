import { errors } from "@strapi/utils";

const branchRef = (branch: any) => ({ id: branch.id, name: branch.name, code: branch.code, city: branch.city ?? null });

/** Branches of the organization. The owner works in all of them; everyone else in their own. */
async function organizationBranches(strapi: any, organizationId: number) {
  return strapi.db.query("api::branch.branch").findMany({
    where: { organization: { id: organizationId }, isActive: { $ne: false } },
    orderBy: { code: "asc" },
  });
}

export default ({ strapi }: { strapi: any }) => ({
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
});
