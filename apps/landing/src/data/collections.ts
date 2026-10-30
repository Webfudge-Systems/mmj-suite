import type { Collection } from "@/types";

export const collections: Collection[] = [
  {
    slug: "bridal-vault",
    name: "The Bridal Vault",
    index: "01",
    tagline: "Everything the trousseau asks for",
    description:
      "Polki chokers, temple collars, carved bangle pairs and the long haram. Built as a set so the weights and the gold tone match across every piece.",
    image: "/images/lifestyle/life-bridal.webp",
  },
  {
    slug: "temple-tradition",
    name: "Temple Tradition",
    index: "02",
    tagline: "South Indian craft, granule by granule",
    description:
      "Deity motifs struck from dies our workshop has kept since the nineteen eighties, finished with hand-applied gold granulation and ruby accents.",
    image: "/images/products/prod-temple-necklace.webp",
  },
  {
    slug: "everyday-light",
    name: "Everyday Light",
    index: "03",
    tagline: "Under ten grams, made to be worn",
    description:
      "The pieces that never come off. Thin chains, small studs, light mangalsutra, all under ten grams and priced with low making charges.",
    image: "/images/lifestyle/life-neck.webp",
  },
  {
    slug: "solitaire-house",
    name: "Solitaire House",
    index: "04",
    tagline: "Certified stones, honest settings",
    description:
      "Every solitaire arrives with an IGI or GIA report. Settings are kept quiet so the stone does the talking.",
    image: "/images/categories/cat-diamond.webp",
  },
  {
    slug: "mens-line",
    name: "The Men's Line",
    index: "05",
    tagline: "Weight without noise",
    description:
      "Brushed kada, cuban links and flat signets. Heavier gauges, matte finishes, nothing that catches a shirt cuff.",
    image: "/images/categories/cat-mens.webp",
  },
  {
    slug: "festive-bloom",
    name: "Festive Bloom",
    index: "06",
    tagline: "For Diwali, Gudi Padwa and the days between",
    description:
      "Floral relief work and enamel accents, released each year ahead of the festival season and retired after it.",
    image: "/images/lifestyle/life-bangles.webp",
  },
];

export function getCollection(slug: string) {
  return collections.find((collection) => collection.slug === slug);
}
