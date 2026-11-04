import type { Core } from "@strapi/strapi";

/** Business records whose every create, update and delete is written to the audit log. */
const AUDITED = new Set([
  "api::organization.organization",
  "api::branch.branch",
  "api::rate-card.rate-card",
  "api::category.category",
  "api::design.design",
  "api::supplier.supplier",
  "api::location.location",
  "plugin::users-permissions.user",
]);

const ACTIONS = new Set(["create", "update", "delete", "publish", "unpublish"]);

const SECRET_FIELDS = new Set(["password", "resetPasswordToken", "confirmationToken"]);

function scrub(data: unknown): unknown {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data ?? null;
  return Object.fromEntries(
    Object.entries(data as Record<string, unknown>).map(([key, value]) => [
      key,
      SECRET_FIELDS.has(key) ? "[hidden]" : value,
    ]),
  );
}

/** Works out who made the change from the current request, if there is one. */
function actorOf(strapi: Core.Strapi) {
  const ctx: any = strapi.requestContext.get();
  const user = ctx?.state?.user;
  const strategy = ctx?.state?.auth?.strategy?.name;
  const ip = ctx?.request?.ip ?? null;

  if (!user) return { actorType: "system" as const, actorLabel: "System", actor: null, ip };
  if (strategy === "admin") {
    return { actorType: "admin" as const, actorLabel: `Admin panel: ${user.email}`, actor: null, ip };
  }
  return {
    actorType: "staff" as const,
    actorLabel: user.fullName || user.username || user.email,
    actor: user.id,
    ip,
  };
}

async function organizationOf(strapi: Core.Strapi, uid: string, entry: any): Promise<number | null> {
  if (!entry?.id) return null;
  if (uid === "api::organization.organization") return entry.id;
  const row = await strapi.db
    .query(uid as any)
    .findOne({ where: { id: entry.id }, populate: { organization: true } });
  return row?.organization?.id ?? null;
}

export function registerAuditLog(strapi: Core.Strapi) {
  strapi.documents.use(async (context: any, next: () => Promise<any>) => {
    if (!AUDITED.has(context.uid) || !ACTIONS.has(context.action)) return next();

    const result = await next();

    try {
      const who = actorOf(strapi);
      const entry = Array.isArray(result?.entries) ? result.entries[0] : result;
      const entityId = String(entry?.documentId ?? context.params?.documentId ?? "");
      const name = context.uid.split(".").pop();

      await strapi.db.query("api::audit-log.audit-log").create({
        data: {
          action: context.action,
          entityType: context.uid,
          entityId,
          summary: `${who.actorLabel}: ${context.action} ${name} ${entityId}`.trim(),
          changes: scrub(context.params?.data),
          actorType: who.actorType,
          actorLabel: who.actorLabel,
          ip: who.ip,
          actor: who.actor,
          organization: await organizationOf(strapi, context.uid, entry),
        },
      });
    } catch (error) {
      // A failed audit write must never undo the change itself, but it must be visible.
      strapi.log.error(`Audit log write failed for ${context.uid}: ${(error as Error).message}`);
    }

    return result;
  });
}
