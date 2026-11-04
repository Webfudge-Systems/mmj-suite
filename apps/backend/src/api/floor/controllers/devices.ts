import { errors } from "@strapi/utils";
import { checkPin, newDeviceToken, pairingCode, rateLimiter, sha256 } from "../../../utils/secrets";
import { requireBranch } from "../../../utils/staff";
import { staffOf } from "../../stock/lib/common";
import { DEVICE, MANAGER_ROLES, branchRef, person } from "../../sales/lib/common";

const USER = "plugin::users-permissions.user";
const PAIRING_MINUTES = 15;
const PIN_ATTEMPTS = 5;
const PIN_LOCK_MINUTES = 10;

const pairLimit = rateLimiter(10, 10 * 60 * 1000);
const pinLimit = rateLimiter(30, 10 * 60 * 1000);

function serialize(device: any) {
  return {
    id: device.id,
    name: device.name,
    isActive: device.isActive !== false,
    paired: !!device.tokenHash,
    pairingExpiresAt: device.tokenHash ? null : device.pairingExpiresAt ?? null,
    lastSeenAt: device.lastSeenAt ?? null,
    addedBy: person(device.addedBy),
    branch: branchRef(device.branch),
  };
}

/** The paired tablet behind a request, from its X-Device-Token header, or an error. */
export async function deviceFromRequest(strapi: any, ctx: any) {
  const token = ctx.request.header["x-device-token"];
  if (typeof token !== "string" || token.length < 20) throw new errors.UnauthorizedError("This tablet is not paired. Ask the branch manager for a pairing code.");
  const device = await strapi.db.query(DEVICE).findOne({
    where: { tokenHash: sha256(token), isActive: { $ne: false } },
    populate: { branch: true, organization: true },
  });
  if (!device) throw new errors.UnauthorizedError("This tablet has been unpaired. Ask the branch manager for a new pairing code.");
  await strapi.db.query(DEVICE).update({ where: { id: device.id }, data: { lastSeenAt: new Date().toISOString() } });
  return device;
}

/** Session cookie options, matching what the users-permissions plugin sets on password sign-in. */
function refreshCookie(strapi: any) {
  const sessions = strapi.config.get("plugin::users-permissions.sessions") ?? {};
  return {
    name: sessions.cookie?.name || "strapi_up_refresh",
    options: {
      httpOnly: true,
      secure: typeof sessions.cookie?.secure === "boolean" ? sessions.cookie.secure : process.env.NODE_ENV === "production",
      sameSite: sessions.cookie?.sameSite ?? "lax",
      path: sessions.cookie?.path ?? "/",
      domain: sessions.cookie?.domain,
      maxAge: sessions.cookie?.maxAge,
      overwrite: true,
    },
  };
}

export default ({ strapi }: { strapi: any }) => ({
  /** Creates a tablet and a six-digit code to type on it. The code works once, for 15 minutes. */
  async create(ctx: any) {
    const staff = staffOf(ctx);
    if (!MANAGER_ROLES.includes(staff.staffRole)) throw new errors.ForbiddenError("Only the owner or a branch manager can pair tablets.");
    const body = ctx.request.body ?? {};
    const branch = await requireBranch(strapi, staff, body.branchId);
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 60) : "Showroom tablet";
    const code = pairingCode();
    const device = await strapi.documents(DEVICE).create({
      data: {
        name,
        pairingCodeHash: sha256(code),
        pairingExpiresAt: new Date(Date.now() + PAIRING_MINUTES * 60000).toISOString(),
        isActive: true,
        addedBy: staff.documentId,
        branch: branch.documentId,
        organization: staff.organization.documentId,
      },
    });
    const saved = await strapi.db.query(DEVICE).findOne({ where: { id: device.id }, populate: { branch: true, addedBy: true } });
    ctx.status = 201;
    ctx.body = { data: { ...serialize(saved), pairingCode: code } };
  },

  async list(ctx: any) {
    const staff = staffOf(ctx);
    if (!MANAGER_ROLES.includes(staff.staffRole)) throw new errors.ForbiddenError("Only the owner or a branch manager can see tablets.");
    const rows = await strapi.db.query(DEVICE).findMany({
      where: { organization: { id: staff.organization.id }, isActive: { $ne: false } },
      orderBy: { createdAt: "desc" },
      populate: { branch: true, addedBy: true },
    });
    ctx.body = { data: rows.map(serialize) };
  },

  async revoke(ctx: any) {
    const staff = staffOf(ctx);
    if (!MANAGER_ROLES.includes(staff.staffRole)) throw new errors.ForbiddenError("Only the owner or a branch manager can unpair tablets.");
    const device = await strapi.db.query(DEVICE).findOne({ where: { id: Number(ctx.params.id), organization: { id: staff.organization.id } }, populate: { branch: true } });
    if (!device) throw new errors.NotFoundError("Tablet not found.");
    await requireBranch(strapi, staff, device.branch.id);
    await strapi.db.query(DEVICE).update({ where: { id: device.id }, data: { isActive: false, tokenHash: null, pairingCodeHash: null } });
    ctx.body = { data: { ok: true } };
  },

  /** Called by the tablet with the code shown in the Back Office. Returns the tablet's secret token once. */
  async pair(ctx: any) {
    if (!pairLimit(ctx.request.ip)) throw new errors.RateLimitError("Too many attempts. Wait ten minutes and try again.");
    const code = String(ctx.request.body?.code ?? "").replace(/\D/g, "");
    if (code.length !== 6) throw new errors.ValidationError("Type the six-digit code from the Back Office.");
    const device = await strapi.db.query(DEVICE).findOne({
      where: { pairingCodeHash: sha256(code), pairingExpiresAt: { $gt: new Date().toISOString() }, isActive: { $ne: false } },
      populate: { branch: true, organization: true },
    });
    if (!device) throw new errors.ValidationError("That code is wrong or has expired. Create a new one in the Back Office.");
    const token = newDeviceToken();
    await strapi.db.query(DEVICE).update({
      where: { id: device.id },
      data: { tokenHash: sha256(token), pairingCodeHash: null, pairingExpiresAt: null, lastSeenAt: new Date().toISOString() },
    });
    ctx.body = { data: { token, device: { id: device.id, name: device.name, branch: branchRef(device.branch), organization: device.organization?.name } } };
  },

  /** The tablet's branch and the people who can sign in on it with a PIN. */
  async whoCanSignIn(ctx: any) {
    const device = await deviceFromRequest(strapi, ctx);
    const people = await strapi.db.query(USER).findMany({
      where: {
        organization: { id: device.organization.id },
        blocked: { $ne: true },
        pinHash: { $notNull: true },
        $or: [{ staffRole: "owner" }, { branches: { id: device.branch.id } }],
      },
      orderBy: { fullName: "asc" },
    });
    ctx.body = {
      data: {
        device: { id: device.id, name: device.name, branch: branchRef(device.branch), organization: device.organization?.name },
        people: people.map((user: any) => ({ id: user.id, name: user.fullName || user.username, staffRole: user.staffRole })),
      },
    };
  },

  /** PIN sign-in on a paired tablet. Five wrong PINs lock the person out for ten minutes. */
  async pinSignIn(ctx: any) {
    const device = await deviceFromRequest(strapi, ctx);
    if (!pinLimit(`${device.id}:${ctx.request.ip}`)) throw new errors.RateLimitError("Too many attempts on this tablet. Wait ten minutes.");
    const userId = Number(ctx.request.body?.userId);
    const pin = String(ctx.request.body?.pin ?? "");
    const user = await strapi.db.query(USER).findOne({
      where: { id: userId, organization: { id: device.organization.id }, blocked: { $ne: true } },
      populate: { branches: { select: ["id"] } },
    });
    const worksHere = user && (user.staffRole === "owner" || (user.branches ?? []).some((branch: any) => branch.id === device.branch.id));
    if (!user || !worksHere || !user.pinHash) throw new errors.ValidationError("Choose your name and type your PIN.");
    if (user.pinLockedUntil && new Date(user.pinLockedUntil) > new Date()) {
      throw new errors.ForbiddenError("Too many wrong PINs. Wait ten minutes or ask the manager to reset it.");
    }
    if (!checkPin(pin, user.pinHash)) {
      const failures = Number(user.pinFailures ?? 0) + 1;
      const lock = failures >= PIN_ATTEMPTS;
      await strapi.db.query(USER).update({
        where: { id: user.id },
        data: { pinFailures: lock ? 0 : failures, pinLockedUntil: lock ? new Date(Date.now() + PIN_LOCK_MINUTES * 60000).toISOString() : null },
      });
      throw new errors.ValidationError(lock ? "Too many wrong PINs. Wait ten minutes." : `Wrong PIN. ${PIN_ATTEMPTS - failures} tries left.`);
    }
    await strapi.db.query(USER).update({ where: { id: user.id }, data: { pinFailures: 0, pinLockedUntil: null } });

    // The same kind of session a password sign-in creates, tied to this tablet.
    const sessions = strapi.sessionManager("users-permissions");
    const refresh = await sessions.generateRefreshToken(String(user.id), `device-${device.id}`, { type: "refresh" });
    const access = await sessions.generateAccessToken(refresh.token);
    if ("error" in access) throw new errors.ApplicationError("Could not start the session.");
    const cookie = refreshCookie(strapi);
    ctx.cookies.set(cookie.name, refresh.token, cookie.options);
    ctx.body = { jwt: access.token };
  },
});
