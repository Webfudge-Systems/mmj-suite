import { RATE_EDITOR_ROLES } from "../../../utils/constants";

export default {
  routes: [
    {
      method: "GET",
      path: "/rates/current",
      handler: "rate-card.current",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/rates/history",
      handler: "rate-card.history",
      config: { policies: ["global::is-staff"] },
    },
    {
      method: "POST",
      path: "/rates",
      handler: "rate-card.publish",
      config: { policies: [{ name: "global::is-staff", config: { roles: RATE_EDITOR_ROLES } }] },
    },
  ],
};
