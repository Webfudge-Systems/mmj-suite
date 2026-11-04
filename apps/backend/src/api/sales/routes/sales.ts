/**
 * Billing counter endpoints. Every route needs a signed-in staff member; the
 * controllers check the role for each action and the branch for access.
 */
const staff = { policies: ["global::is-staff"] };
const route = (method: string, path: string, handler: string) => ({ method, path, handler, config: staff });

export const salesRoutes = [
  route("GET", "/sales/customers", "customers.list"),
  route("POST", "/sales/customers", "customers.save"),
  route("GET", "/sales/customers/:id", "customers.get"),
  route("PUT", "/sales/customers/:id", "customers.save"),

  route("GET", "/sales/estimates", "estimates.list"),
  route("POST", "/sales/estimates", "estimates.create"),
  route("GET", "/sales/estimates/:id", "estimates.get"),
  route("POST", "/sales/estimates/:id/cancel", "estimates.cancel"),

  route("POST", "/sales/quote", "billing.quote"),
  route("GET", "/sales/invoices", "billing.list"),
  route("POST", "/sales/invoices", "billing.create"),
  route("GET", "/sales/invoices/:id", "billing.get"),
  route("POST", "/sales/invoices/:id/cancel", "billing.cancel"),

  route("GET", "/sales/old-gold", "counter.listOldGold"),
  route("POST", "/sales/old-gold", "counter.buyOldGold"),
  route("POST", "/sales/old-gold/quote", "counter.quoteOldGold"),
  route("GET", "/sales/advances", "counter.listBookings"),
  route("POST", "/sales/advances", "counter.createBooking"),
  route("POST", "/sales/advances/:id/refund", "counter.refundBooking"),
  route("POST", "/sales/returns", "counter.createReturn"),
  route("GET", "/sales/credit-notes", "counter.listCreditNotes"),
  route("POST", "/sales/credit-notes/:id/refund", "counter.refundCreditNote"),
  route("GET", "/sales/day", "counter.daySummary"),
  route("POST", "/sales/day/close", "counter.closeDay"),
];

export default { routes: salesRoutes };
