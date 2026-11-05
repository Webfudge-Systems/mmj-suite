import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  // The public address, e.g. https://api.mukundmaidjewellers.in. Used for the admin panel and file links.
  url: env('PUBLIC_URL', ''),
  // Behind Railway's HTTPS proxy, trust its forwarded headers so secure sign-in cookies can be set.
  proxy: { koa: env.bool('IS_PROXIED', env('NODE_ENV') === 'production') },
  app: {
    keys: env.array('APP_KEYS')!,
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});

export default config;
