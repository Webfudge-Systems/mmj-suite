import type { Schema, Struct } from "@strapi/strapi";

export interface AdminApiToken extends Struct.CollectionTypeSchema {
  collectionName: "strapi_api_tokens";
  info: {
    description: "";
    displayName: "Api Token";
    name: "Api Token";
    pluralName: "api-tokens";
    singularName: "api-token";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    adminPermissions: Schema.Attribute.Relation<"oneToMany", "admin::permission">;
    adminUserOwner: Schema.Attribute.Relation<"manyToOne", "admin::user">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<"">;
    encryptedKey: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    expiresAt: Schema.Attribute.DateTime;
    kind: Schema.Attribute.Enumeration<["content-api", "admin"]> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"content-api">;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "admin::api-token"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<"oneToMany", "admin::api-token-permission">;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.Enumeration<["read-only", "full-access", "custom"]> &
      Schema.Attribute.DefaultTo<"read-only">;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Struct.CollectionTypeSchema {
  collectionName: "strapi_api_token_permissions";
  info: {
    description: "";
    displayName: "API Token Permission";
    name: "API Token Permission";
    pluralName: "api-token-permissions";
    singularName: "api-token-permission";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "admin::api-token-permission"> &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<"manyToOne", "admin::api-token">;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface AdminPermission extends Struct.CollectionTypeSchema {
  collectionName: "admin_permissions";
  info: {
    description: "";
    displayName: "Permission";
    name: "Permission";
    pluralName: "permissions";
    singularName: "permission";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    apiToken: Schema.Attribute.Relation<"manyToOne", "admin::api-token">;
    conditions: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "admin::permission"> &
      Schema.Attribute.Private;
    properties: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<"manyToOne", "admin::role">;
    subject: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface AdminRole extends Struct.CollectionTypeSchema {
  collectionName: "admin_roles";
  info: {
    description: "";
    displayName: "Role";
    name: "Role";
    pluralName: "roles";
    singularName: "role";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "admin::role"> & Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<"oneToMany", "admin::permission">;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    users: Schema.Attribute.Relation<"manyToMany", "admin::user">;
  };
}

export interface AdminSession extends Struct.CollectionTypeSchema {
  collectionName: "strapi_sessions";
  info: {
    description: "Session Manager storage";
    displayName: "Session";
    name: "Session";
    pluralName: "sessions";
    singularName: "session";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
    i18n: {
      localized: false;
    };
  };
  attributes: {
    absoluteExpiresAt: Schema.Attribute.DateTime & Schema.Attribute.Private;
    childId: Schema.Attribute.String & Schema.Attribute.Private;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    deviceId: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Private;
    expiresAt: Schema.Attribute.DateTime & Schema.Attribute.Required & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "admin::session"> &
      Schema.Attribute.Private;
    metadata: Schema.Attribute.JSON & Schema.Attribute.Private;
    origin: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    sessionId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique;
    status: Schema.Attribute.String & Schema.Attribute.Private;
    type: Schema.Attribute.String & Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    userId: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Private;
  };
}

export interface AdminTransferToken extends Struct.CollectionTypeSchema {
  collectionName: "strapi_transfer_tokens";
  info: {
    description: "";
    displayName: "Transfer Token";
    name: "Transfer Token";
    pluralName: "transfer-tokens";
    singularName: "transfer-token";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<"">;
    expiresAt: Schema.Attribute.DateTime;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "admin::transfer-token"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<"oneToMany", "admin::transfer-token-permission">;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface AdminTransferTokenPermission extends Struct.CollectionTypeSchema {
  collectionName: "strapi_transfer_token_permissions";
  info: {
    description: "";
    displayName: "Transfer Token Permission";
    name: "Transfer Token Permission";
    pluralName: "transfer-token-permissions";
    singularName: "transfer-token-permission";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "admin::transfer-token-permission"> &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<"manyToOne", "admin::transfer-token">;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface AdminUser extends Struct.CollectionTypeSchema {
  collectionName: "admin_users";
  info: {
    description: "";
    displayName: "User";
    name: "User";
    pluralName: "users";
    singularName: "user";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    apiTokens: Schema.Attribute.Relation<"oneToMany", "admin::api-token"> &
      Schema.Attribute.Private;
    blocked: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    firstname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    lastname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "admin::user"> & Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    preferedLanguage: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    registrationToken: Schema.Attribute.String & Schema.Attribute.Private;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    resetPasswordTokenExpiresAt: Schema.Attribute.DateTime & Schema.Attribute.Private;
    roles: Schema.Attribute.Relation<"manyToMany", "admin::role"> & Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    username: Schema.Attribute.String;
  };
}

export interface ApiApprovalApproval extends Struct.CollectionTypeSchema {
  collectionName: "approvals";
  info: {
    description: "Pieces given to a customer or dealer to choose from at home, tracked until each comes back or is billed.";
    displayName: "Approval";
    pluralName: "approvals";
    singularName: "approval";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    branch: Schema.Attribute.Relation<"manyToOne", "api::branch.branch">;
    by: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.user">;
    closedAt: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    customer: Schema.Attribute.Relation<"manyToOne", "api::customer.customer">;
    dueBackOn: Schema.Attribute.Date;
    lines: Schema.Attribute.JSON;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::approval.approval"> &
      Schema.Attribute.Private;
    log: Schema.Attribute.JSON;
    note: Schema.Attribute.Text;
    number: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    partyName: Schema.Attribute.String;
    partyPhone: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 15;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<["open", "closed"]> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"open">;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiAuditLogAuditLog extends Struct.CollectionTypeSchema {
  collectionName: "audit_logs";
  info: {
    description: "Who changed what, and when. Written by the backend only.";
    displayName: "Audit log";
    pluralName: "audit-logs";
    singularName: "audit-log";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    action: Schema.Attribute.Enumeration<["create", "update", "delete", "publish", "unpublish"]> &
      Schema.Attribute.Required;
    actor: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.user">;
    actorLabel: Schema.Attribute.String;
    actorType: Schema.Attribute.Enumeration<["staff", "admin", "system"]> &
      Schema.Attribute.Required;
    changes: Schema.Attribute.JSON;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    entityId: Schema.Attribute.String;
    entityType: Schema.Attribute.String & Schema.Attribute.Required;
    ip: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::audit-log.audit-log"> &
      Schema.Attribute.Private;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    publishedAt: Schema.Attribute.DateTime;
    summary: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiBookingBooking extends Struct.CollectionTypeSchema {
  collectionName: "bookings";
  info: {
    description: "An advance paid by a customer, optionally locking the day's rate for some weight.";
    displayName: "Booking";
    pluralName: "bookings";
    singularName: "booking";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    amount: Schema.Attribute.Decimal & Schema.Attribute.Required;
    balance: Schema.Attribute.Decimal & Schema.Attribute.Required;
    branch: Schema.Attribute.Relation<"manyToOne", "api::branch.branch">;
    by: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.user">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    customer: Schema.Attribute.Relation<"manyToOne", "api::customer.customer">;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::booking.booking"> &
      Schema.Attribute.Private;
    lockedPurity: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 8;
      }>;
    lockedRate: Schema.Attribute.Decimal;
    lockedWeight: Schema.Attribute.Decimal;
    lockedWeightUsed: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>;
    note: Schema.Attribute.Text;
    number: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    payments: Schema.Attribute.JSON & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<["open", "used", "refunded"]> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"open">;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    usage: Schema.Attribute.JSON;
    validUntil: Schema.Attribute.Date;
  };
}

export interface ApiBranchBranch extends Struct.CollectionTypeSchema {
  collectionName: "branches";
  info: {
    description: "A shop of an organization. Stock, staff and sales are scoped to branches.";
    displayName: "Branch";
    pluralName: "branches";
    singularName: "branch";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    address: Schema.Attribute.Text;
    city: Schema.Attribute.String;
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 8;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    gstin: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 15;
      }>;
    isActive: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::branch.branch"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    phone: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiCategoryCategory extends Struct.CollectionTypeSchema {
  collectionName: "categories";
  info: {
    description: "Ornament taxonomy: rings, bangles, mangalsutra and the rest.";
    displayName: "Category";
    pluralName: "categories";
    singularName: "category";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    code: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 4;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    image: Schema.Attribute.Media<"images">;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::category.category"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    products: Schema.Attribute.Relation<"oneToMany", "api::product.product">;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<"name"> & Schema.Attribute.Required;
    sortOrder: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    tagline: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiCollectionCollection extends Struct.CollectionTypeSchema {
  collectionName: "collections";
  info: {
    description: "A named group of ornaments struck to sit together.";
    displayName: "Collection";
    pluralName: "collections";
    singularName: "collection";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    image: Schema.Attribute.Media<"images">;
    index: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::collection.collection"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    products: Schema.Attribute.Relation<"oneToMany", "api::product.product">;
    publishedAt: Schema.Attribute.DateTime;
    seo: Schema.Attribute.Component<"shared.seo", false>;
    slug: Schema.Attribute.UID<"name"> & Schema.Attribute.Required;
    tagline: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiCreditNoteCreditNote extends Struct.CollectionTypeSchema {
  collectionName: "credit_notes";
  info: {
    description: "Value owed to a customer for returned pieces. Used against a bill or paid out.";
    displayName: "Credit note";
    pluralName: "credit-notes";
    singularName: "credit-note";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    amount: Schema.Attribute.Decimal & Schema.Attribute.Required;
    balance: Schema.Attribute.Decimal & Schema.Attribute.Required;
    branch: Schema.Attribute.Relation<"manyToOne", "api::branch.branch">;
    by: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.user">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    customer: Schema.Attribute.Relation<"manyToOne", "api::customer.customer">;
    deductionPercent: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>;
    invoice: Schema.Attribute.Relation<"manyToOne", "api::invoice.invoice">;
    lines: Schema.Attribute.JSON & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::credit-note.credit-note"> &
      Schema.Attribute.Private;
    number: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    publishedAt: Schema.Attribute.DateTime;
    reason: Schema.Attribute.Text;
    refunds: Schema.Attribute.JSON;
    status: Schema.Attribute.Enumeration<["open", "used", "refunded"]> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"open">;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    usage: Schema.Attribute.JSON;
  };
}

export interface ApiCustomerCustomer extends Struct.CollectionTypeSchema {
  collectionName: "customers";
  info: {
    description: "A person or business who buys from or sells to the shop.";
    displayName: "Customer";
    pluralName: "customers";
    singularName: "customer";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    address: Schema.Attribute.Text;
    altPhone: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 15;
      }>;
    anniversaryDate: Schema.Attribute.Date;
    birthDate: Schema.Attribute.Date;
    branch: Schema.Attribute.Relation<"manyToOne", "api::branch.branch">;
    city: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    email: Schema.Attribute.Email;
    gstin: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 15;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::customer.customer"> &
      Schema.Attribute.Private;
    loyaltyPoints: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    marketingOptIn: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    notes: Schema.Attribute.Text;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    pan: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 10;
      }>;
    phone: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 15;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    source: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 30;
      }>;
    tags: Schema.Attribute.JSON;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiDayCloseDayClose extends Struct.CollectionTypeSchema {
  collectionName: "day_closes";
  info: {
    description: "The counter's end-of-day cash count against what the system expects.";
    displayName: "Day close";
    pluralName: "day-closes";
    singularName: "day-close";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    branch: Schema.Attribute.Relation<"manyToOne", "api::branch.branch">;
    closedBy: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.user">;
    countedCash: Schema.Attribute.Decimal & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    date: Schema.Attribute.Date & Schema.Attribute.Required;
    difference: Schema.Attribute.Decimal & Schema.Attribute.Required;
    expectedCash: Schema.Attribute.Decimal & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::day-close.day-close"> &
      Schema.Attribute.Private;
    notes: Schema.Attribute.Text;
    openingCash: Schema.Attribute.Decimal & Schema.Attribute.Required;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    publishedAt: Schema.Attribute.DateTime;
    totals: Schema.Attribute.JSON & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiDesignDesign extends Struct.CollectionTypeSchema {
  collectionName: "designs";
  info: {
    description: "A catalogue entry. Each tagged piece is an item of one design.";
    displayName: "Design";
    pluralName: "designs";
    singularName: "design";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    category: Schema.Attribute.Relation<"manyToOne", "api::category.category">;
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 32;
      }>;
    collection: Schema.Attribute.Relation<"manyToOne", "api::collection.collection">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    defaultPurity: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 8;
      }>;
    description: Schema.Attribute.Text;
    images: Schema.Attribute.Media<"images", true>;
    isActive: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    isOnline: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::design.design"> &
      Schema.Attribute.Private;
    making: Schema.Attribute.Component<"pricing.making", false>;
    metal: Schema.Attribute.Enumeration<["gold", "silver", "platinum"]> & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    occasion: Schema.Attribute.Enumeration<["bridal", "festive", "daily", "gifting", "mens"]>;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiDeviceDevice extends Struct.CollectionTypeSchema {
  collectionName: "devices";
  info: {
    description: "A showroom tablet paired with a branch. Salespeople sign in on it with a PIN.";
    displayName: "Device";
    pluralName: "devices";
    singularName: "device";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    addedBy: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.user">;
    branch: Schema.Attribute.Relation<"manyToOne", "api::branch.branch">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    isActive: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    lastSeenAt: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::device.device"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    pairingCodeHash: Schema.Attribute.String & Schema.Attribute.Private;
    pairingExpiresAt: Schema.Attribute.DateTime;
    publishedAt: Schema.Attribute.DateTime;
    tokenHash: Schema.Attribute.String & Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiEnquiryEnquiry extends Struct.CollectionTypeSchema {
  collectionName: "enquiries";
  info: {
    description: "A sales lead: a website request, phone call or walk-in, followed up until it is won or lost.";
    displayName: "Enquiry";
    pluralName: "enquiries";
    singularName: "enquiry";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    assignedTo: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.user">;
    branch: Schema.Attribute.Relation<"manyToOne", "api::branch.branch">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    customer: Schema.Attribute.Relation<"manyToOne", "api::customer.customer">;
    email: Schema.Attribute.Email;
    followUpOn: Schema.Attribute.Date;
    items: Schema.Attribute.JSON;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::enquiry.enquiry"> &
      Schema.Attribute.Private;
    log: Schema.Attribute.JSON;
    lostReason: Schema.Attribute.String;
    message: Schema.Attribute.Text;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    number: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    phone: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 15;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    source: Schema.Attribute.Enumeration<
      ["website", "walk_in", "phone", "whatsapp", "referral", "other"]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"website">;
    status: Schema.Attribute.Enumeration<["new", "contacted", "visit_booked", "won", "lost"]> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"new">;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    visitOn: Schema.Attribute.Date;
  };
}

export interface ApiEstimateEstimate extends Struct.CollectionTypeSchema {
  collectionName: "estimates";
  info: {
    description: "Pieces a customer chose, waiting at the counter to be billed.";
    displayName: "Estimate";
    pluralName: "estimates";
    singularName: "estimate";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    billedAt: Schema.Attribute.DateTime;
    branch: Schema.Attribute.Relation<"manyToOne", "api::branch.branch">;
    cancelledAt: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    customer: Schema.Attribute.Relation<"manyToOne", "api::customer.customer">;
    invoice: Schema.Attribute.Relation<"manyToOne", "api::invoice.invoice">;
    lines: Schema.Attribute.JSON & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::estimate.estimate"> &
      Schema.Attribute.Private;
    note: Schema.Attribute.Text;
    number: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    publishedAt: Schema.Attribute.DateTime;
    salesperson: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.user">;
    status: Schema.Attribute.Enumeration<["open", "billed", "cancelled"]> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"open">;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiGlobalGlobal extends Struct.SingleTypeSchema {
  collectionName: "globals";
  info: {
    description: "Site identity, announcement, contact, nav, promises and FAQs.";
    displayName: "Global";
    pluralName: "globals";
    singularName: "global";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    announcement: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    email: Schema.Attribute.Email;
    faqs: Schema.Attribute.Component<"shared.faq-item", true>;
    footerColumns: Schema.Attribute.Component<"shared.footer-column", true>;
    hours: Schema.Attribute.Component<"shared.showroom-hours", true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::global.global"> &
      Schema.Attribute.Private;
    mainNav: Schema.Attribute.Component<"shared.nav-link", true>;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"Mukund Maid Jewellers">;
    phone: Schema.Attribute.String;
    promises: Schema.Attribute.Component<"shared.promise", true>;
    publishedAt: Schema.Attribute.DateTime;
    seo: Schema.Attribute.Component<"shared.seo", false>;
    shortName: Schema.Attribute.String & Schema.Attribute.DefaultTo<"MMJ">;
    showroomCity: Schema.Attribute.String;
    showroomStreet: Schema.Attribute.String;
    social: Schema.Attribute.Component<"shared.social-link", true>;
    tagline: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    whatsapp: Schema.Attribute.String;
  };
}

export interface ApiInvoiceInvoice extends Struct.CollectionTypeSchema {
  collectionName: "invoices";
  info: {
    description: "A tax invoice. Priced on the server; never edited after it is issued, only cancelled.";
    displayName: "Invoice";
    pluralName: "invoices";
    singularName: "invoice";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    advanceUsed: Schema.Attribute.Decimal;
    amountDue: Schema.Attribute.Decimal & Schema.Attribute.Required;
    branch: Schema.Attribute.Relation<"manyToOne", "api::branch.branch">;
    cancelledAt: Schema.Attribute.DateTime;
    cancelledBy: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.user">;
    cancelReason: Schema.Attribute.Text;
    cashier: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.user">;
    cgst: Schema.Attribute.Decimal & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    creditNoteUsed: Schema.Attribute.Decimal;
    customer: Schema.Attribute.Relation<"manyToOne", "api::customer.customer">;
    customerSnapshot: Schema.Attribute.JSON & Schema.Attribute.Required;
    estimate: Schema.Attribute.Relation<"manyToOne", "api::estimate.estimate">;
    invoiceDate: Schema.Attribute.DateTime & Schema.Attribute.Required;
    lines: Schema.Attribute.JSON & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::invoice.invoice"> &
      Schema.Attribute.Private;
    notes: Schema.Attribute.Text;
    number: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    oldGoldValue: Schema.Attribute.Decimal;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    payments: Schema.Attribute.JSON & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    rates: Schema.Attribute.JSON & Schema.Attribute.Required;
    roundOff: Schema.Attribute.Decimal & Schema.Attribute.Required;
    salesperson: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.user">;
    sgst: Schema.Attribute.Decimal & Schema.Attribute.Required;
    status: Schema.Attribute.Enumeration<["paid", "cancelled"]> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"paid">;
    taxableValue: Schema.Attribute.Decimal & Schema.Attribute.Required;
    total: Schema.Attribute.Decimal & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiItemItem extends Struct.CollectionTypeSchema {
  collectionName: "items";
  info: {
    description: "One tagged physical piece. Changed only through the stock endpoints, which write a movement each time.";
    displayName: "Item";
    pluralName: "items";
    singularName: "item";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    branch: Schema.Attribute.Relation<"manyToOne", "api::branch.branch">;
    costPrice: Schema.Attribute.Decimal &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    design: Schema.Attribute.Relation<"manyToOne", "api::design.design">;
    grossWeight: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    heldBy: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.user">;
    heldSince: Schema.Attribute.DateTime;
    huid: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 6;
      }>;
    legacyTag: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 64;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::item.item"> &
      Schema.Attribute.Private;
    location: Schema.Attribute.Relation<"manyToOne", "api::location.location">;
    making: Schema.Attribute.Component<"pricing.making", false>;
    metal: Schema.Attribute.Enumeration<["gold", "silver", "platinum"]> & Schema.Attribute.Required;
    netWeight: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    notes: Schema.Attribute.Text;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    photos: Schema.Attribute.Media<"images", true>;
    publishedAt: Schema.Attribute.DateTime;
    purity: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 8;
      }>;
    receipt: Schema.Attribute.Relation<"manyToOne", "api::stock-receipt.stock-receipt">;
    receivedAt: Schema.Attribute.DateTime;
    rfid: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 64;
      }>;
    slot: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 8;
      }>;
    status: Schema.Attribute.Enumeration<
      [
        "in_stock",
        "with_staff",
        "reserved",
        "sold",
        "on_approval",
        "at_karigar",
        "in_transit",
        "melted",
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"in_stock">;
    stoneValue: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    stoneWeight: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    supplier: Schema.Attribute.Relation<"manyToOne", "api::supplier.supplier">;
    tagNumber: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 32;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiJobWorkJobWork extends Struct.CollectionTypeSchema {
  collectionName: "job_works";
  info: {
    description: "Metal issued to a karigar to make pieces, the pieces received back, and the fine-metal settlement.";
    displayName: "Job work";
    pluralName: "job-works";
    singularName: "job-work";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    branch: Schema.Attribute.Relation<"manyToOne", "api::branch.branch">;
    by: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.user">;
    closedAt: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    dueOn: Schema.Attribute.Date;
    issues: Schema.Attribute.JSON;
    karigar: Schema.Attribute.Relation<"manyToOne", "api::supplier.supplier">;
    labourCharge: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::job-work.job-work"> &
      Schema.Attribute.Private;
    log: Schema.Attribute.JSON;
    number: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    publishedAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<["open", "closed"]> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"open">;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    wastagePercent: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
  };
}

export interface ApiJournalPostJournalPost extends Struct.CollectionTypeSchema {
  collectionName: "journal_posts";
  info: {
    description: "A note from the workshop.";
    displayName: "Journal post";
    pluralName: "journal-posts";
    singularName: "journal-post";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    body: Schema.Attribute.RichText & Schema.Attribute.Required;
    category: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    excerpt: Schema.Attribute.Text & Schema.Attribute.Required;
    image: Schema.Attribute.Media<"images">;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::journal-post.journal-post"> &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    publishedOn: Schema.Attribute.Date;
    readingTime: Schema.Attribute.String;
    seo: Schema.Attribute.Component<"shared.seo", false>;
    slug: Schema.Attribute.UID<"title"> & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiLocationLocation extends Struct.CollectionTypeSchema {
  collectionName: "locations";
  info: {
    description: "A showcase, counter, tray or safe in a branch. Trays sit inside showcases or counters.";
    displayName: "Location";
    pluralName: "locations";
    singularName: "location";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    branch: Schema.Attribute.Relation<"manyToOne", "api::branch.branch">;
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 12;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    fullCode: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    isActive: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    kind: Schema.Attribute.Enumeration<["showcase", "counter", "tray", "safe", "back_office"]> &
      Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::location.location"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    parent: Schema.Attribute.Relation<"manyToOne", "api::location.location">;
    publishedAt: Schema.Attribute.DateTime;
    sortOrder: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiLoyaltyEntryLoyaltyEntry extends Struct.CollectionTypeSchema {
  collectionName: "loyalty_entries";
  info: {
    description: "One change to a customer's loyalty points. Append-only: corrections are new entries.";
    displayName: "Loyalty entry";
    pluralName: "loyalty-entries";
    singularName: "loyalty-entry";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    balance: Schema.Attribute.Integer & Schema.Attribute.Required;
    by: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.user">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    customer: Schema.Attribute.Relation<"manyToOne", "api::customer.customer">;
    invoice: Schema.Attribute.Relation<"manyToOne", "api::invoice.invoice">;
    kind: Schema.Attribute.Enumeration<["earn", "reverse", "redeem", "adjust"]> &
      Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::loyalty-entry.loyalty-entry"> &
      Schema.Attribute.Private;
    note: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 300;
      }>;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    points: Schema.Attribute.Integer & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    reference: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiOldGoldOldGold extends Struct.CollectionTypeSchema {
  collectionName: "old_golds";
  info: {
    description: "Old gold or silver taken from a customer, against a bill or bought outright.";
    displayName: "Old gold";
    pluralName: "old-golds";
    singularName: "old-gold";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    branch: Schema.Attribute.Relation<"manyToOne", "api::branch.branch">;
    by: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.user">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    customer: Schema.Attribute.Relation<"manyToOne", "api::customer.customer">;
    idProof: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    invoice: Schema.Attribute.Relation<"manyToOne", "api::invoice.invoice">;
    kind: Schema.Attribute.Enumeration<["exchange", "purchase"]> & Schema.Attribute.Required;
    lines: Schema.Attribute.JSON & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::old-gold.old-gold"> &
      Schema.Attribute.Private;
    number: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    payouts: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    totalValue: Schema.Attribute.Decimal & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiOrganizationOrganization extends Struct.CollectionTypeSchema {
  collectionName: "organizations";
  info: {
    description: "A jewellery business using the suite. Every record belongs to one.";
    displayName: "Organization";
    pluralName: "organizations";
    singularName: "organization";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    branches: Schema.Attribute.Relation<"oneToMany", "api::branch.branch">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    email: Schema.Attribute.Email;
    gstin: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 15;
      }>;
    legalName: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::organization.organization"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    phone: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    settings: Schema.Attribute.JSON;
    slug: Schema.Attribute.UID<"name"> & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiProductProduct extends Struct.CollectionTypeSchema {
  collectionName: "products";
  info: {
    description: "A gold, diamond, silver, platinum or bullion ornament.";
    displayName: "Product";
    pluralName: "products";
    singularName: "product";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    availability: Schema.Attribute.Enumeration<["in-stock", "made-to-order"]> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"in-stock">;
    bestseller: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    care: Schema.Attribute.RichText;
    category: Schema.Attribute.Relation<"manyToOne", "api::category.category">;
    collection: Schema.Attribute.Relation<"manyToOne", "api::collection.collection">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    description: Schema.Attribute.RichText;
    designNumber: Schema.Attribute.String;
    featured: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    grossWeight: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    hallmark: Schema.Attribute.Component<"product.hallmark", false>;
    images: Schema.Attribute.Media<"images", true> & Schema.Attribute.Required;
    isNew: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::product.product"> &
      Schema.Attribute.Private;
    makingChargePercent: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    metal: Schema.Attribute.Enumeration<["gold", "diamond", "silver", "platinum", "bullion"]> &
      Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    netWeight: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    occasion: Schema.Attribute.Enumeration<["bridal", "festive", "daily", "gifting", "mens"]> &
      Schema.Attribute.Required;
    offerPercent: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 90;
          min: 0;
        },
        number
      >;
    popularity: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    publishedAt: Schema.Attribute.DateTime;
    purity: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 8;
      }>;
    releasedAt: Schema.Attribute.Date;
    seo: Schema.Attribute.Component<"shared.seo", false>;
    sizes: Schema.Attribute.Component<"product.size-option", true>;
    sku: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Unique;
    slug: Schema.Attribute.UID<"name"> & Schema.Attribute.Required;
    specs: Schema.Attribute.Component<"product.spec", true>;
    stoneCost: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    stones: Schema.Attribute.Component<"product.stone-detail", true>;
    stoneWeight: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    tagline: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiRateCardRateCard extends Struct.CollectionTypeSchema {
  collectionName: "rate_cards";
  info: {
    description: "The metal rates published for a trading day. Never edited; a new card replaces the last.";
    displayName: "Rate card";
    pluralName: "rate-cards";
    singularName: "rate-card";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    effectiveFrom: Schema.Attribute.DateTime & Schema.Attribute.Required;
    largeChange: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::rate-card.rate-card"> &
      Schema.Attribute.Private;
    note: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    publishedAt: Schema.Attribute.DateTime;
    rates: Schema.Attribute.Component<"rates.rate-line", true> & Schema.Attribute.Required;
    setBy: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.user">;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiReviewReview extends Struct.CollectionTypeSchema {
  collectionName: "reviews";
  info: {
    description: "A customer review shown on home and about.";
    displayName: "Review";
    pluralName: "reviews";
    singularName: "review";
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    body: Schema.Attribute.Text & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::review.review"> &
      Schema.Attribute.Private;
    location: Schema.Attribute.String & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    product: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    publishedOn: Schema.Attribute.Date;
    rating: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 1;
        },
        number
      >;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiSchemeAccountSchemeAccount extends Struct.CollectionTypeSchema {
  collectionName: "scheme_accounts";
  info: {
    description: "One customer's membership of a gold savings scheme.";
    displayName: "Scheme account";
    pluralName: "scheme-accounts";
    singularName: "scheme-account";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    bonusAmount: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    bonusType: Schema.Attribute.Enumeration<["instalment", "percent", "none"]> &
      Schema.Attribute.Required;
    bonusValue: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    booking: Schema.Attribute.Relation<"manyToOne", "api::booking.booking">;
    branch: Schema.Attribute.Relation<"manyToOne", "api::branch.branch">;
    by: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.user">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    customer: Schema.Attribute.Relation<"manyToOne", "api::customer.customer">;
    instalmentsPaid: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::scheme-account.scheme-account"> &
      Schema.Attribute.Private;
    monthlyAmount: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    months: Schema.Attribute.Integer & Schema.Attribute.Required;
    note: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 300;
      }>;
    number: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    paidTotal: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    plan: Schema.Attribute.Relation<"manyToOne", "api::scheme-plan.scheme-plan">;
    publishedAt: Schema.Attribute.DateTime;
    redeemedAs: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
    redeemedAt: Schema.Attribute.DateTime;
    startDate: Schema.Attribute.Date & Schema.Attribute.Required;
    status: Schema.Attribute.Enumeration<["active", "matured", "redeemed", "closed"]> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"active">;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiSchemePaymentSchemePayment extends Struct.CollectionTypeSchema {
  collectionName: "scheme_payments";
  info: {
    description: "One instalment received on a gold savings scheme. Counted in the day close like any other money in.";
    displayName: "Scheme payment";
    pluralName: "scheme-payments";
    singularName: "scheme-payment";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    account: Schema.Attribute.Relation<"manyToOne", "api::scheme-account.scheme-account">;
    amount: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    branch: Schema.Attribute.Relation<"manyToOne", "api::branch.branch">;
    by: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.user">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    customer: Schema.Attribute.Relation<"manyToOne", "api::customer.customer">;
    instalmentNo: Schema.Attribute.Integer & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::scheme-payment.scheme-payment"> &
      Schema.Attribute.Private;
    number: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    payments: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiSchemePlanSchemePlan extends Struct.CollectionTypeSchema {
  collectionName: "scheme_plans";
  info: {
    description: "A gold savings scheme on offer: how many monthly instalments and what the shop adds at the end.";
    displayName: "Scheme plan";
    pluralName: "scheme-plans";
    singularName: "scheme-plan";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    bonusType: Schema.Attribute.Enumeration<["instalment", "percent", "none"]> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"instalment">;
    bonusValue: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    graceDays: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<7>;
    isActive: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::scheme-plan.scheme-plan"> &
      Schema.Attribute.Private;
    minInstalment: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    months: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 12;
          min: 1;
        },
        number
      >;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    publishedAt: Schema.Attribute.DateTime;
    terms: Schema.Attribute.Text;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiSequenceSequence extends Struct.CollectionTypeSchema {
  collectionName: "sequences";
  info: {
    description: "Running numbers for tags, designs, receipts and transfers. Written by the backend only.";
    displayName: "Sequence";
    pluralName: "sequences";
    singularName: "sequence";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::sequence.sequence"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    value: Schema.Attribute.BigInteger & Schema.Attribute.Required;
  };
}

export interface ApiServiceOrderServiceOrder extends Struct.CollectionTypeSchema {
  collectionName: "service_orders";
  info: {
    description: "A repair of a customer's own piece, or a custom piece made to order, from intake to delivery.";
    displayName: "Service order";
    pluralName: "service-orders";
    singularName: "service-order";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    booking: Schema.Attribute.Relation<"manyToOne", "api::booking.booking">;
    branch: Schema.Attribute.Relation<"manyToOne", "api::branch.branch">;
    by: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.user">;
    charge: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    customer: Schema.Attribute.Relation<"manyToOne", "api::customer.customer">;
    deliveredAt: Schema.Attribute.DateTime;
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    dueOn: Schema.Attribute.Date;
    estimate: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    itemDescription: Schema.Attribute.String;
    karigar: Schema.Attribute.Relation<"manyToOne", "api::supplier.supplier">;
    kind: Schema.Attribute.Enumeration<["repair", "custom"]> & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::service-order.service-order"> &
      Schema.Attribute.Private;
    log: Schema.Attribute.JSON;
    number: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    paidTotal: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    payments: Schema.Attribute.JSON;
    photos: Schema.Attribute.Media<"images", true>;
    publishedAt: Schema.Attribute.DateTime;
    purity: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 8;
      }>;
    status: Schema.Attribute.Enumeration<
      ["received", "in_work", "ready", "delivered", "cancelled"]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"received">;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    weightIn: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    weightOut: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
  };
}

export interface ApiStockAuditStockAudit extends Struct.CollectionTypeSchema {
  collectionName: "stock_audits";
  info: {
    description: "A count of one branch or one showcase or tray, compared with what the system expects.";
    displayName: "Stock audit";
    pluralName: "stock-audits";
    singularName: "stock-audit";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    branch: Schema.Attribute.Relation<"manyToOne", "api::branch.branch">;
    closedAt: Schema.Attribute.DateTime;
    closedBy: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.user">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    expected: Schema.Attribute.JSON;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::stock-audit.stock-audit"> &
      Schema.Attribute.Private;
    location: Schema.Attribute.Relation<"manyToOne", "api::location.location">;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    publishedAt: Schema.Attribute.DateTime;
    result: Schema.Attribute.JSON;
    scans: Schema.Attribute.JSON;
    startedAt: Schema.Attribute.DateTime;
    startedBy: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.user">;
    status: Schema.Attribute.Enumeration<["open", "closed"]> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"open">;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiStockMovementStockMovement extends Struct.CollectionTypeSchema {
  collectionName: "stock_movements";
  info: {
    description: "The stock ledger. One row per change to a piece. Never edited.";
    displayName: "Stock movement";
    pluralName: "stock-movements";
    singularName: "stock-movement";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    by: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.user">;
    changes: Schema.Attribute.JSON;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    fromBranch: Schema.Attribute.Relation<"manyToOne", "api::branch.branch">;
    fromLocation: Schema.Attribute.Relation<"manyToOne", "api::location.location">;
    fromStatus: Schema.Attribute.String;
    item: Schema.Attribute.Relation<"manyToOne", "api::item.item">;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::stock-movement.stock-movement"> &
      Schema.Attribute.Private;
    note: Schema.Attribute.Text;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    publishedAt: Schema.Attribute.DateTime;
    reference: Schema.Attribute.String;
    toBranch: Schema.Attribute.Relation<"manyToOne", "api::branch.branch">;
    toLocation: Schema.Attribute.Relation<"manyToOne", "api::location.location">;
    toStatus: Schema.Attribute.String;
    type: Schema.Attribute.Enumeration<
      [
        "received",
        "imported",
        "moved",
        "edited",
        "dispatched",
        "arrived",
        "audited",
        "picked",
        "put_back",
        "reserved",
        "released",
        "sold",
        "returned",
        "sale_cancelled",
        "approval_out",
        "approval_back",
      ]
    > &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiStockReceiptStockReceipt extends Struct.CollectionTypeSchema {
  collectionName: "stock_receipts";
  info: {
    description: "Goods received: a supplier bill, a karigar delivery, or opening stock.";
    displayName: "Stock receipt";
    pluralName: "stock-receipts";
    singularName: "stock-receipt";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    attachments: Schema.Attribute.Media<"images" | "files", true>;
    billDate: Schema.Attribute.Date;
    billNumber: Schema.Attribute.String;
    branch: Schema.Attribute.Relation<"manyToOne", "api::branch.branch">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    items: Schema.Attribute.Relation<"oneToMany", "api::item.item">;
    jobWork: Schema.Attribute.Relation<"manyToOne", "api::job-work.job-work">;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::stock-receipt.stock-receipt"> &
      Schema.Attribute.Private;
    notes: Schema.Attribute.Text;
    number: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 32;
      }>;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    publishedAt: Schema.Attribute.DateTime;
    receivedBy: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.user">;
    source: Schema.Attribute.Enumeration<["purchase", "karigar", "opening_stock"]> &
      Schema.Attribute.Required;
    supplier: Schema.Attribute.Relation<"manyToOne", "api::supplier.supplier">;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiStoneStone extends Struct.CollectionTypeSchema {
  collectionName: "stones";
  info: {
    description: "A gem type used across the catalogue: diamond, polki, ruby and the rest.";
    displayName: "Stone";
    pluralName: "stones";
    singularName: "stone";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    image: Schema.Attribute.Media<"images">;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::stone.stone"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<"name"> & Schema.Attribute.Required;
    type: Schema.Attribute.Enumeration<
      ["diamond", "polki", "ruby", "emerald", "sapphire", "pearl"]
    > &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiStoreStore extends Struct.CollectionTypeSchema {
  collectionName: "stores";
  info: {
    description: "A showroom: address, hours and map.";
    displayName: "Store";
    pluralName: "stores";
    singularName: "store";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    addressLines: Schema.Attribute.Text & Schema.Attribute.Required;
    city: Schema.Attribute.String & Schema.Attribute.Required;
    closedOn: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    hours: Schema.Attribute.Component<"shared.showroom-hours", true>;
    image: Schema.Attribute.Media<"images">;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::store.store"> &
      Schema.Attribute.Private;
    mapUrl: Schema.Attribute.String;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    phone: Schema.Attribute.String;
    pincode: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<"name"> & Schema.Attribute.Required;
    state: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiSupplierSupplier extends Struct.CollectionTypeSchema {
  collectionName: "suppliers";
  info: {
    description: "A supplier of finished jewellery or a karigar who makes it.";
    displayName: "Supplier";
    pluralName: "suppliers";
    singularName: "supplier";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    address: Schema.Attribute.Text;
    city: Schema.Attribute.String;
    contactPerson: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    email: Schema.Attribute.String;
    gstin: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 15;
      }>;
    isActive: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    kind: Schema.Attribute.Enumeration<["supplier", "karigar"]> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"supplier">;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::supplier.supplier"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    notes: Schema.Attribute.Text;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    phone: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface ApiTransferTransfer extends Struct.CollectionTypeSchema {
  collectionName: "transfers";
  info: {
    description: "Pieces sent from one branch to another.";
    displayName: "Transfer";
    pluralName: "transfers";
    singularName: "transfer";
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    completedAt: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    dispatchedAt: Schema.Attribute.DateTime;
    dispatchedBy: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.user">;
    fromBranch: Schema.Attribute.Relation<"manyToOne", "api::branch.branch">;
    lines: Schema.Attribute.JSON & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "api::transfer.transfer"> &
      Schema.Attribute.Private;
    note: Schema.Attribute.Text;
    number: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 32;
      }>;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    publishedAt: Schema.Attribute.DateTime;
    receivedBy: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.user">;
    status: Schema.Attribute.Enumeration<["in_transit", "partly_received", "received"]> &
      Schema.Attribute.Required;
    toBranch: Schema.Attribute.Relation<"manyToOne", "api::branch.branch">;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface PluginContentReleasesRelease extends Struct.CollectionTypeSchema {
  collectionName: "strapi_releases";
  info: {
    displayName: "Release";
    pluralName: "releases";
    singularName: "release";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    actions: Schema.Attribute.Relation<"oneToMany", "plugin::content-releases.release-action">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "plugin::content-releases.release"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    releasedAt: Schema.Attribute.DateTime;
    scheduledAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<["ready", "blocked", "failed", "done", "empty"]> &
      Schema.Attribute.Required;
    timezone: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface PluginContentReleasesReleaseAction extends Struct.CollectionTypeSchema {
  collectionName: "strapi_release_actions";
  info: {
    displayName: "Release Action";
    pluralName: "release-actions";
    singularName: "release-action";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    contentType: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    entryDocumentId: Schema.Attribute.String;
    isEntryValid: Schema.Attribute.Boolean;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::content-releases.release-action"
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    release: Schema.Attribute.Relation<"manyToOne", "plugin::content-releases.release">;
    type: Schema.Attribute.Enumeration<["publish", "unpublish"]> & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface PluginI18NLocale extends Struct.CollectionTypeSchema {
  collectionName: "i18n_locale";
  info: {
    collectionName: "locales";
    description: "";
    displayName: "Locale";
    pluralName: "locales";
    singularName: "locale";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String & Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "plugin::i18n.locale"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.SetMinMax<
        {
          max: 50;
          min: 1;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflow extends Struct.CollectionTypeSchema {
  collectionName: "strapi_workflows";
  info: {
    description: "";
    displayName: "Workflow";
    name: "Workflow";
    pluralName: "workflows";
    singularName: "workflow";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    contentTypes: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"[]">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "plugin::review-workflows.workflow"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    stageRequiredToPublish: Schema.Attribute.Relation<
      "oneToOne",
      "plugin::review-workflows.workflow-stage"
    >;
    stages: Schema.Attribute.Relation<"oneToMany", "plugin::review-workflows.workflow-stage">;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflowStage extends Struct.CollectionTypeSchema {
  collectionName: "strapi_workflows_stages";
  info: {
    description: "";
    displayName: "Stages";
    name: "Workflow Stage";
    pluralName: "workflow-stages";
    singularName: "workflow-stage";
  };
  options: {
    draftAndPublish: false;
    version: "1.1.0";
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    color: Schema.Attribute.String & Schema.Attribute.DefaultTo<"#4945FF">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::review-workflows.workflow-stage"
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String;
    permissions: Schema.Attribute.Relation<"manyToMany", "admin::permission">;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    workflow: Schema.Attribute.Relation<"manyToOne", "plugin::review-workflows.workflow">;
  };
}

export interface PluginUploadFile extends Struct.CollectionTypeSchema {
  collectionName: "files";
  info: {
    description: "";
    displayName: "File";
    pluralName: "files";
    singularName: "file";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    alternativeText: Schema.Attribute.Text;
    caption: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    ext: Schema.Attribute.String;
    focalPoint: Schema.Attribute.JSON;
    folder: Schema.Attribute.Relation<"manyToOne", "plugin::upload.folder"> &
      Schema.Attribute.Private;
    folderPath: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    formats: Schema.Attribute.JSON;
    hash: Schema.Attribute.String & Schema.Attribute.Required;
    height: Schema.Attribute.Integer;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "plugin::upload.file"> &
      Schema.Attribute.Private;
    mime: Schema.Attribute.String & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    previewUrl: Schema.Attribute.Text;
    provider: Schema.Attribute.String & Schema.Attribute.Required;
    provider_metadata: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    related: Schema.Attribute.Relation<"morphToMany">;
    size: Schema.Attribute.Decimal & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    url: Schema.Attribute.Text & Schema.Attribute.Required;
    width: Schema.Attribute.Integer;
  };
}

export interface PluginUploadFolder extends Struct.CollectionTypeSchema {
  collectionName: "upload_folders";
  info: {
    displayName: "Folder";
    pluralName: "folders";
    singularName: "folder";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    children: Schema.Attribute.Relation<"oneToMany", "plugin::upload.folder">;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    files: Schema.Attribute.Relation<"oneToMany", "plugin::upload.file">;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "plugin::upload.folder"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    parent: Schema.Attribute.Relation<"manyToOne", "plugin::upload.folder">;
    path: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    pathId: Schema.Attribute.Integer & Schema.Attribute.Required & Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsPermission extends Struct.CollectionTypeSchema {
  collectionName: "up_permissions";
  info: {
    description: "";
    displayName: "Permission";
    name: "permission";
    pluralName: "permissions";
    singularName: "permission";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "plugin::users-permissions.permission"> &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.role">;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsRole extends Struct.CollectionTypeSchema {
  collectionName: "up_roles";
  info: {
    description: "";
    displayName: "Role";
    name: "role";
    pluralName: "roles";
    singularName: "role";
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    "content-manager": {
      visible: false;
    };
    "content-type-builder": {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "plugin::users-permissions.role"> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    permissions: Schema.Attribute.Relation<"oneToMany", "plugin::users-permissions.permission">;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.String & Schema.Attribute.Unique;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    users: Schema.Attribute.Relation<"oneToMany", "plugin::users-permissions.user">;
  };
}

export interface PluginUsersPermissionsUser extends Struct.CollectionTypeSchema {
  collectionName: "up_users";
  info: {
    description: "";
    displayName: "User";
    name: "user";
    pluralName: "users";
    singularName: "user";
  };
  options: {
    draftAndPublish: false;
    timestamps: true;
  };
  attributes: {
    blocked: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    branches: Schema.Attribute.Relation<"manyToMany", "api::branch.branch">;
    confirmationToken: Schema.Attribute.String & Schema.Attribute.Private;
    confirmed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    fullName: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<"oneToMany", "plugin::users-permissions.user"> &
      Schema.Attribute.Private;
    organization: Schema.Attribute.Relation<"manyToOne", "api::organization.organization">;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    phone: Schema.Attribute.String;
    pinFailures: Schema.Attribute.Integer &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<0>;
    pinHash: Schema.Attribute.String & Schema.Attribute.Private;
    pinLockedUntil: Schema.Attribute.DateTime & Schema.Attribute.Private;
    provider: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    role: Schema.Attribute.Relation<"manyToOne", "plugin::users-permissions.role">;
    staffRole: Schema.Attribute.Enumeration<
      [
        "owner",
        "branch_manager",
        "cashier",
        "salesperson",
        "stock_keeper",
        "karigar_manager",
        "accountant",
      ]
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> & Schema.Attribute.Private;
    username: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
  };
}

declare module "@strapi/strapi" {
  export namespace Public {
    export interface ContentTypeSchemas {
      "admin::api-token": AdminApiToken;
      "admin::api-token-permission": AdminApiTokenPermission;
      "admin::permission": AdminPermission;
      "admin::role": AdminRole;
      "admin::session": AdminSession;
      "admin::transfer-token": AdminTransferToken;
      "admin::transfer-token-permission": AdminTransferTokenPermission;
      "admin::user": AdminUser;
      "api::approval.approval": ApiApprovalApproval;
      "api::audit-log.audit-log": ApiAuditLogAuditLog;
      "api::booking.booking": ApiBookingBooking;
      "api::branch.branch": ApiBranchBranch;
      "api::category.category": ApiCategoryCategory;
      "api::collection.collection": ApiCollectionCollection;
      "api::credit-note.credit-note": ApiCreditNoteCreditNote;
      "api::customer.customer": ApiCustomerCustomer;
      "api::day-close.day-close": ApiDayCloseDayClose;
      "api::design.design": ApiDesignDesign;
      "api::device.device": ApiDeviceDevice;
      "api::enquiry.enquiry": ApiEnquiryEnquiry;
      "api::estimate.estimate": ApiEstimateEstimate;
      "api::global.global": ApiGlobalGlobal;
      "api::invoice.invoice": ApiInvoiceInvoice;
      "api::item.item": ApiItemItem;
      "api::job-work.job-work": ApiJobWorkJobWork;
      "api::journal-post.journal-post": ApiJournalPostJournalPost;
      "api::location.location": ApiLocationLocation;
      "api::loyalty-entry.loyalty-entry": ApiLoyaltyEntryLoyaltyEntry;
      "api::old-gold.old-gold": ApiOldGoldOldGold;
      "api::organization.organization": ApiOrganizationOrganization;
      "api::product.product": ApiProductProduct;
      "api::rate-card.rate-card": ApiRateCardRateCard;
      "api::review.review": ApiReviewReview;
      "api::scheme-account.scheme-account": ApiSchemeAccountSchemeAccount;
      "api::scheme-payment.scheme-payment": ApiSchemePaymentSchemePayment;
      "api::scheme-plan.scheme-plan": ApiSchemePlanSchemePlan;
      "api::sequence.sequence": ApiSequenceSequence;
      "api::service-order.service-order": ApiServiceOrderServiceOrder;
      "api::stock-audit.stock-audit": ApiStockAuditStockAudit;
      "api::stock-movement.stock-movement": ApiStockMovementStockMovement;
      "api::stock-receipt.stock-receipt": ApiStockReceiptStockReceipt;
      "api::stone.stone": ApiStoneStone;
      "api::store.store": ApiStoreStore;
      "api::supplier.supplier": ApiSupplierSupplier;
      "api::transfer.transfer": ApiTransferTransfer;
      "plugin::content-releases.release": PluginContentReleasesRelease;
      "plugin::content-releases.release-action": PluginContentReleasesReleaseAction;
      "plugin::i18n.locale": PluginI18NLocale;
      "plugin::review-workflows.workflow": PluginReviewWorkflowsWorkflow;
      "plugin::review-workflows.workflow-stage": PluginReviewWorkflowsWorkflowStage;
      "plugin::upload.file": PluginUploadFile;
      "plugin::upload.folder": PluginUploadFolder;
      "plugin::users-permissions.permission": PluginUsersPermissionsPermission;
      "plugin::users-permissions.role": PluginUsersPermissionsRole;
      "plugin::users-permissions.user": PluginUsersPermissionsUser;
    }
  }
}
