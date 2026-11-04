import { STAFF_ROLES } from "../../utils/constants";

/** Adds the staff fields every suite app relies on to the built-in user. */
export default (plugin: any) => {
  Object.assign(plugin.contentTypes.user.schema.attributes, {
    fullName: { type: "string" },
    phone: { type: "string" },
    staffRole: { type: "enumeration", enum: [...STAFF_ROLES] },
    organization: {
      type: "relation",
      relation: "manyToOne",
      target: "api::organization.organization",
    },
    branches: {
      type: "relation",
      relation: "manyToMany",
      target: "api::branch.branch",
    },
    // Showroom tablet PIN. Stored as a salted scrypt hash, never readable through the API.
    pinHash: { type: "string", private: true, configurable: false },
    pinFailures: { type: "integer", default: 0, private: true, configurable: false },
    pinLockedUntil: { type: "datetime", private: true, configurable: false },
  });

  return plugin;
};
