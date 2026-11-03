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
  });

  return plugin;
};
