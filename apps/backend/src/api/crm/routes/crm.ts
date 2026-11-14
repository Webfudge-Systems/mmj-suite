/**
 * CRM & Loyalty endpoints. Every route needs a signed-in staff member; the
 * controllers check the role for each action.
 */
const staff = { policies: ["global::is-staff"] };
const route = (method: string, path: string, handler: string) => ({ method, path, handler, config: staff });

export const crmRoutes = [
  route("GET", "/crm/dashboard", "insights.dashboard"),
  route("GET", "/crm/reminders", "insights.reminders"),
  route("GET", "/crm/audience", "insights.audience"),
  route("GET", "/crm/settings", "insights.getSettings"),
  route("PUT", "/crm/settings", "insights.saveSettings"),
  route("GET", "/crm/loyalty", "insights.loyaltyLedger"),

  route("GET", "/crm/customers/:id", "customers.profile"),
  route("POST", "/crm/customers/:id/points/adjust", "customers.adjustPoints"),
  route("POST", "/crm/customers/:id/points/redeem", "customers.redeemPoints"),

  route("GET", "/crm/scheme-plans", "schemes.listPlans"),
  route("POST", "/crm/scheme-plans", "schemes.savePlan"),
  route("PUT", "/crm/scheme-plans/:id", "schemes.savePlan"),
  route("GET", "/crm/schemes", "schemes.list"),
  route("POST", "/crm/schemes", "schemes.enrol"),
  route("GET", "/crm/schemes/:id", "schemes.get"),
  route("POST", "/crm/schemes/:id/payments", "schemes.pay"),
  route("POST", "/crm/schemes/:id/redeem", "schemes.redeem"),

  route("GET", "/crm/enquiries", "enquiries.list"),
  route("POST", "/crm/enquiries", "enquiries.create"),
  route("GET", "/crm/enquiries/:id", "enquiries.get"),
  route("PUT", "/crm/enquiries/:id", "enquiries.update"),
];

export default { routes: crmRoutes };
