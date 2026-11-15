import { errors } from "@strapi/utils";
import { requireBranch } from "../../../utils/staff";
import { staffOf } from "../../stock/lib/common";
import { nextNumber } from "../../sales/lib/common";
import { JOB_WORK, MANAGER_ROLES, STOCK_ROLES, fineWeight, isoDate, logEntry, money, org, person, requireRole, round3, text } from "../lib/common";

const SUPPLIER = "api::supplier.supplier";
const RECEIPT = "api::stock-receipt.stock-receipt";
const ITEM = "api::item.item";

const POPULATE = {
  karigar: { select: ["id", "name", "phone", "kind"] },
  branch: { select: ["id", "name", "code"] },
  by: { select: ["id", "fullName", "username"] },
};

type Issue = { at: string; by: string | null; purity: string; grossWeight: number; fineWeight: number; note: string | null };

/**
 * The fine-metal account with the karigar: metal given, metal that came back in
 * finished pieces, the wastage allowed on that, and what is left with the karigar.
 */
async function account(strapi: any, job: any) {
  const issues: Issue[] = Array.isArray(job.issues) ? job.issues : [];
  const receipts = await strapi.db.query(RECEIPT).findMany({ where: { jobWork: { id: job.id } }, select: ["id", "number", "createdAt"] });
  const items = receipts.length
    ? await strapi.db.query(ITEM).findMany({
        where: { receipt: { id: { $in: receipts.map((receipt: any) => receipt.id) } } },
        select: ["id", "tagNumber", "purity", "grossWeight", "netWeight", "status"],
        populate: { design: { select: ["id", "code", "name"] }, receipt: { select: ["id", "number"] } },
      })
    : [];
  const issuedFine = round3(issues.reduce((sum, issue) => sum + Number(issue.fineWeight), 0));
  const receivedFine = round3(items.reduce((sum: number, item: any) => sum + fineWeight(item.purity, Number(item.netWeight)), 0));
  const wastageAllowed = round3((receivedFine * Number(job.wastagePercent ?? 0)) / 100);
  return {
    issuedGross: round3(issues.reduce((sum, issue) => sum + Number(issue.grossWeight), 0)),
    issuedFine,
    receivedPieces: items.length,
    receivedNet: round3(items.reduce((sum: number, item: any) => sum + Number(item.netWeight), 0)),
    receivedFine,
    wastageAllowed,
    /** Fine metal still with the karigar. Negative means the shop owes the karigar metal. */
    balanceFine: round3(issuedFine - receivedFine - wastageAllowed),
    receipts: receipts.map((receipt: any) => ({ id: receipt.id, number: receipt.number, createdAt: receipt.createdAt })),
    pieces: items.map((item: any) => ({
      id: item.id,
      tagNumber: item.tagNumber,
      purity: item.purity,
      grossWeight: Number(item.grossWeight),
      netWeight: Number(item.netWeight),
      fineWeight: fineWeight(item.purity, Number(item.netWeight)),
      status: item.status,
      design: item.design ? { id: item.design.id, code: item.design.code, name: item.design.name } : null,
      receipt: item.receipt?.number ?? null,
    })),
  };
}

function serialize(job: any) {
  return {
    id: job.id,
    number: job.number,
    status: job.status,
    description: job.description ?? null,
    dueOn: job.dueOn ?? null,
    wastagePercent: Number(job.wastagePercent ?? 0),
    labourCharge: job.labourCharge === null || job.labourCharge === undefined ? null : Number(job.labourCharge),
    issues: (Array.isArray(job.issues) ? job.issues : []) as Issue[],
    log: Array.isArray(job.log) ? job.log : [],
    closedAt: job.closedAt ?? null,
    karigar: job.karigar ? { id: job.karigar.id, name: job.karigar.name, phone: job.karigar.phone ?? null } : null,
    branch: job.branch ? { id: job.branch.id, name: job.branch.name, code: job.branch.code } : null,
    by: person(job.by),
    createdAt: job.createdAt,
  };
}

async function load(strapi: any, staff: any, id: unknown) {
  const job = await strapi.db.query(JOB_WORK).findOne({ where: { id: Number(id), ...org(staff) }, populate: POPULATE });
  if (!job) throw new errors.NotFoundError("Job not found.");
  return job;
}

function parseIssue(body: any, staff: any): Issue {
  const purity = String(body?.purity ?? "").toUpperCase();
  const grossWeight = round3(Number(body?.grossWeight));
  if (!(grossWeight > 0)) throw new errors.ValidationError("Enter the weight of metal given.");
  return { at: new Date().toISOString(), by: staff.fullName || staff.username, purity, grossWeight, fineWeight: fineWeight(purity, grossWeight), note: text(body?.note, 300) };
}

export default ({ strapi }: { strapi: any }) => ({
  async list(ctx: any) {
    const staff = staffOf(ctx);
    const where: any = { ...org(staff) };
    if (ctx.query.status === "open" || ctx.query.status === "closed") where.status = ctx.query.status;
    if (Number(ctx.query.karigarId)) where.karigar = { id: Number(ctx.query.karigarId) };
    const jobs = await strapi.db.query(JOB_WORK).findMany({ where, orderBy: { createdAt: "desc" }, populate: POPULATE, limit: 300 });
    const data = [];
    for (const job of jobs) {
      const totals = await account(strapi, job);
      data.push({ ...serialize(job), totals: { issuedFine: totals.issuedFine, receivedFine: totals.receivedFine, receivedPieces: totals.receivedPieces, balanceFine: totals.balanceFine } });
    }
    ctx.body = { data };
  },

  async get(ctx: any) {
    const staff = staffOf(ctx);
    const job = await load(strapi, staff, ctx.params.id);
    ctx.body = { data: { ...serialize(job), account: await account(strapi, job) } };
  },

  /** Opens a job with a karigar, usually with the first metal handed over. */
  async create(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, STOCK_ROLES, "give work to karigars");
    const body = ctx.request.body ?? {};
    const branch = await requireBranch(strapi, staff, body.branchId);
    const karigar = await strapi.db.query(SUPPLIER).findOne({ where: { id: Number(body.karigarId), ...org(staff) } });
    if (!karigar) throw new errors.ValidationError("Choose the karigar.");
    const wastagePercent = Number(body.wastagePercent ?? 0);
    if (!(wastagePercent >= 0 && wastagePercent <= 20)) throw new errors.ValidationError("Wastage is a percentage between 0 and 20.");
    const issues = body.issue ? [parseIssue(body.issue, staff)] : [];
    const created = await strapi.documents(JOB_WORK).create({
      data: {
        number: await nextNumber(strapi, staff, "job-work", "JW"),
        status: "open",
        description: text(body.description, 2000),
        dueOn: isoDate(body.dueOn),
        wastagePercent,
        issues,
        log: [logEntry(staff, issues.length ? `Job opened; ${issues[0].grossWeight} g ${issues[0].purity} given` : "Job opened")],
        karigar: karigar.documentId,
        by: staff.documentId,
        branch: branch.documentId,
        organization: staff.organization.documentId,
      },
    });
    ctx.status = 201;
    ctx.body = { data: serialize(await load(strapi, staff, created.id)) };
  },

  /** Records more metal handed to the karigar. */
  async issue(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, STOCK_ROLES, "give metal to karigars");
    const job = await load(strapi, staff, ctx.params.id);
    if (job.status !== "open") throw new errors.ValidationError(`${job.number} is closed.`);
    const issue = parseIssue(ctx.request.body, staff);
    await strapi.db.query(JOB_WORK).update({
      where: { id: job.id },
      data: {
        issues: [...(Array.isArray(job.issues) ? job.issues : []), issue],
        log: [...(Array.isArray(job.log) ? job.log : []), logEntry(staff, `${issue.grossWeight} g ${issue.purity} given (${issue.fineWeight} g fine)${issue.note ? `: ${issue.note}` : ""}`)],
      },
    });
    const updated = await load(strapi, staff, job.id);
    ctx.body = { data: { ...serialize(updated), account: await account(strapi, updated) } };
  },

  async update(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, STOCK_ROLES, "change karigar jobs");
    const job = await load(strapi, staff, ctx.params.id);
    const body = ctx.request.body ?? {};
    const data: any = {};
    const notes: string[] = [];
    if (body.description !== undefined) data.description = text(body.description, 2000);
    if (body.dueOn !== undefined) {
      data.dueOn = isoDate(body.dueOn);
      notes.push(`Due date ${data.dueOn ?? "cleared"}`);
    }
    if (body.wastagePercent !== undefined) {
      const value = Number(body.wastagePercent);
      if (!(value >= 0 && value <= 20)) throw new errors.ValidationError("Wastage is a percentage between 0 and 20.");
      data.wastagePercent = value;
      notes.push(`Wastage set to ${value}%`);
    }
    const note = text(body.note, 500);
    if (note) notes.push(note);
    if (notes.length) data.log = [...(Array.isArray(job.log) ? job.log : []), logEntry(staff, notes.join(". "))];
    await strapi.db.query(JOB_WORK).update({ where: { id: job.id }, data });
    const updated = await load(strapi, staff, job.id);
    ctx.body = { data: { ...serialize(updated), account: await account(strapi, updated) } };
  },

  /** Settles and closes the job: labour charge agreed, metal balance noted. */
  async close(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, MANAGER_ROLES, "settle karigar jobs");
    const job = await load(strapi, staff, ctx.params.id);
    if (job.status !== "open") throw new errors.ValidationError(`${job.number} is already closed.`);
    const body = ctx.request.body ?? {};
    const labourCharge = body.labourCharge === undefined || body.labourCharge === "" ? null : money(body.labourCharge);
    if (labourCharge !== null && !(labourCharge >= 0)) throw new errors.ValidationError("Labour charge cannot be negative.");
    const totals = await account(strapi, job);
    const settlement = text(body.note, 500);
    const balance = totals.balanceFine === 0 ? "nothing outstanding" : totals.balanceFine > 0 ? `${totals.balanceFine} g fine still with the karigar` : `${-totals.balanceFine} g fine owed to the karigar`;
    await strapi.db.query(JOB_WORK).update({
      where: { id: job.id },
      data: {
        status: "closed",
        labourCharge,
        closedAt: new Date().toISOString(),
        log: [...(Array.isArray(job.log) ? job.log : []), logEntry(staff, `Closed: ${balance}${labourCharge !== null ? `; labour ₹${labourCharge}` : ""}${settlement ? `. ${settlement}` : ""}`)],
      },
    });
    const updated = await load(strapi, staff, job.id);
    ctx.body = { data: { ...serialize(updated), account: await account(strapi, updated) } };
  },
});
