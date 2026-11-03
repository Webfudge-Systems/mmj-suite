import { factories } from "@strapi/strapi";
import { errors } from "@strapi/utils";
import {
  LARGE_RATE_CHANGE_PERCENT,
  MAX_RATE_PER_GRAM,
  PURITIES,
  PURITY_CODES,
  PURITY_ORDER,
  type Purity,
} from "../../../utils/constants";

const UID = "api::rate-card.rate-card";

type Organization = { id: number; documentId: string; settings?: Record<string, unknown> | null };

type Staff = {
  id: number;
  documentId: string;
  staffRole: string;
  organization: Organization;
};

type StoredCard = {
  id: number;
  effectiveFrom: string;
  note: string | null;
  setBy?: { fullName?: string | null; username?: string } | null;
  rates: { purity: Purity; ratePerGram: number | string }[];
};

type PublishInput = {
  rates?: { purity?: unknown; ratePerGram?: unknown }[];
  note?: unknown;
  confirmLargeChange?: unknown;
};

const roundRupees = (value: number) => Math.round(value * 100) / 100;

function ratesByPurity(card: StoredCard | undefined): Map<string, number> {
  return new Map((card?.rates ?? []).map((line) => [line.purity, Number(line.ratePerGram)]));
}

/** Shapes a stored card for the apps, with each line's move against the card before it. */
function toResponse(card: StoredCard, previous: StoredCard | undefined) {
  const before = ratesByPurity(previous);
  const lines = ratesByPurity(card);

  return {
    id: card.id,
    effectiveFrom: card.effectiveFrom,
    note: card.note ?? null,
    setBy: card.setBy?.fullName || card.setBy?.username || null,
    rates: PURITIES.filter((purity) => lines.has(purity.code)).map((purity) => {
      const rate = lines.get(purity.code)!;
      const old = before.get(purity.code);
      return {
        purity: purity.code,
        metal: purity.metal,
        label: purity.label,
        ratePerGram: rate,
        changePerGram: old === undefined ? null : roundRupees(rate - old),
      };
    }),
  };
}

function activePurities(organization: Organization): string[] {
  const configured = organization.settings?.activePurities;
  if (Array.isArray(configured) && configured.every((code) => PURITY_CODES.includes(code))) {
    return configured as string[];
  }
  return [...PURITY_CODES];
}

function largeChangeLimit(organization: Organization): number {
  const configured = Number(organization.settings?.largeRateChangePercent);
  return configured > 0 ? configured : LARGE_RATE_CHANGE_PERCENT;
}

/** Checks the submitted lines and returns them in counter order. */
function validateLines(input: PublishInput, organization: Organization) {
  if (!Array.isArray(input?.rates) || input.rates.length === 0) {
    throw new errors.ValidationError("Enter a rate for each purity.");
  }

  const seen = new Map<string, number>();
  for (const line of input.rates) {
    const purity = String(line?.purity ?? "");
    const rate = Number(line?.ratePerGram);
    if (!PURITY_CODES.includes(purity)) {
      throw new errors.ValidationError(`${purity || "A line"} is not a purity the suite knows.`);
    }
    if (seen.has(purity)) {
      throw new errors.ValidationError(`${purity} is entered twice.`);
    }
    if (!Number.isFinite(rate) || rate <= 0 || rate > MAX_RATE_PER_GRAM) {
      throw new errors.ValidationError(`Enter a rate above zero for ${purity}.`);
    }
    seen.set(purity, roundRupees(rate));
  }

  const missing = activePurities(organization).filter((code) => !seen.has(code));
  if (missing.length) {
    throw new errors.ValidationError(`Rates are missing for ${missing.join(", ")}.`);
  }

  for (const ladder of PURITY_ORDER) {
    const quoted = ladder.filter((code) => seen.has(code));
    for (let i = 1; i < quoted.length; i++) {
      if (seen.get(quoted[i])! > seen.get(quoted[i - 1])!) {
        throw new errors.ValidationError(
          `${quoted[i]} cannot be higher than ${quoted[i - 1]}. Check for a typing slip.`,
        );
      }
    }
  }

  return PURITIES.filter((purity) => seen.has(purity.code)).map((purity) => ({
    purity: purity.code,
    metal: purity.metal,
    ratePerGram: seen.get(purity.code)!,
  }));
}

export default factories.createCoreService(UID, ({ strapi }) => ({
  async latest(organization: Organization, limit: number): Promise<StoredCard[]> {
    return (await strapi.documents(UID).findMany({
      filters: { organization: { documentId: organization.documentId } },
      sort: [{ effectiveFrom: "desc" }, { id: "desc" }],
      limit,
      populate: { rates: true, setBy: { fields: ["fullName", "username"] } },
    } as any)) as unknown as StoredCard[];
  },

  async current(organization: Organization) {
    const [card, previous]: StoredCard[] = await this.latest(organization, 2);
    return card ? toResponse(card, previous) : null;
  },

  async history(organization: Organization, limit: number) {
    const cards: StoredCard[] = await this.latest(organization, limit + 1);
    return cards.slice(0, limit).map((card, index) => toResponse(card, cards[index + 1]));
  },

  async publish(staff: Staff, input: PublishInput) {
    const organization = staff.organization;
    const lines = validateLines(input, organization);
    const note = typeof input?.note === "string" ? input.note.trim().slice(0, 500) : "";

    const [previous]: StoredCard[] = await this.latest(organization, 1);
    const before = ratesByPurity(previous);
    const limit = largeChangeLimit(organization);
    const largeChanges = lines
      .filter((line) => before.has(line.purity))
      .map((line) => {
        const old = before.get(line.purity)!;
        return { purity: line.purity, from: old, to: line.ratePerGram, percent: ((line.ratePerGram - old) / old) * 100 };
      })
      .filter((change) => Math.abs(change.percent) > limit);

    if (largeChanges.length) {
      if (staff.staffRole !== "owner") {
        throw new errors.ForbiddenError(
          `A move of more than ${limit}% needs the owner to publish it.`,
          { code: "LARGE_CHANGE_NEEDS_OWNER", changes: largeChanges },
        );
      }
      if (input?.confirmLargeChange !== true) {
        throw new errors.ValidationError(`Some rates moved more than ${limit}%. Confirm to publish.`, {
          code: "LARGE_CHANGE",
          changes: largeChanges,
        });
      }
    }

    const created = (await strapi.documents(UID).create({
      data: {
        effectiveFrom: new Date().toISOString(),
        note: note || null,
        largeChange: largeChanges.length > 0,
        rates: lines,
        organization: organization.documentId,
        setBy: staff.documentId,
      },
      populate: { rates: true, setBy: { fields: ["fullName", "username"] } },
    } as any)) as unknown as StoredCard;

    return toResponse(created, previous);
  },
}));
