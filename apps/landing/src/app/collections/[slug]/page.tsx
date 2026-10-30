import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Shell } from "@/components/ui/Shell";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ShopBrowser } from "@/components/shop/ShopBrowser";
import { collections, getCollection } from "@/data/collections";
import { filterProducts } from "@/lib/catalog";
import { parseFilters, parsePage, parseSort, type RawParams } from "@/lib/shop-params";

export function generateStaticParams() {
  return collections.map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) return {};

  return {
    title: collection.name,
    description: collection.description,
    openGraph: { images: [collection.image] },
  };
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawParams>;
}) {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) notFound();

  const search = await searchParams;
  const filters = { ...parseFilters(search), collection: collection.slug };
  const products = filterProducts(filters, parseSort(search));

  return (
    <>
      <header className="relative isolate overflow-hidden bg-ink">
        <Image
          src={collection.image}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/20" />
        <Shell className="relative pb-14 pt-16 sm:pb-20 sm:pt-24">
          <Breadcrumbs
            trail={[
              { label: "Home", href: "/" },
              { label: "Collections", href: "/collections" },
              { label: collection.name },
            ]}
          />
          <p className="eyebrow mt-8 text-[9px] text-gold">
            Collection {collection.index}
          </p>
          <h1 className="mt-4 max-w-2xl text-[clamp(2rem,5vw,3.25rem)] text-cream">
            {collection.name}
          </h1>
          <p className="mt-6 max-w-xl text-[14px] leading-relaxed text-cream/75">
            {collection.description}
          </p>
        </Shell>
      </header>

      <ShopBrowser
        products={products}
        filters={filters}
        page={parsePage(search)}
        lockedKeys={["collection"]}
      />
    </>
  );
}
