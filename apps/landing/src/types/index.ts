export type Metal = "gold" | "diamond" | "silver" | "platinum" | "bullion";

/** Karat for gold and platinum, millesimal fineness for silver. */
export type Purity = "24KT" | "22KT" | "18KT" | "14KT" | "950PT" | "925";

export type CategorySlug =
  | "rings"
  | "earrings"
  | "necklaces"
  | "bangles"
  | "mangalsutra"
  | "chains"
  | "pendants"
  | "bracelets"
  | "nosepins"
  | "anklets"
  | "coins";

export type Occasion = "bridal" | "festive" | "daily" | "gifting" | "mens";

export type Availability = "in-stock" | "made-to-order";

export type StoneType = "diamond" | "polki" | "ruby" | "emerald" | "sapphire" | "pearl";

export type Stone = {
  type: StoneType;
  /** Number of stones set in the piece. */
  count: number;
  /** Total carat weight for this stone group. */
  carat: number;
  clarity?: string;
  colour?: string;
};

/** BIS mandates a six-character HUID on every hallmarked piece sold in India. */
export type Hallmark = {
  huid: string;
  bis: boolean;
};

export type Spec = {
  label: string;
  value: string;
};

/**
 * What the catalogue actually stores. Price is deliberately absent: it is
 * derived from weight, purity and the day's rate so the number on the card can
 * never drift from the breakup shown on the product page.
 */
export type ProductSeed = {
  slug: string;
  name: string;
  tagline: string;
  sku: string;
  designNumber: string;
  metal: Metal;
  category: CategorySlug;
  occasion: Occasion;
  collection: string;
  purity: Purity;
  /** Weight of the finished piece including stones, in grams. */
  grossWeight: number;
  /** Metal-only weight used for valuation, in grams. */
  netWeight: number;
  stoneWeight?: number;
  /** Charged as a percentage of the metal value. */
  makingChargePercent: number;
  /** Flat rupee cost of the stones, excluded from the metal calculation. */
  stoneCost?: number;
  /** Festive discount, applied as a strike-through against the derived price. */
  offerPercent?: number;
  hallmark: Hallmark;
  stones?: Stone[];
  images: string[];
  sizes?: string[];
  availability: Availability;
  description: string[];
  specs: Spec[];
  care: string[];
  featured: boolean;
  isNew: boolean;
  bestseller: boolean;
  popularity: number;
  releasedAt: string;
};

export type Product = ProductSeed & {
  price: number;
  compareAtPrice?: number;
};

/** The subset the valuation needs, so seeds and products both satisfy it. */
export type Valuable = Pick<
  ProductSeed,
  "metal" | "purity" | "netWeight" | "makingChargePercent" | "stoneCost"
>;

export type Category = {
  slug: CategorySlug;
  name: string;
  tagline: string;
  description: string;
  image: string;
};

/** The top-level shop taxonomy, one entry per metal counter in the showroom. */
export type MetalCounter = {
  slug: Metal;
  name: string;
  tagline: string;
  description: string;
  image: string;
};

export type Collection = {
  slug: string;
  name: string;
  index: string;
  tagline: string;
  description: string;
  image: string;
};

export type Review = {
  id: string;
  name: string;
  location: string;
  rating: number;
  title: string;
  body: string;
  product: string;
  publishedOn: string;
};

export type JournalPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readingTime: string;
  publishedOn: string;
  image: string;
  body: string[];
};

/** Rates are quoted per gram and refreshed each trading morning. */
export type MetalRate = {
  label: string;
  purity: Purity;
  metal: Metal;
  ratePerGram: number;
  changePerGram: number;
};

export type Store = {
  slug: string;
  name: string;
  addressLines: string[];
  city: string;
  state: string;
  pincode: string;
  phone: string;
  mapUrl: string;
  hours: string;
  closedOn: string;
  image: string;
};

export type CartLine = {
  slug: string;
  quantity: number;
  size?: string;
};

export type SortKey = "popularity" | "price-asc" | "price-desc" | "newest" | "weight-asc";

export type CatalogFilters = {
  metal?: Metal;
  category?: CategorySlug;
  occasion?: Occasion;
  purity?: Purity;
  collection?: string;
  maxPrice?: number;
  availability?: Availability;
  query?: string;
};
