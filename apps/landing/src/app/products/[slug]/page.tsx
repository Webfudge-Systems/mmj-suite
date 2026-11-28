import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, Store } from "lucide-react";
import { Shell } from "@/components/ui/Shell";
import { Panel } from "@/components/ui/Panel";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ArrowCta } from "@/components/ui/Button";
import { HallmarkBadge, StockDot, discountPercent } from "@/components/ui/Badge";
import { Gallery } from "@/components/product/Gallery";
import { BuyPanel } from "@/components/product/BuyPanel";
import { PriceBreakup } from "@/components/product/PriceBreakup";
import { Fold } from "@/components/ui/Fold";
import { ProductBenefits } from "@/components/product/ProductBenefits";
import { StickyBuyBar } from "@/components/product/StickyBuyBar";
import { ProductDetails } from "@/components/product/ProductDetails";
import { ProductGrid } from "@/components/commerce/ProductGrid";
import { ensureCatalog, getProductBySlug, getProducts, getRelated, isLiveCatalog } from "@/lib/catalog";
import { fetchLiveProduct } from "@/lib/live-catalog";
import { LivePieces } from "@/components/product/LivePieces";
import { ProductPromise } from "@/components/product/ProductPromise";
import { ProductReviews } from "@/components/product/ProductReviews";
import { categoryLabels } from "@/data/categories";
import { getCollection } from "@/data/collections";
import { ratingSummary } from "@/data/reviews";
import { site } from "@/data/site";
import { formatPrice, formatWeight } from "@/lib/utils";
import type { Product } from "@/types";

export async function generateStaticParams() {
  await ensureCatalog();
  return getProducts().map((product) => ({ slug: product.slug }));
}

/** Live products are fetched fresh with each piece in stock; sample products come from the catalogue. */
async function loadProduct(slug: string): Promise<Product | undefined> {
  await ensureCatalog();
  const known = getProductBySlug(slug);
  if (known && !known.live) return known;
  if (known || isLiveCatalog()) return (await fetchLiveProduct(slug)) ?? known;
  return undefined;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return {};

  return {
    title: product.name,
    description: `${product.tagline}. ${product.purity}, ${formatWeight(product.grossWeight)} gross, BIS hallmarked. ${product.live?.priceOnRequest ? "Price on request" : formatPrice(product.price)} with the full price breakup shown.`,
    openGraph: { images: [product.images[0]], type: "website" },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await loadProduct(slug);
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

      <Shell className="pb-10 pt-5 sm:py-10">
        <Breadcrumbs
          trail={[
            { label: "Home", href: "/" },
            { label: "Shop", href: "/shop" },
            { label: categoryLabels[product.category], href: `/shop/${product.category}` },
            { label: product.name },
          ]}
        />

        <div className="mt-5 grid gap-x-14 gap-y-6 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
          <header className="lg:col-start-2 lg:row-start-1">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-[clamp(1.6rem,3vw,2.3rem)] leading-[1.15] text-ink">{product.name}</h1>
              {!product.live ? (
                <span className="flex shrink-0 items-center gap-2 rounded-2xl bg-fog px-3 py-2 text-[13px] font-semibold text-ink">
                  {ratingSummary.average}
                  <Star className="size-3.5 fill-gold text-gold" aria-hidden />
                  <span className="h-4 w-px bg-line" aria-hidden />
                  <span className="font-medium text-ash">{ratingSummary.count}</span>
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-[14px] font-medium text-wine">
              {categoryLabels[product.category]}, {product.purity}
              {collection && (
                <>
                  {", "}
                  <Link href={`/collections/${collection.slug}`} className="underline-offset-4 hover:underline">
                    {collection.name}
                  </Link>
                </>
              )}
            </p>
            {!product.live && <p className="mt-2 text-[14px] leading-relaxed text-ash">{product.tagline}</p>}
          </header>

          <div className="lg:sticky lg:top-28 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-start">
            <Gallery images={product.images} name={product.name} slug={product.slug} />
          </div>

          <div className="lg:col-start-2 lg:row-start-2">
            <p className="flex items-center gap-3 rounded-2xl bg-mist px-4 py-3.5 text-[13px] font-medium text-wine">
              <Store className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
              {stockLine(product)}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-[30px] font-semibold leading-none tabular-nums text-ink">
                {product.live?.priceOnRequest
                  ? "Price on request"
                  : product.live?.priceTo && product.live.priceTo > product.price
                    ? `From ${formatPrice(product.price)}`
                    : formatPrice(product.price)}
              </span>
              {discount && (
                <span className="rounded-full bg-gold px-3 py-1 text-[12px] font-semibold text-ink">
                  Save {discount}%
                </span>
              )}
            </div>
            {product.compareAtPrice && (
              <p className="mt-2 text-[13px] text-stone">
                MRP <span className="tabular-nums line-through">{formatPrice(product.compareAtPrice)}</span>
              </p>
            )}
            <p className="mt-2 text-[12px] text-stone">
              {product.live?.priceOnRequest
                ? "None in store right now. Ask us and we will have one made."
                : "Inclusive of GST and hallmarking, at today's rate."}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <StockDot availability={product.availability} />
              <HallmarkBadge />
              <span className="text-[12px] text-stone">SKU {product.sku}</span>
            </div>

            <BuyPanel product={product} />

            <ProductBenefits />

            <div className="mt-8 space-y-3">
              <ProductDetails product={product} />
              {product.live && product.live.pieces.length > 0 && (
                <Fold title={`In the showroom today (${product.live.pieces.length})`}>
                  <LivePieces pieces={product.live.pieces} />
                </Fold>
              )}
              <Fold title="Price breakup" defaultOpen>
                <div className="[&>div]:border-0 [&>div]:bg-transparent [&>div]:p-0 [&_h2]:hidden">
                  <PriceBreakup product={product} />
                </div>
              </Fold>
            </div>
          </div>
        </div>
      </Shell>

      <StickyBuyBar product={product} />

      <ProductPromise />
      <ProductReviews live={Boolean(product.live)} />

      {related.length > 0 && (
        <Panel tone="paper">
          <SectionHeading
            label="Recommended for you"
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
    image: product.images.map((image) => (image.startsWith("http") ? image : `${site.url}${image}`)),
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
    ...(product.live
      ? {}
      : { aggregateRating: { "@type": "AggregateRating", ratingValue: ratingSummary.average, reviewCount: ratingSummary.count } }),
  };
}

/** One honest line on availability, from real stock where we have it. */
function stockLine(product: Product) {
  if (product.live) {
    return product.live.inStock > 0
      ? `${product.live.inStock} ${product.live.inStock === 1 ? "piece" : "pieces"} in the Rahuri showroom today`
      : "Not on the floor right now. We can make it for you";
  }
  return product.availability === "in-stock"
    ? "In stock at the Rahuri showroom"
    : "Made to order, ready in three to five weeks";
}
