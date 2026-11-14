import { categories, metalCounters } from "@/data/categories";
import type { CategorySlug, Metal, Occasion, Product, Purity } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1337";

/** How long a page may show a catalogue before Next.js asks the backend again. */
export const CATALOG_REVALIDATE_SECONDS = 120;

/** One design as the backend's public catalogue returns it. */
type LiveDesign = {
  id: number;
  slug: string;
  code: string;
  name: string;
  description: string | null;
  metal: "gold" | "silver" | "platinum";
  purity: string | null;
  category: { name: string; slug: string } | null;
  collection: { name: string; slug: string } | null;
  occasion: string | null;
  images: string[];
  inStock: number;
  priceFrom: number | null;
  priceTo: number | null;
  grossWeight: number | null;
  netWeight: number | null;
  stoneWeight: number | null;
  weightFrom: number | null;
  weightTo: number | null;
  hallmarked: boolean;
  breakup: { ratePerGram: number; metalValue: number; makingCharge: number; stoneValue: number; hallmark: number; gst: number; total: number } | null;
  making: { type: "per_gram" | "percent" | "fixed"; value: number } | null;
  sold: number;
  isNew: boolean;
  releasedAt: string | null;
  pieces?: { tag: string; purity: string; grossWeight: number; netWeight: number; price: number | null; photo: string | null; branch: string | null }[];
};

const PURITIES: Purity[] = ["24KT", "22KT", "18KT", "14KT", "950PT", "925"];
const OCCASIONS: Occasion[] = ["bridal", "festive", "daily", "gifting", "mens"];

function fallbackImage(category: string | undefined, metal: Metal) {
  return categories.find((entry) => entry.slug === category)?.image ?? metalCounters.find((entry) => entry.slug === metal)?.image ?? "/images/categories/cat-gold.webp";
}

function weight(value: number | null) {
  return value === null ? "" : `${value.toFixed(value < 10 ? 2 : 1)} g`;
}

/** Turns a live design into the Product the existing pages already know how to show. */
export function toProduct(design: LiveDesign, bestsellerThreshold = 1): Product {
  const category = (categories.some((entry) => entry.slug === design.category?.slug) ? design.category!.slug : "rings") as CategorySlug;
  const purity = (PURITIES.includes(design.purity as Purity) ? design.purity : design.metal === "silver" ? "925" : "22KT") as Purity;
  const metal: Metal = design.metal;
  const breakup = design.breakup;
  const makingPercent = breakup && breakup.metalValue > 0 ? Math.round((breakup.makingCharge / breakup.metalValue) * 1000) / 10 : 0;
  const range =
    design.weightFrom !== null && design.weightTo !== null && design.weightTo > design.weightFrom
      ? `${weight(design.weightFrom)} to ${weight(design.weightTo)}`
      : weight(design.grossWeight);

  return {
    slug: design.slug,
    name: design.name,
    tagline: [design.category?.name, purity, design.inStock ? `${design.inStock} in store` : "Made to order"].filter(Boolean).join(" · "),
    sku: design.code,
    designNumber: design.code,
    metal,
    category,
    occasion: (OCCASIONS.includes(design.occasion as Occasion) ? design.occasion : "daily") as Occasion,
    collection: design.collection?.slug ?? "",
    purity,
    grossWeight: design.grossWeight ?? 0,
    netWeight: design.netWeight ?? 0,
    stoneWeight: design.stoneWeight ?? undefined,
    makingChargePercent: makingPercent,
    stoneCost: breakup?.stoneValue || undefined,
    hallmark: { huid: "", bis: design.hallmarked },
    images: design.images.length ? design.images : [fallbackImage(category, metal)],
    availability: design.inStock > 0 ? "in-stock" : "made-to-order",
    description: design.description
      ? design.description.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean)
      : [
          `${design.name} in ${purity} ${metal}, made for Mukund Maid Jewellers.`,
          design.inStock
            ? "Every piece is weighed and hallmarked. The price shown is for the lightest piece in store today; see each piece below, or ask us to hold one for you."
            : "Ask us and we will have one made in the weight you want.",
        ],
    specs: [
      { label: "Design number", value: design.code },
      { label: "Purity", value: purity },
      ...(range ? [{ label: design.inStock > 1 ? "Weights in store" : "Gross weight", value: range }] : []),
      { label: "In store", value: design.inStock ? `${design.inStock} ${design.inStock === 1 ? "piece" : "pieces"}` : "Made to order" },
      { label: "Hallmark", value: design.hallmarked ? "BIS hallmarked with HUID" : "BIS hallmarked on sale" },
    ],
    care: [
      "Store each piece separately in a soft pouch.",
      "Keep away from perfume, sprays and chlorinated water.",
      "Bring it to the shop once a year for a free clean and check.",
    ],
    featured: design.images.length > 0,
    isNew: design.isNew,
    bestseller: design.sold >= bestsellerThreshold && design.sold > 0,
    popularity: design.sold,
    releasedAt: design.releasedAt ?? new Date(0).toISOString(),
    price: design.priceFrom ?? 0,
    live: {
      priceOnRequest: design.priceFrom === null,
      priceTo: design.priceTo,
      inStock: design.inStock,
      breakup,
      making: design.making,
      pieces: design.pieces ?? [],
    },
  };
}

/**
 * Designs the shop has put online, at today's price. Null when the backend
 * cannot be reached, so the caller can fall back to the sample catalogue.
 */
export async function fetchLiveProducts(): Promise<Product[] | null> {
  try {
    const response = await fetch(`${API_URL}/api/catalogue/products`, { next: { revalidate: CATALOG_REVALIDATE_SECONDS } });
    if (!response.ok) return null;
    const { data } = (await response.json()) as { data: LiveDesign[] };
    const sold = data.map((design) => design.sold).sort((a, b) => b - a);
    // The top fifth by pieces sold count as bestsellers.
    const threshold = sold[Math.max(0, Math.floor(sold.length / 5) - 1)] ?? 1;
    return data.map((design) => toProduct(design, Math.max(1, threshold)));
  } catch {
    return null;
  }
}

/** One live design with each piece in stock, for its product page. */
export async function fetchLiveProduct(slug: string): Promise<Product | null> {
  try {
    const response = await fetch(`${API_URL}/api/catalogue/products/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } });
    if (!response.ok) return null;
    const { data } = (await response.json()) as { data: LiveDesign };
    return toProduct(data);
  } catch {
    return null;
  }
}

/** Sends a reservation or question from the website to the shop's CRM. */
export async function sendEnquiry(input: {
  name: string;
  phone: string;
  email?: string;
  message?: string;
  visitOn?: string;
  website?: string;
  items: { code?: string; name: string; price?: number | null; quantity?: number; url?: string }[];
}): Promise<{ number: string }> {
  const response = await fetch(`${API_URL}/api/catalogue/enquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? "We could not send your request. Please call the shop.");
  return body.data;
}
