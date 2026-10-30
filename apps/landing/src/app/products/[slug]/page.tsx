import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Shell } from "@/components/ui/Shell";
import { Panel } from "@/components/ui/Panel";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ArrowCta } from "@/components/ui/Button";
import { Stars } from "@/components/ui/Stars";
import { HallmarkBadge, SaleBadge, StockDot, discountPercent } from "@/components/ui/Badge";
import { Gallery } from "@/components/product/Gallery";
import { BuyPanel } from "@/components/product/BuyPanel";
import { PriceBreakup } from "@/components/product/PriceBreakup";
import { ProductDetails } from "@/components/product/ProductDetails";
import { ProductGrid } from "@/components/commerce/ProductGrid";
import { getProductBySlug, getProducts, getRelated } from "@/lib/catalog";
import { categoryLabels } from "@/data/categories";
import { getCollection } from "@/data/collections";
import { ratingSummary } from "@/data/reviews";
import { site } from "@/data/site";
import { formatPrice, formatWeight } from "@/lib/utils";
import type { Product } from "@/types";

export function generateStaticParams() {
  return getProducts().map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return {};

  return {
    title: product.name,
    description: `${product.tagline}. ${product.purity}, ${formatWeight(product.grossWeight)} gross, BIS hallmarked. ${formatPrice(product.price)} with the full price breakup shown.`,
    openGraph: { images: [product.images[0]], type: "website" },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const collection = getCollection(product.collection);
  const related = getRelated(product, 4);
  const discount = discountPercent(product.price, product.compareAtPrice);

  return (
    <>
      <script
        type="application/ld+json"
        /* eslint-disable-next-line react/no-danger */
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(product)) }}
      />

      <Shell className="py-8 sm:py-12">
        <Breadcrumbs
          trail={[
            { label: "Home", href: "/" },
            { label: "Shop", href: "/shop" },
            { label: categoryLabels[product.category], href: `/shop/${product.category}` },
            { label: product.name },
          ]}
        />

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_minmax(0,420px)] lg:gap-16">
          <Gallery images={product.images} name={product.name} />

          <div className="lg:sticky lg:top-32 lg:self-start">
            <p className="eyebrow text-[9px] text-stone">
              {product.purity} &middot; {categoryLabels[product.category]}
              {collection && (
                <>
                  {" "}&middot;{" "}
                  <a
                    href={`/collections/${collection.slug}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {collection.name}
                  </a>
                </>
              )}
            </p>

            <h1 className="mt-4 text-[clamp(1.5rem,3vw,2.15rem)] normal-case tracking-normal">
              {product.name}
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-ash">{product.tagline}</p>

            <div className="mt-5 flex items-center gap-3">
              <Stars rating={ratingSummary.average} size={13} />
              <span className="text-[12px] text-stone">
                {ratingSummary.average} &middot; {ratingSummary.count} reviews
              </span>
            </div>

            <div className="mt-7 flex flex-wrap items-baseline gap-3">
              <span className="text-[26px] tabular-nums text-ink">
                {formatPrice(product.price)}
              </span>
              {product.compareAtPrice && (
                <span className="text-[15px] tabular-nums text-stone line-through">
                  {formatPrice(product.compareAtPrice)}
                </span>
              )}
              {discount && <SaleBadge percent={discount} />}
            </div>
            <p className="mt-2 text-[11px] text-stone">Inclusive of GST and hallmarking</p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <StockDot availability={product.availability} />
              <HallmarkBadge />
              <span className="text-[12px] text-stone">SKU {product.sku}</span>
            </div>

            <BuyPanel product={product} />

            <div className="mt-9 space-y-3 border-t border-line pt-7">
              {product.description.map((paragraph) => (
                <p key={paragraph} className="text-[13px] leading-relaxed text-ash">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>
      </Shell>

      <Panel tone="cream">
        <div className="grid gap-12 lg:grid-cols-[1fr_minmax(0,420px)] lg:gap-16">
          <ProductDetails product={product} />
          <div className="lg:pt-0">
            <PriceBreakup product={product} />
          </div>
        </div>
      </Panel>

      {related.length > 0 && (
        <Panel tone="paper">
          <SectionHeading
            label="You may also like"
            tone="paper"
            action={<ArrowCta href={`/shop/${product.category}`}>More {categoryLabels[product.category].toLowerCase()}</ArrowCta>}
          />
          <ProductGrid products={related} className="mt-10" />
        </Panel>
      )}
    </>
  );
}

/** Product schema so the price and hallmark data surface in search results. */
function jsonLd(product: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.tagline,
    sku: product.sku,
    mpn: product.designNumber,
    image: product.images.map((image) => `${site.url}${image}`),
    brand: { "@type": "Brand", name: site.name },
    weight: { "@type": "QuantitativeValue", value: product.grossWeight, unitCode: "GRM" },
    material: product.purity,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "INR",
      availability:
        product.availability === "in-stock"
          ? "https://schema.org/InStock"
          : "https://schema.org/PreOrder",
      url: `${site.url}/products/${product.slug}`,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: ratingSummary.average,
      reviewCount: ratingSummary.count,
    },
  };
}
