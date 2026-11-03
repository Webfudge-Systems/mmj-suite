import { fetchCurrentRates } from "@webfudge/utils/api";
import { metalRates, rateUpdatedOn } from "@/data/rates";
import type { MetalRate, Purity } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1337";

/** How long a page may show a rate before Next.js checks the backend again. */
export const RATE_REVALIDATE_SECONDS = 60;

const known: Purity[] = ["24KT", "22KT", "18KT", "14KT", "950PT", "925"];

/** The static file quotes gold as 24KT; scale it so each line is that purity's own rate. */
const fineness: Record<Purity, number> = {
  "24KT": 1,
  "22KT": 22 / 24,
  "18KT": 18 / 24,
  "14KT": 14 / 24,
  "950PT": 0.95,
  "925": 1,
};

export type LiveRates = {
  rates: MetalRate[];
  updatedOn: string;
  /** False when the backend could not be reached and the static rates are shown. */
  live: boolean;
};

function fallback(): LiveRates {
  return {
    rates: metalRates.map((rate) => ({
      ...rate,
      ratePerGram: rate.ratePerGram * fineness[rate.purity],
      changePerGram: rate.changePerGram * fineness[rate.purity],
    })),
    updatedOn: rateUpdatedOn,
    live: false,
  };
}

/**
 * Today's rates as published from the Back Office, per gram for each purity.
 * Product prices still come from the static catalogue until the website is
 * connected to the backend catalogue.
 */
export async function getLiveRates(): Promise<LiveRates> {
  try {
    const card = await fetchCurrentRates(API_URL, {
      next: { revalidate: RATE_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(2500),
    });
    if (!card) return fallback();

    return {
      rates: card.rates
        .filter((line) => known.includes(line.purity as Purity))
        .map((line) => ({
          label: line.label,
          purity: line.purity as Purity,
          metal: line.metal,
          ratePerGram: line.ratePerGram,
          changePerGram: line.changePerGram ?? 0,
        })),
      updatedOn: card.effectiveFrom,
      live: true,
    };
  } catch {
    return fallback();
  }
}
