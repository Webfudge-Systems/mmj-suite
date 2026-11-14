import { errors } from "@strapi/utils";
import { staffOf } from "../../stock/lib/common";
import { CUSTOMER, nextNumber, normalisePhone } from "../../sales/lib/common";
import { ENQUIRY, FRONT_ROLES, isoDate, org, person, requireRole, text, whatsappLink } from "../lib/common";

export const ENQUIRY_STATUSES = ["new", "contacted", "visit_booked", "won", "lost"] as const;
export const ENQUIRY_SOURCES = ["website", "walk_in", "phone", "whatsapp", "referral", "other"] as const;

const POPULATE = {
  customer: { select: ["id", "name", "phone"] },
  assignedTo: { select: ["id", "fullName", "username"] },
  branch: { select: ["id", "name", "code"] },
};

export function serializeEnquiry(enquiry: any) {
  const firstName = String(enquiry.name ?? "").split(" ")[0];
  return {
    id: enquiry.id,
    number: enquiry.number,
    name: enquiry.name,
    phone: enquiry.phone ?? null,
    email: enquiry.email ?? null,
    message: enquiry.message ?? null,
    source: enquiry.source,
    status: enquiry.status,
    items: Array.isArray(enquiry.items) ? enquiry.items : [],
    log: Array.isArray(enquiry.log) ? enquiry.log : [],
    followUpOn: enquiry.followUpOn ?? null,
    visitOn: enquiry.visitOn ?? null,
    lostReason: enquiry.lostReason ?? null,
    customer: enquiry.customer ? { id: enquiry.customer.id, name: enquiry.customer.name, phone: enquiry.customer.phone } : null,
    assignedTo: enquiry.assignedTo ? { id: enquiry.assignedTo.id, name: person(enquiry.assignedTo) } : null,
    branch: enquiry.branch ? { id: enquiry.branch.id, name: enquiry.branch.name } : null,
    whatsapp: enquiry.phone ? whatsappLink(enquiry.phone, `Namaste ${firstName}, this is Mukund Maid Jewellers about your enquiry ${enquiry.number}.`) : null,
    createdAt: enquiry.createdAt,
    updatedAt: enquiry.updatedAt,
  };
}

type NewEnquiry = {
  name: string;
  phone: string | null;
  email: string | null;
  message: string | null;
  source: (typeof ENQUIRY_SOURCES)[number];
  items: { code?: string; name: string; price?: number | null; url?: string | null; quantity?: number }[];
  visitOn?: string | null;
};

/**
 * Saves an enquiry and links it to the customer with the same mobile number, if
 * there is one. Used by the website (no staff member) and by the CRM.
 */
export async function createEnquiry(strapi: any, organization: { id: number; documentId: string }, input: NewEnquiry, staff?: any) {
  const phone = normalisePhone(input.phone);
  const customer = phone ? await strapi.db.query(CUSTOMER).findOne({ where: { phone, organization: { id: organization.id } }, select: ["id", "documentId"] }) : null;
  const staffLike = staff ?? { organization };
  const created = await strapi.documents(ENQUIRY).create({
    data: {
      number: await nextNumber(strapi, staffLike, "enquiry", "ENQ"),
      name: input.name,
      phone,
      email: input.email,
      message: input.message,
      source: input.source,
      status: "new",
      items: input.items,
      log: [{ at: new Date().toISOString(), by: staff ? person(staff) : "Website", text: staff ? "Enquiry added" : "Enquiry sent from the website" }],
      visitOn: input.visitOn ?? null,
      customer: customer?.documentId ?? null,
      assignedTo: staff?.documentId ?? null,
      branch: staff?.branches?.[0]?.documentId ?? null,
      organization: organization.documentId,
    },
  });
  return strapi.db.query(ENQUIRY).findOne({ where: { id: created.id }, populate: POPULATE });
}

export default ({ strapi }: { strapi: any }) => ({
  async list(ctx: any) {
    const staff = staffOf(ctx);
    const where: any = { ...org(staff) };
    if (ENQUIRY_STATUSES.includes(ctx.query.status)) where.status = ctx.query.status;
    else if (ctx.query.status === "open") where.status = { $in: ["new", "contacted", "visit_booked"] };
    if (ENQUIRY_SOURCES.includes(ctx.query.source)) where.source = ctx.query.source;
    if (Number(ctx.query.customerId)) where.customer = { id: Number(ctx.query.customerId) };
    const q = text(ctx.query.q, 60);
    if (q) where.$or = [{ number: { $containsi: q } }, { name: { $containsi: q } }, { phone: { $contains: q.replace(/\D/g, "") || q } }];
    const rows = await strapi.db.query(ENQUIRY).findMany({ where, orderBy: { createdAt: "desc" }, populate: POPULATE, limit: 300 });
    const counts: Record<string, number> = {};
    for (const status of ENQUIRY_STATUSES) counts[status] = await strapi.db.query(ENQUIRY).count({ where: { ...org(staff), status } });
    ctx.body = { data: rows.map(serializeEnquiry), meta: { counts } };
  },

  async get(ctx: any) {
    const staff = staffOf(ctx);
    const enquiry = await strapi.db.query(ENQUIRY).findOne({ where: { id: Number(ctx.params.id), ...org(staff) }, populate: POPULATE });
    if (!enquiry) throw new errors.NotFoundError("Enquiry not found.");
    ctx.body = { data: serializeEnquiry(enquiry) };
  },

  /** A walk-in, phone call or WhatsApp message entered by staff. */
  async create(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, FRONT_ROLES, "add enquiries");
    const body = ctx.request.body ?? {};
    const name = text(body.name, 120);
    if (!name) throw new errors.ValidationError("Enter the person's name.");
    if (!normalisePhone(body.phone) && !text(body.email, 120)) throw new errors.ValidationError("Enter a mobile number or an email so you can follow up.");
    const enquiry = await createEnquiry(
      strapi,
      staff.organization,
      {
        name,
        phone: body.phone ?? null,
        email: text(body.email, 120),
        message: text(body.message, 2000),
        source: ENQUIRY_SOURCES.includes(body.source) ? body.source : "walk_in",
        items: [],
        visitOn: isoDate(body.visitOn),
      },
      staff,
    );
    ctx.status = 201;
    ctx.body = { data: serializeEnquiry(enquiry) };
  },

  /** Moves an enquiry along, records a follow-up note, or links it to a customer. */
  async update(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, FRONT_ROLES, "update enquiries");
    const body = ctx.request.body ?? {};
    const enquiry = await strapi.db.query(ENQUIRY).findOne({ where: { id: Number(ctx.params.id), ...org(staff) }, populate: POPULATE });
    if (!enquiry) throw new errors.NotFoundError("Enquiry not found.");

    const data: any = {};
    const notes: string[] = [];
    if (body.status !== undefined && body.status !== enquiry.status) {
      if (!ENQUIRY_STATUSES.includes(body.status)) throw new errors.ValidationError("Choose a status.");
      if (body.status === "lost" && !text(body.lostReason, 200)) throw new errors.ValidationError("Write why the enquiry was lost.");
      data.status = body.status;
      notes.push(`Status: ${String(body.status).replace("_", " ")}`);
      if (body.status === "lost") data.lostReason = text(body.lostReason, 200);
    }
    if (body.followUpOn !== undefined) {
      data.followUpOn = isoDate(body.followUpOn);
      if (data.followUpOn) notes.push(`Follow up on ${data.followUpOn}`);
    }
    if (body.visitOn !== undefined) {
      data.visitOn = isoDate(body.visitOn);
      if (data.visitOn) notes.push(`Visit on ${data.visitOn}`);
    }
    if (body.assignedToId !== undefined) {
      const user = body.assignedToId
        ? await strapi.db.query("plugin::users-permissions.user").findOne({ where: { id: Number(body.assignedToId), organization: { id: staff.organization.id } } })
        : null;
      data.assignedTo = user?.id ?? null;
      notes.push(user ? `Assigned to ${person(user)}` : "Unassigned");
    }
    if (body.customerId !== undefined) {
      const customer = body.customerId ? await strapi.db.query(CUSTOMER).findOne({ where: { id: Number(body.customerId), ...org(staff) } }) : null;
      data.customer = customer?.id ?? null;
      if (customer) notes.push(`Linked to customer ${customer.name}`);
    }
    const note = text(body.note, 1000);
    if (note) notes.push(note);
    if (!notes.length && !Object.keys(data).length) throw new errors.ValidationError("Nothing to change.");

    data.log = [...(Array.isArray(enquiry.log) ? enquiry.log : []), ...(notes.length ? [{ at: new Date().toISOString(), by: person(staff), text: notes.join(". ") }] : [])];
    await strapi.db.query(ENQUIRY).update({ where: { id: enquiry.id }, data });
    const saved = await strapi.db.query(ENQUIRY).findOne({ where: { id: enquiry.id }, populate: POPULATE });
    ctx.body = { data: serializeEnquiry(saved) };
  },
});
