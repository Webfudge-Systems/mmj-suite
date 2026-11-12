import type { Core } from "@strapi/strapi";
import { createPieces, type PieceInput } from "../api/stock/lib/items";
import { reserveSequence } from "../utils/sequence";
import type { Staff } from "../utils/staff";

/**
 * Demo stock for trying the suite: trays, two suppliers, ten designs, about
 * thirty tagged pieces and four customers. Runs on start-up only when
 * SEED_DEMO_DATA=true, and only once (it stops if the demo supplier exists).
 *
 * Everything is labelled so it is easy to spot and clear before go-live:
 * design numbers start DEMO-, suppliers and customers start "Demo", and the
 * goods receipt has bill number DEMO-DATA. It creates no estimates or
 * invoices, so no GST invoice numbers are used. Prices come from the rate
 * already published, so no rate is changed.
 */

const DEMO_SUPPLIER = "Demo – Shree Ornaments, Mumbai";
const DEMO_KARIGAR = "Demo – Ramesh Karigar, Rahuri";

type Making = { type: "per_gram" | "percent" | "fixed"; value: number };

const DESIGNS: { code: string; name: string; category: string; metal: "gold" | "silver"; purity: string; making: Making; weights: number[]; tray: string }[] = [
  { code: "DEMO-01", name: "Lakshmi Temple Necklace", category: "necklaces", metal: "gold", purity: "22KT", making: { type: "percent", value: 12 }, weights: [38.42, 41.1, 36.85], tray: "T1" },
  { code: "DEMO-02", name: "Ghungaru Jhumka", category: "earrings", metal: "gold", purity: "22KT", making: { type: "per_gram", value: 650 }, weights: [6.21, 5.88, 6.54, 7.02], tray: "T2" },
  { code: "DEMO-03", name: "Classic Gold Kada", category: "bangles", metal: "gold", purity: "22KT", making: { type: "per_gram", value: 450 }, weights: [20.5, 22.14, 19.86], tray: "T3" },
  { code: "DEMO-04", name: "Floral Cocktail Ring", category: "rings", metal: "gold", purity: "18KT", making: { type: "per_gram", value: 900 }, weights: [4.12, 3.86, 4.48], tray: "T2" },
  { code: "DEMO-05", name: "Daily Wear Mangalsutra", category: "mangalsutra", metal: "gold", purity: "22KT", making: { type: "per_gram", value: 550 }, weights: [12.3, 10.95, 14.2], tray: "T1" },
  { code: "DEMO-06", name: "Rope Chain", category: "chains", metal: "gold", purity: "22KT", making: { type: "per_gram", value: 380 }, weights: [8.04, 10.12, 15.6], tray: "T4" },
  { code: "DEMO-07", name: "Om Pendant", category: "pendants", metal: "gold", purity: "22KT", making: { type: "fixed", value: 1200 }, weights: [2.35, 2.61], tray: "T4" },
  { code: "DEMO-08", name: "Ghungroo Silver Payal", category: "anklets", metal: "silver", purity: "925", making: { type: "per_gram", value: 25 }, weights: [30.2, 28.75, 34.1], tray: "T1" },
  { code: "DEMO-09", name: "Maharashtrian Nath", category: "nosepins", metal: "gold", purity: "22KT", making: { type: "fixed", value: 800 }, weights: [3.1, 2.84], tray: "T3" },
  { code: "DEMO-10", name: "Lakshmi Gold Coin 10 g", category: "coins", metal: "gold", purity: "24KT", making: { type: "fixed", value: 500 }, weights: [10, 10, 10], tray: "T4" },
];

/** Showcases and counters with their trays. Silver designs go to the silver counter. */
const PLACES = [
  { code: "GS", name: "Demo gold showcase", kind: "showcase", trays: ["T1", "T2", "T3", "T4"] },
  { code: "SC", name: "Demo silver counter", kind: "counter", trays: ["T1"] },
];

const CUSTOMERS = [
  { name: "Demo – Priya Patil", phone: "9000000001", city: "Rahuri" },
  { name: "Demo – Sanjay Kulkarni", phone: "9000000002", city: "Ahmednagar" },
  { name: "Demo – Meena Shinde", phone: "9000000003", city: "Rahuri" },
  { name: "Demo – Rohit Deshmukh", phone: "9000000004", city: "Shrirampur" },
];

export async function seedDemo(strapi: Core.Strapi) {
  if (process.env.SEED_DEMO_DATA !== "true") return;
  const db = strapi.db as any;
  const docs = strapi.documents as any;

  if (await db.query("api::supplier.supplier").findOne({ where: { name: DEMO_SUPPLIER } })) {
    strapi.log.info("Demo data is already loaded. Remove SEED_DEMO_DATA to stop this check.");
    return;
  }

  const owner = await db.query("plugin::users-permissions.user").findOne({
    where: { staffRole: "owner", blocked: false },
    orderBy: { id: "asc" },
    populate: { organization: true, branches: true },
  });
  if (!owner?.organization || !owner.branches?.length) {
    strapi.log.warn("Demo data skipped: there is no owner account with an organization and branch yet.");
    return;
  }
  const staff: Staff = {
    id: owner.id,
    documentId: owner.documentId,
    username: owner.username,
    fullName: owner.fullName,
    staffRole: "owner",
    organization: owner.organization,
    branches: owner.branches,
  };
  const org = owner.organization;
  const branch = owner.branches[0];

  // Trays. Reuses any with the same code, so a manager's own trays are left alone.
  const trays = new Map<string, number>();
  for (const [order, place] of PLACES.entries()) {
    const fullCode = `${branch.code}-${place.code}`;
    let parent = await db.query("api::location.location").findOne({ where: { fullCode } });
    parent ??= await docs("api::location.location").create({
      data: { code: place.code, fullCode, name: place.name, kind: place.kind, sortOrder: order, isActive: true, branch: branch.documentId, organization: org.documentId },
    });
    for (const [index, tray] of place.trays.entries()) {
      const trayCode = `${fullCode}-${tray}`;
      let location = await db.query("api::location.location").findOne({ where: { fullCode: trayCode } });
      location ??= await docs("api::location.location").create({
        data: { code: tray, fullCode: trayCode, name: `${place.name} tray ${tray.slice(1)}`, kind: "tray", sortOrder: index, isActive: true, parent: parent.documentId, branch: branch.documentId, organization: org.documentId },
      });
      trays.set(`${place.code}-${tray}`, location.id);
    }
  }

  const supplier = await docs("api::supplier.supplier").create({
    data: { name: DEMO_SUPPLIER, kind: "supplier", city: "Mumbai", notes: "Demo data", isActive: true, organization: org.documentId },
  });
  await docs("api::supplier.supplier").create({
    data: { name: DEMO_KARIGAR, kind: "karigar", city: "Rahuri", notes: "Demo data", isActive: true, organization: org.documentId },
  });

  const pieces: PieceInput[] = [];
  for (const entry of DESIGNS) {
    const category = await db.query("api::category.category").findOne({ where: { slug: entry.category, organization: { id: org.id } } });
    let design = await db.query("api::design.design").findOne({ where: { code: entry.code, organization: { id: org.id } } });
    design ??= await docs("api::design.design").create({
      data: {
        code: entry.code,
        name: entry.name,
        metal: entry.metal,
        defaultPurity: entry.purity,
        making: entry.making,
        description: "Demo data for trying the suite.",
        isActive: true,
        isOnline: false,
        category: category?.documentId ?? null,
        organization: org.documentId,
      },
    });
    const place = entry.metal === "silver" ? "SC" : "GS";
    for (const weight of entry.weights) {
      pieces.push({
        designId: design.id,
        purity: entry.purity,
        grossWeight: weight,
        stoneWeight: 0,
        huid: null,
        making: entry.making,
        stoneValue: 0,
        costPrice: null,
        locationId: trays.get(`${place}-${entry.metal === "silver" ? "T1" : entry.tray}`) ?? null,
        slot: null,
        legacyTag: null,
        notes: "Demo data",
        photoIds: [],
      });
    }
  }

  const created = await db.transaction(async () => {
    const number = `GRN-${String(await reserveSequence(strapi, `receipt:${org.id}`)).padStart(6, "0")}`;
    const receipt = await docs("api::stock-receipt.stock-receipt").create({
      data: {
        number,
        source: "purchase",
        billNumber: "DEMO-DATA",
        notes: "Demo stock for trying the suite. Clear before go-live.",
        supplier: supplier.documentId,
        branch: branch.documentId,
        receivedBy: staff.documentId,
        organization: org.documentId,
      },
    });
    return createPieces(strapi, staff, pieces, {
      branch,
      receipt: { id: receipt.id, documentId: receipt.documentId, number },
      supplier,
      movementType: "received",
    });
  });

  for (const customer of CUSTOMERS) {
    const exists = await db.query("api::customer.customer").findOne({ where: { phone: customer.phone, organization: { id: org.id } } });
    if (!exists) {
      await docs("api::customer.customer").create({
        data: { ...customer, notes: "Demo data", branch: branch.documentId, organization: org.documentId },
      });
    }
  }

  strapi.log.info(`Loaded demo data: ${DESIGNS.length} designs, ${created.length} pieces, ${CUSTOMERS.length} customers at ${branch.name}.`);
}
