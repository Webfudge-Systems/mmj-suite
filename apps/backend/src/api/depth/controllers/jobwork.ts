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

/** One handover to the karigar: metal (counted in fine weight) or stones (counted by pieces and weight). Older entries have no kind and are metal. */
type Issue = {
  at: string;
  by: string | null;
  kind?: "metal" | "stone";
  purity?: string;
  grossWeight?: number;
  fineWeight?: number;
  name?: string;
  pieces?: number;
  weight?: number;
  unit?: "ct" | "g";
  note: string | null;
};

const METAL_OF: Record<string, "gold" | "silver" | "platinum"> = { "24KT": "gold", "22KT": "gold", "18KT": "gold", "14KT": "gold", "950PT": "platinum", "999": "silver", "925": "silver" };
const isMetal = (issue: Issue) => issue.kind !== "stone";
const metalOf = (purity: string | undefined) => METAL_OF[String(purity)] ?? "gold";

function describe(issue: Issue) {
  if (isMetal(issue)) return `${issue.grossWeight} g ${issue.purity} (${issue.fineWeight} g fine)`;
  return `${issue.pieces ? `${issue.pieces} pcs ` : ""}${issue.name}${issue.weight ? `, ${issue.weight} ${issue.unit}` : ""}`;
}

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
        select: ["id", "tagNumber", "purity", "grossWeight", "netWeight", "stoneWeight", "status"],
        populate: { design: { select: ["id", "code", "name"] }, receipt: { select: ["id", "number"] } },
      })
    : [];
  const wastage = Number(job.wastagePercent ?? 0);

  // Each metal keeps its own fine balance: gold and silver are never added together.
  const metals = new Map<string, { metal: string; issuedGross: number; issuedFine: number; receivedPieces: number; receivedNet: number; receivedFine: number }>();
  const slot = (metal: string) => {
    if (!metals.has(metal)) metals.set(metal, { metal, issuedGross: 0, issuedFine: 0, receivedPieces: 0, receivedNet: 0, receivedFine: 0 });
    return metals.get(metal)!;
  };
  for (const issue of issues.filter(isMetal)) {
    const entry = slot(metalOf(issue.purity));
    entry.issuedGross += Number(issue.grossWeight ?? 0);
    entry.issuedFine += Number(issue.fineWeight ?? 0);
  }
  for (const item of items) {
    const entry = slot(metalOf(item.purity));
    entry.receivedPieces += 1;
    entry.receivedNet += Number(item.netWeight);
    entry.receivedFine += fineWeight(item.purity, Number(item.netWeight));
  }
  const order = ["gold", "silver", "platinum"];
  const byMetal = [...metals.values()]
    .map((entry) => {
      const receivedFine = round3(entry.receivedFine);
      const wastageAllowed = round3((receivedFine * wastage) / 100);
      const issuedFine = round3(entry.issuedFine);
      return { metal: entry.metal, issuedGross: round3(entry.issuedGross), issuedFine, receivedPieces: entry.receivedPieces, receivedNet: round3(entry.receivedNet), receivedFine, wastageAllowed, balanceFine: round3(issuedFine - receivedFine - wastageAllowed) };
    })
    .sort((x, y) => order.indexOf(x.metal) - order.indexOf(y.metal));
  // The headline figures are the job's main metal: gold whenever gold is involved.
  const main = byMetal[0] ?? { metal: "gold", issuedGross: 0, issuedFine: 0, receivedPieces: 0, receivedNet: 0, receivedFine: 0, wastageAllowed: 0, balanceFine: 0 };

  const stones = new Map<string, { name: string; unit: string; pieces: number; weight: number }>();
  for (const issue of issues.filter((entry) => !isMetal(entry))) {
    const key = `${String(issue.name).toLowerCase()}|${issue.unit}`;
    const entry = stones.get(key) ?? { name: String(issue.name), unit: String(issue.unit ?? "ct"), pieces: 0, weight: 0 };
    entry.pieces += Number(issue.pieces ?? 0);
    entry.weight = round3(entry.weight + Number(issue.weight ?? 0));
    stones.set(key, entry);
  }

  return {
    metal: main.metal,
    issuedGross: main.issuedGross,
    issuedFine: main.issuedFine,
    receivedPieces: items.length,
    receivedNet: round3(items.reduce((sum: number, item: any) => sum + Number(item.netWeight), 0)),
    receivedFine: main.receivedFine,
    wastageAllowed: main.wastageAllowed,
    /** Fine metal of the main metal still with the karigar. Negative means the shop owes the karigar metal. */
    balanceFine: main.balanceFine,
    byMetal,
    stonesGiven: [...stones.values()],
    stoneWeightBack: round3(items.reduce((sum: number, item: any) => sum + Number(item.stoneWeight ?? 0), 0)),
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
  const base = { at: new Date().toISOString(), by: staff.fullName || staff.username, note: text(body?.note, 300) };
  if (body?.kind === "stone") {
    const name = text(body?.name, 80);
    if (!name) throw new errors.ValidationError("Name the stones given, like Ruby or CZ.");
    const pieces = Math.round(Number(body?.pieces || 0));
    const weight = round3(Number(body?.weight || 0));
    if (pieces < 0 || weight < 0) throw new errors.ValidationError("Stone counts and weights cannot be negative.");
    if (!(pieces > 0) && !(weight > 0)) throw new errors.ValidationError(`Enter how many ${name} were given, or their weight.`);
    return { ...base, kind: "stone", name, pieces: pieces > 0 ? pieces : 0, weight: weight > 0 ? weight : 0, unit: body?.unit === "g" ? "g" : "ct" };
  }
  const purity = String(body?.purity ?? "").toUpperCase();
  const grossWeight = round3(Number(body?.grossWeight));
  if (!(grossWeight > 0)) throw new errors.ValidationError("Enter the weight of metal given.");
  return { ...base, kind: "metal", purity, grossWeight, fineWeight: fineWeight(purity, grossWeight) };
}

/** Several lines at once as `issues: [...]`, or a single line as `issue`. */
function parseIssues(body: any, staff: any): Issue[] {
  const raw = Array.isArray(body?.issues) ? body.issues : body?.issue ? [body.issue] : [];
  if (raw.length > 30) throw new errors.ValidationError("Record at most 30 lines at a time.");
  return raw.map((line: any) => parseIssue(line, staff));
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
      data.push({ ...serialize(job), totals: { metal: totals.metal, issuedFine: totals.issuedFine, receivedFine: totals.receivedFine, receivedPieces: totals.receivedPieces, balanceFine: totals.balanceFine } });
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
    const issues = parseIssues(body, staff);
    const created = await strapi.documents(JOB_WORK).create({
      data: {
        number: await nextNumber(strapi, staff, "job-work", "JW"),
        status: "open",
        description: text(body.description, 2000),
        dueOn: isoDate(body.dueOn),
        wastagePercent,
        issues,
        log: [logEntry(staff, issues.length ? `Job opened; given ${issues.map(describe).join(", ")}` : "Job opened")],
        karigar: karigar.documentId,
        by: staff.documentId,
        branch: branch.documentId,
        organization: staff.organization.documentId,
      },
    });
    ctx.status = 201;
    ctx.body = { data: serialize(await load(strapi, staff, created.id)) };
  },

  /** Records more metal or stones handed to the karigar, one or several lines at once. */
  async issue(ctx: any) {
    const staff = staffOf(ctx);
    requireRole(staff, STOCK_ROLES, "give metal to karigars");
    const job = await load(strapi, staff, ctx.params.id);
    if (job.status !== "open") throw new errors.ValidationError(`${job.number} is closed.`);
    const body = ctx.request.body ?? {};
    const added = Array.isArray(body.issues) || body.issue ? parseIssues(body, staff) : [parseIssue(body, staff)];
    if (!added.length) throw new errors.ValidationError("Add at least one line of metal or stones.");
    const notes = added.map((issue) => `${describe(issue)}${issue.note ? `: ${issue.note}` : ""}`);
    await strapi.db.query(JOB_WORK).update({
      where: { id: job.id },
      data: {
        issues: [...(Array.isArray(job.issues) ? job.issues : []), ...added],
        log: [...(Array.isArray(job.log) ? job.log : []), logEntry(staff, `Given ${notes.join("; ")}`)],
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
    const balance = totals.byMetal.length
      ? totals.byMetal
          .map((entry) => (entry.balanceFine === 0 ? `${entry.metal} square` : entry.balanceFine > 0 ? `${entry.balanceFine} g fine ${entry.metal} still with the karigar` : `${-entry.balanceFine} g fine ${entry.metal} owed to the karigar`))
          .join(", ")
      : "nothing outstanding";
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
