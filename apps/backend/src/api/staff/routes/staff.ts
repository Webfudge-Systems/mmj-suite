const owner = { policies: [{ name: "global::is-staff", config: { roles: ["owner"] } }] };
const managers = { policies: [{ name: "global::is-staff", config: { roles: ["owner", "branch_manager"] } }] };
const anyStaff = { policies: ["global::is-staff"] };

export default {
  routes: [
    { method: "GET", path: "/staff/me", handler: "staff.me", config: anyStaff },
    { method: "GET", path: "/staff/branches", handler: "staff.branches", config: anyStaff },
    { method: "POST", path: "/staff/branches", handler: "staff.saveBranch", config: owner },
    { method: "PUT", path: "/staff/branches/:id", handler: "staff.saveBranch", config: owner },
    { method: "GET", path: "/staff/organization", handler: "staff.organization", config: anyStaff },
    { method: "PUT", path: "/staff/organization", handler: "staff.saveOrganization", config: owner },
    { method: "GET", path: "/staff/team", handler: "staff.team", config: managers },
    { method: "PUT", path: "/staff/team/:id/pin", handler: "staff.setPin", config: anyStaff },
  ],
};
