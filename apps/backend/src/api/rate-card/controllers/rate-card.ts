import { factories } from "@strapi/strapi";
import { defaultOrganizationSlug } from "../../../utils/constants";

export default factories.createCoreController("api::rate-card.rate-card", ({ strapi }) => ({
  async current(ctx: any) {
    const slug = typeof ctx.query.org === "string" && ctx.query.org ? ctx.query.org : defaultOrganizationSlug();
    const organization = await strapi.db
      .query("api::organization.organization")
      .findOne({ where: { slug } });
    if (!organization) return ctx.notFound("Organization not found");

    ctx.set("Cache-Control", "public, max-age=30");
    ctx.body = { data: await strapi.service("api::rate-card.rate-card").current(organization) };
  },

  async history(ctx: any) {
    const limit = Math.min(Math.max(Number(ctx.query.limit) || 30, 1), 100);
    ctx.body = {
      data: await strapi.service("api::rate-card.rate-card").history(ctx.state.staff.organization, limit),
    };
  },

  async publish(ctx: any) {
    const card = await strapi.service("api::rate-card.rate-card").publish(ctx.state.staff, ctx.request.body);
    ctx.status = 201;
    ctx.body = { data: card };
  },
}));
