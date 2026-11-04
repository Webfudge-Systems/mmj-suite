const owner = { policies: [{ name: "global::is-staff", config: { roles: ["owner"] } }] };

export default {
  routes: [
    {
      method: "GET",
      path: "/staff/me",
      handler: "staff.me",
      config: { policies: ["global::is-staff"] },
    },
    {
      method: "GET",
      path: "/staff/branches",
      handler: "staff.branches",
      config: { policies: ["global::is-staff"] },
    },
    { method: "POST", path: "/staff/branches", handler: "staff.saveBranch", config: owner },
    { method: "PUT", path: "/staff/branches/:id", handler: "staff.saveBranch", config: owner },
  ],
};
