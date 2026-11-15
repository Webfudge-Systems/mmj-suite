/**
 * Phase 6 endpoints: karigar job work, approvals, repairs and custom orders,
 * and reports. Every route needs a signed-in staff member; the controllers
 * check the role for each action.
 */
const staff = { policies: ["global::is-staff"] };
const route = (method: string, path: string, handler: string) => ({ method, path, handler, config: staff });

export const depthRoutes = [
  route("GET", "/karigar/jobs", "jobwork.list"),
  route("POST", "/karigar/jobs", "jobwork.create"),
  route("GET", "/karigar/jobs/:id", "jobwork.get"),
  route("PUT", "/karigar/jobs/:id", "jobwork.update"),
  route("POST", "/karigar/jobs/:id/issue", "jobwork.issue"),
  route("POST", "/karigar/jobs/:id/close", "jobwork.close"),

  route("GET", "/approvals", "approvals.list"),
  route("POST", "/approvals", "approvals.create"),
  route("GET", "/approvals/:id", "approvals.get"),
  route("POST", "/approvals/:id/return", "approvals.returnItems"),

  route("GET", "/orders", "orders.list"),
  route("POST", "/orders", "orders.create"),
  route("GET", "/orders/:id", "orders.get"),
  route("PUT", "/orders/:id", "orders.update"),
  route("POST", "/orders/:id/payments", "orders.pay"),
  route("POST", "/orders/:id/deliver", "orders.deliver"),

  route("GET", "/reports/sales", "reports.sales"),
  route("GET", "/reports/stock", "reports.stock"),
  route("GET", "/reports/ageing", "reports.ageing"),
  route("GET", "/reports/liabilities", "reports.liabilities"),
];

export default { routes: depthRoutes };
