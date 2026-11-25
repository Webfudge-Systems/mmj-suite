import { errors } from "@strapi/utils";
import { STAFF_ROLES } from "../../../utils/constants";
import { hashPin, weakPin } from "../../../utils/secrets";

const branchRef = (branch: any) => ({ id: branch.id, name: branch.name, code: branch.code, city: branch.city ?? null });

/** Placeholder email for staff who sign in with a username only. The .invalid domain never receives mail. */
const NO_EMAIL = "@no-email.invalid";
const USERNAME = /^[a-z0-9._]{3,30}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES: readonly string[] = STAFF_ROLES;

const text = (value: unknown, max: number) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null);

function weakPassword(password: string) {
  if (password.length < 8) return "The password must be at least 8 characters.";
  if (password.length > 72) return "The password can be at most 72 characters.";
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return "Use both letters and digits in the password.";
  return null;
}

/** One person on the team list. */
function teamRow(person: any) {
  const email = person.email && !String(person.email).endsWith(NO_EMAIL) ? person.email : null;
  return {
    id: person.id,
    name: person.fullName || person.username,
    fullName: person.fullName ?? null,
    username: person.username,
    email,
    phone: person.phone ?? null,
    staffRole: person.staffRole,
    blocked: !!person.blocked,
    hasPin: !!person.pinHash,
    createdAt: person.createdAt ?? null,
    branches: (person.branches ?? []).map(branchRef),
  };
}

/** Only the owner gives the owner or branch manager role. */
function assertRoleAllowed(staff: any, role: string) {
  if (!ROLES.includes(role)) throw new errors.ValidationError("Choose a role.");
  if (staff.staffRole !== "owner" && ["owner", "branch_manager"].includes(role)) {
    throw new errors.ForbiddenError("Only the owner can make someone an owner or a branch manager.");
  }
}

/** The branches a new or edited person may be given: the organization's, and for a manager only their own. */
async function allowedBranches(strapi: any, staff: any, role: string, value: unknown) {
  const ids = [...new Set((Array.isArray(value) ? value : []).map(Number).filter(Boolean))];
  if (!ids.length && role !== "owner") throw new errors.ValidationError("Choose at least one branch.");
  const found = await strapi.db.query("api::branch.branch").findMany({ where: { id: { $in: ids }, organization: { id: staff.organization.id } } });
  if (found.length !== ids.length) throw new errors.ValidationError("One of the branches was not found.");
  if (staff.staffRole !== "owner") {
    const own = new Set((staff.branches ?? []).map((branch: any) => branch.id));
    if (ids.some((id) => !own.has(id))) throw new errors.ForbiddenError("You can only add people to the branches you manage.");
  }
  return ids;
}

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
    ctx.body = { data: people.map(teamRow) };
  },

  /** Adds a staff account. The owner adds anyone; a branch manager adds staff for their own branches. */
  async addMember(ctx: any) {
    const staff = ctx.state.staff;
    const body = ctx.request.body ?? {};
    const fullName = text(body.fullName, 80);
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const staffRole = String(body.staffRole ?? "");

    if (!fullName) throw new errors.ValidationError("Enter their name.");
    if (!USERNAME.test(username)) throw new errors.ValidationError("The username must be 3 to 30 letters, digits, dots or underscores, like ravi.patil.");
    if (email && !EMAIL.test(email)) throw new errors.ValidationError("That email doesn't look right.");
    const weak = weakPassword(password);
    if (weak) throw new errors.ValidationError(weak);
    assertRoleAllowed(staff, staffRole);
    const branchIds = await allowedBranches(strapi, staff, staffRole, body.branchIds);

    const users = strapi.db.query("plugin::users-permissions.user");
    if (await users.findOne({ where: { username } })) throw new errors.ValidationError(`The username ${username} is taken.`);
    if (email && (await users.findOne({ where: { email } }))) throw new errors.ValidationError(`${email} already has an account.`);

    const authenticated = await strapi.db.query("plugin::users-permissions.role").findOne({ where: { type: "authenticated" } });
    const created = await strapi.plugin("users-permissions").service("user").add({
      username,
      email: email || `${username}${NO_EMAIL}`,
      password,
      provider: "local",
      confirmed: true,
      blocked: false,
      role: authenticated?.id,
      fullName,
      phone: text(body.phone, 20),
      staffRole,
      organization: staff.organization.id,
      branches: branchIds,
    });

    ctx.status = 201;
    ctx.body = { data: teamRow(await users.findOne({ where: { id: created.id }, populate: { branches: true } })) };
  },

  /** Edits a staff account: name, contact, role, branches, blocked, or a new password. */
  async updateMember(ctx: any) {
    const staff = ctx.state.staff;
    const body = ctx.request.body ?? {};
    const users = strapi.db.query("plugin::users-permissions.user");
    const target = await users.findOne({ where: { id: Number(ctx.params.id), organization: { id: staff.organization.id } }, populate: { branches: true } });
    if (!target || !target.staffRole) throw new errors.NotFoundError("Staff member not found.");

    const self = target.id === staff.id;
    const isOwner = staff.staffRole === "owner";
    if (!isOwner && ["owner", "branch_manager"].includes(target.staffRole) && !self) {
      throw new errors.ForbiddenError("Only the owner can change an owner or a branch manager.");
    }
    if (!isOwner && !self && !(target.branches ?? []).some((branch: any) => (staff.branches ?? []).some((own: any) => own.id === branch.id))) {
      throw new errors.ForbiddenError("This person works at a branch you don't manage.");
    }

    const data: Record<string, unknown> = {};
    if (body.fullName !== undefined) {
      const fullName = text(body.fullName, 80);
      if (!fullName) throw new errors.ValidationError("Enter their name.");
      data.fullName = fullName;
    }
    if (body.phone !== undefined) data.phone = text(body.phone, 20);
    if (body.email !== undefined) {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      if (email && !EMAIL.test(email)) throw new errors.ValidationError("That email doesn't look right.");
      if (email && (await users.findOne({ where: { email, id: { $ne: target.id } } }))) throw new errors.ValidationError(`${email} already has an account.`);
      data.email = email || `${target.username}${NO_EMAIL}`;
    }

    const roleChanging = body.staffRole !== undefined && body.staffRole !== target.staffRole;
    const blocking = body.blocked !== undefined && !!body.blocked !== !!target.blocked;
    if ((roleChanging || blocking) && self) throw new errors.ValidationError("You can't change your own role or block yourself. Ask the owner.");
    const role = roleChanging ? String(body.staffRole) : target.staffRole;
    if (roleChanging) {
      assertRoleAllowed(staff, role);
      data.staffRole = role;
    }
    if (body.branchIds !== undefined || roleChanging) {
      data.branches = await allowedBranches(strapi, staff, role, body.branchIds ?? (target.branches ?? []).map((branch: any) => branch.id));
    }
    if (blocking) data.blocked = !!body.blocked;

    // Never leave the shop without an owner who can sign in.
    if (target.staffRole === "owner" && ((roleChanging && role !== "owner") || (blocking && body.blocked))) {
      const owners = await users.count({ where: { organization: { id: staff.organization.id }, staffRole: "owner", blocked: false } });
      if (owners <= 1) throw new errors.ValidationError("This is the only owner. Make someone else an owner first.");
    }

    if (body.password !== undefined && body.password !== "") {
      const weak = weakPassword(String(body.password));
      if (weak) throw new errors.ValidationError(weak);
      data.password = String(body.password);
    }

    if (Object.keys(data).length) await strapi.plugin("users-permissions").service("user").edit(target.id, data);
    ctx.body = { data: teamRow(await users.findOne({ where: { id: target.id }, populate: { branches: true } })) };
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
