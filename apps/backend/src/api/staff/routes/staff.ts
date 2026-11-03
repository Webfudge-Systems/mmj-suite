export default {
  routes: [
    {
      method: "GET",
      path: "/staff/me",
      handler: "staff.me",
      config: { policies: ["global::is-staff"] },
    },
  ],
};
