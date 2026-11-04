/**
 * Stock and catalogue endpoints. Every route needs a signed-in staff member;
 * each controller checks the role for writes and the branch for access.
 */
const staff = { policies: ["global::is-staff"] };

const route = (method: string, path: string, handler: string) => ({ method, path, handler, config: staff });

export const stockRoutes = [
  route("GET", "/stock/categories", "catalogue.listCategories"),
  route("POST", "/stock/categories", "catalogue.saveCategory"),
  route("PUT", "/stock/categories/:id", "catalogue.saveCategory"),
  route("GET", "/stock/collections", "catalogue.listCollections"),
  route("GET", "/stock/designs", "catalogue.listDesigns"),
  route("POST", "/stock/designs", "catalogue.saveDesign"),
  route("GET", "/stock/designs/:id", "catalogue.getDesign"),
  route("PUT", "/stock/designs/:id", "catalogue.saveDesign"),
  route("GET", "/stock/suppliers", "catalogue.listSuppliers"),
  route("POST", "/stock/suppliers", "catalogue.saveSupplier"),
  route("PUT", "/stock/suppliers/:id", "catalogue.saveSupplier"),

  route("GET", "/stock/locations", "locations.list"),
  route("GET", "/stock/locations/lookup", "locations.lookup"),
  route("POST", "/stock/locations", "locations.save"),
  route("GET", "/stock/locations/:id", "locations.get"),
  route("PUT", "/stock/locations/:id", "locations.save"),

  route("GET", "/stock/summary", "items.summary"),
  route("GET", "/stock/items", "items.list"),
  route("GET", "/stock/items/lookup", "items.lookup"),
  route("GET", "/stock/items/:id", "items.get"),
  route("PUT", "/stock/items/:id", "items.update"),
  route("POST", "/stock/move", "items.move"),

  route("GET", "/stock/receipts", "receipts.list"),
  route("POST", "/stock/receipts", "receipts.create"),
  route("GET", "/stock/receipts/:id", "receipts.get"),
  route("POST", "/stock/import", "receipts.importRows"),

  route("GET", "/stock/transfers", "transfers.list"),
  route("POST", "/stock/transfers", "transfers.create"),
  route("GET", "/stock/transfers/:id", "transfers.get"),
  route("POST", "/stock/transfers/:id/receive", "transfers.receive"),

  route("GET", "/stock/audits", "audits.list"),
  route("POST", "/stock/audits", "audits.create"),
  route("GET", "/stock/audits/:id", "audits.get"),
  route("POST", "/stock/audits/:id/scan", "audits.scan"),
  route("POST", "/stock/audits/:id/close", "audits.close"),
];

export default { routes: stockRoutes };
