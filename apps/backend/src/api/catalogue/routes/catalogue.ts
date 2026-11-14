/**
 * Public website endpoints. No sign-in: they expose only designs the shop has
 * marked "Show on website", at today's price, and accept enquiries.
 */
const open = (method: string, path: string, handler: string) => ({ method, path, handler, config: { auth: false } });

export const catalogueRoutes = [
  open("GET", "/catalogue/products", "catalogue.products"),
  open("GET", "/catalogue/products/:slug", "catalogue.product"),
  open("POST", "/catalogue/enquiries", "catalogue.enquire"),
];

export default { routes: catalogueRoutes };
