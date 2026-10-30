import type { Category, CategorySlug, MetalCounter } from "@/types";

/** The metal counters, mirroring how the showroom floor is laid out. */
export const metalCounters: MetalCounter[] = [
  {
    slug: "gold",
    name: "Gold",
    tagline: "22 and 18 karat, finished by hand",
    description:
      "The heart of the showroom. Temple work, festive sets and everyday chains, all struck in 22 karat unless the design needs the harder 18.",
    image: "/images/categories/cat-gold.webp",
  },
  {
    slug: "diamond",
    name: "Diamond",
    tagline: "Certified solitaires and pave work",
    description:
      "Solitaires with IGI papers, pave-set daily wear and uncut polki for the bridal trousseau. Stones billed separately from the metal, always.",
    image: "/images/categories/cat-diamond.webp",
  },
  {
    slug: "silver",
    name: "Silver",
    tagline: "925 sterling and oxidised tribal",
    description:
      "Anklets, toe rings, puja articles and the oxidised statement pieces our younger customers come back for.",
    image: "/images/categories/cat-silver.webp",
  },
  {
    slug: "platinum",
    name: "Platinum",
    tagline: "950 bands and couple rings",
    description:
      "Denser, cooler and quietly rarer than gold. Mostly bands and couple rings, hallmarked 950.",
    image: "/images/products/prod-platinum-band.webp",
  },
  {
    slug: "bullion",
    name: "Coins and bars",
    tagline: "Investment grade, sealed",
    description:
      "999.9 fine gold bars and Lakshmi silver coins in tamper-proof assay packaging, bought back at the day's rate.",
    image: "/images/products/prod-gold-bar.webp",
  },
];

export const categories: Category[] = [
  {
    slug: "rings",
    name: "Rings",
    tagline: "Bands, solitaires and signets",
    description:
      "From a plain 22 karat band to a certified solitaire. Sized free of charge within a half size either way.",
    image: "/images/products/prod-gold-ring.webp",
  },
  {
    slug: "earrings",
    name: "Earrings",
    tagline: "Jhumkas, studs and drops",
    description:
      "Bell-domed jhumkas with pearl fringes, quiet diamond studs, and the long drops that come out at weddings.",
    image: "/images/products/prod-jhumka.webp",
  },
  {
    slug: "necklaces",
    name: "Necklaces",
    tagline: "Temple work to fine layering",
    description:
      "Wide temple collars, polki chokers and the light layering pieces that sit under a kurta collar.",
    image: "/images/products/prod-temple-necklace.webp",
  },
  {
    slug: "bangles",
    name: "Bangles",
    tagline: "Carved, plain and kada",
    description:
      "Sold in pairs as tradition asks. Hand-carved floral relief, plain high-polish, and the heavier kada.",
    image: "/images/products/prod-gold-bangles.webp",
  },
  {
    slug: "mangalsutra",
    name: "Mangalsutra",
    tagline: "Daily wear and occasion",
    description:
      "Short two-strand for every day, long single for the ceremony, with gold or diamond pendants.",
    image: "/images/products/prod-mangalsutra.webp",
  },
  {
    slug: "chains",
    name: "Chains",
    tagline: "Rope, box and cuban",
    description:
      "Drawn and linked in our own workshop, so the weight you are quoted is the weight you receive.",
    image: "/images/products/prod-gold-chain.webp",
  },
  {
    slug: "pendants",
    name: "Pendants",
    tagline: "Stones, initials and deity",
    description:
      "Ruby and emerald cabochons, pave halos, and the small deity pendants given at naming ceremonies.",
    image: "/images/products/prod-ruby-pendant.webp",
  },
  {
    slug: "bracelets",
    name: "Bracelets",
    tagline: "Tennis lines and flexible gold",
    description:
      "Bezel-set diamond lines and flexible gold bracelets that sit flat against the wrist.",
    image: "/images/products/prod-tennis-bracelet.webp",
  },
  {
    slug: "nosepins",
    name: "Nose pins",
    tagline: "Studs, pins and rings",
    description:
      "The smallest thing we make and often the hardest. Screw backs, L-pins and open rings.",
    image: "/images/products/prod-nosepin.webp",
  },
  {
    slug: "anklets",
    name: "Anklets",
    tagline: "Silver payal with bells",
    description:
      "Sterling payal with cast bells, sold in pairs, weighted so they sound right when you walk.",
    image: "/images/products/prod-silver-anklet.webp",
  },
  {
    slug: "coins",
    name: "Coins and bars",
    tagline: "Sealed and assay certified",
    description:
      "Gift-ready sealed coins for Dhanteras and Akshaya Tritiya, plus fine gold bars for the locker.",
    image: "/images/products/prod-silver-coin.webp",
  },
];

export function getCategory(slug: string) {
  return categories.find((category) => category.slug === slug);
}

export function getMetalCounter(slug: string) {
  return metalCounters.find((counter) => counter.slug === slug);
}

export const categoryLabels: Record<CategorySlug, string> = Object.fromEntries(
  categories.map((category) => [category.slug, category.name]),
) as Record<CategorySlug, string>;
