import type { Core } from "@strapi/strapi";
import { errors } from "@strapi/utils";

type Config = { roles?: string[] };

/**
 * Lets the request through only for an active staff member of an organization,
 * optionally limited to some roles. Puts the loaded staff record on
 * ctx.state.staff for the controller.
 */
export default async (policyContext: any, config: Config, { strapi }: { strapi: Core.Strapi }) => {
  const user = policyContext.state.user;
  if (!user) return false;

  const staff = await strapi.db.query("plugin::users-permissions.user").findOne({
    where: { id: user.id },
    populate: { organization: true, branches: true },
  });

  if (!staff || staff.blocked || !staff.staffRole || !staff.organization) {
    throw new errors.PolicyError("This account is not set up as staff. Ask the owner to give it a role.");
  }

  if (config?.roles?.length && !config.roles.includes(staff.staffRole)) {
    throw new errors.PolicyError("Your role does not allow this.");
  }

  policyContext.state.staff = staff;
  return true;
};
