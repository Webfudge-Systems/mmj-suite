import type { Core } from "@strapi/strapi";
import { floorRoutes } from "./api/floor/routes/floor";
import { salesRoutes } from "./api/sales/routes/sales";
import { stockRoutes } from "./api/stock/routes/stock";
import { registerAuditLog } from "./utils/audit";
import { DEFAULT_CATEGORIES, defaultOrganizationSlug } from "./utils/constants";

const publicReads = [
  "api::category.category.find",
  "api::category.category.findOne",
  "api::collection.collection.find",
  "api::collection.collection.findOne",
  "api::product.product.find",
  "api::product.product.findOne",
  "api::stone.stone.find",
  "api::stone.stone.findOne",
  "api::journal-post.journal-post.find",
  "api::journal-post.journal-post.findOne",
  "api::review.review.find",
  "api::review.review.findOne",
  "api::store.store.find",
  "api::store.store.findOne",
  "api::global.global.find",
];

/** Staff endpoints. Each is further limited by role in its route's policy. */
const staffActions = [
  "api::staff.staff.me",
  "api::staff.staff.branches",
  "api::staff.staff.saveBranch",
  "api::staff.staff.organization",
  "api::staff.staff.saveOrganization",
  "api::staff.staff.team",
  "api::staff.staff.setPin",
  "api::rate-card.rate-card.history",
  "api::rate-card.rate-card.publish",
  // Design photos. Who may attach them to a design is checked by the design endpoint.
  "plugin::upload.content-api.upload",
  ...stockRoutes.map((route) => `api::stock.${route.handler}`),
  ...salesRoutes.map((route) => `api::sales.${route.handler}`),
  ...floorRoutes.map((route) => `api::floor.${route.handler}`),
];

async function grant(strapi: Core.Strapi, roleType: string, actions: string[]) {
  const role = await strapi.db
    .query("plugin::users-permissions.role")
    .findOne({ where: { type: roleType }, populate: ["permissions"] });
  if (!role) return;

  const existing = new Set(
    (role.permissions ?? []).map((permission: { action: string }) => permission.action),
  );

  for (const action of actions) {
    if (existing.has(action)) continue;
    await strapi.db.query("plugin::users-permissions.permission").create({
      data: { action, role: role.id },
    });
  }
}

/**
 * First boot on an empty database: the MMJ organization, its first branch, and
 * an owner account when SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD are set.
 */
async function seed(strapi: Core.Strapi) {
  const slug = defaultOrganizationSlug();
  let organization: any = await strapi.db
    .query("api::organization.organization")
    .findOne({ where: { slug } });

  if (!organization) {
    organization = await strapi.documents("api::organization.organization").create({
      data: { name: "Mukund Maid Jewellers", slug, settings: {} },
    } as any);
    strapi.log.info(`Created organization ${slug}`);
  }

  let branch: any = await strapi.db
    .query("api::branch.branch")
    .findOne({ where: { organization: organization.id } });

  if (!branch) {
    branch = await strapi.documents("api::branch.branch").create({
      data: {
        name: "Rahuri",
        code: "B1",
        city: "Rahuri",
        isActive: true,
        organization: organization.documentId,
      },
    } as any);
    strapi.log.info("Created branch B1 Rahuri");
  }

  const hasCategories = await strapi.db
    .query("api::category.category")
    .count({ where: { organization: { id: organization.id } } });
  if (!hasCategories) {
    for (const [index, category] of DEFAULT_CATEGORIES.entries()) {
      const taken = await strapi.db.query("api::category.category").findOne({ where: { slug: category.slug } });
      await strapi.documents("api::category.category").create({
        data: {
          ...category,
          slug: taken ? `${category.slug}-${slug}` : category.slug,
          sortOrder: index,
          organization: organization.documentId,
        },
      } as any);
    }
    strapi.log.info(`Created ${DEFAULT_CATEGORIES.length} categories`);
  }

  const email = process.env.SEED_OWNER_EMAIL;
  const password = process.env.SEED_OWNER_PASSWORD;
  if (!email || !password) return;

  const existing = await strapi.db.query("plugin::users-permissions.user").findOne({ where: { email } });
  if (existing) return;

  const authenticated = await strapi.db
    .query("plugin::users-permissions.role")
    .findOne({ where: { type: "authenticated" } });

  await strapi.plugin("users-permissions").service("user").add({
    username: email.split("@")[0],
    email,
    password,
    provider: "local",
    confirmed: true,
    blocked: false,
    role: authenticated?.id,
    fullName: process.env.SEED_OWNER_NAME || "Owner",
    staffRole: "owner",
    organization: organization.id,
    branches: [branch.id],
  });
  strapi.log.info(`Created owner account ${email}`);
}

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    registerAuditLog(strapi);
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await grant(strapi, "public", publicReads);
    await grant(strapi, "authenticated", staffActions);
    await seed(strapi);
  },
};
