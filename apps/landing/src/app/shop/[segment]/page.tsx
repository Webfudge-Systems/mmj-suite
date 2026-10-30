import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShopBrowser } from "@/components/shop/ShopBrowser";
import { filterProducts } from "@/lib/catalog";
import { categories, getCategory, getMetalCounter, metalCounters } from "@/data/categories";
import { parseFilters, parsePage, parseSort, type RawParams } from "@/lib/shop-params";
import type { CatalogFilters, Occasion } from "@/types";

const occasions: { slug: Occasion; name: string; tagline: string; description: string }[] = [
  {
    slug: "bridal",
    name: "Bridal",
    tagline: "The full trousseau",
    description:
      "Temple collars, polki chokers, carved bangle pairs and the mangalsutra. Most bridal work is made to order over three to five weeks.",
  },
  {
    slug: "festive",
    name: "Festive",
    tagline: "Diwali, Dhanteras, Padwa",
    description:
      "Pieces that come out for the season and the sealed coins bought on the auspicious days.",
  },
  {
    slug: "daily",
    name: "Everyday",
    tagline: "Light enough to forget",
    description:
      "Under eight grams, rounded edges, secure backs. Built to be worn to work and slept in.",
  },
  {
    slug: "gifting",
    name: "Gifting",
    tagline: "Naming days and anniversaries",
    description:
      "Deity pendants, studs and coins, boxed and ready, with the estimate left out of the packet.",
  },
  {
    slug: "mens",
    name: "For him",
    tagline: "Kada, cuban links and signets",
    description:
      "Heavier gauges and matte finishes. Cuban links, brushed kada and crest signets in 22 karat.",
  },
];

/** One segment serves three taxonomies, in the order the nav links to them. */
function resolve(segment: string) {
  const metal = getMetalCounter(segment);
  if (metal) {
    return {
      title: metal.name,
      lead: metal.description,
      filters: { metal: metal.slug } satisfies CatalogFilters,
      lockedKeys: ["metal"],
    };
  }

  const category = getCategory(segment);
  if (category) {
    return {
      title: category.name,
      lead: category.description,
      filters: { category: category.slug } satisfies CatalogFilters,
      lockedKeys: ["category"],
    };
  }

  const occasion = occasions.find((entry) => entry.slug === segment);
  if (occasion) {
    return {
      title: occasion.name,
      lead: occasion.description,
      filters: { occasion: occasion.slug } satisfies CatalogFilters,
      lockedKeys: ["occasion"],
    };
  }

  return undefined;
}

export function generateStaticParams() {
  return [
    ...metalCounters.map((counter) => ({ segment: counter.slug })),
    ...categories.map((category) => ({ segment: category.slug })),
    ...occasions.map((occasion) => ({ segment: occasion.slug })),
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ segment: string }>;
}): Promise<Metadata> {
  const { segment } = await params;
  const resolved = resolve(segment);
  if (!resolved) return {};

  return { title: `${resolved.title} jewellery`, description: resolved.lead };
}

export default async function ShopSegmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ segment: string }>;
  searchParams: Promise<RawParams>;
}) {
  const { segment } = await params;
  const resolved = resolve(segment);
  if (!resolved) notFound();

  const search = await searchParams;
  /** The segment wins over any conflicting value typed into the query string. */
  const filters = { ...parseFilters(search), ...resolved.filters };
  const products = filterProducts(filters, parseSort(search));

  return (
    <>
      <PageHeader
        title={resolved.title}
        lead={resolved.lead}
        trail={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: resolved.title },
        ]}
      />
      <ShopBrowser
        products={products}
        filters={filters}
        page={parsePage(search)}
        lockedKeys={resolved.lockedKeys}
      />
    </>
  );
}
