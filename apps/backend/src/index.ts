import type { Core } from "@strapi/strapi";

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
  "api::gold-rate.gold-rate.find",
  "api::gold-rate.gold-rate.findOne",
  "api::store.store.find",
  "api::store.store.findOne",
  "api::global.global.find",
];

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const role = await strapi.db
      .query("plugin::users-permissions.role")
      .findOne({ where: { type: "public" }, populate: ["permissions"] });

    if (!role) return;

    const existing = new Set(
      (role.permissions ?? []).map((permission: { action: string }) => permission.action),
    );

    for (const action of publicReads) {
      if (existing.has(action)) continue;
      await strapi.db.query("plugin::users-permissions.permission").create({
        data: { action, role: role.id },
      });
    }
  },
};
