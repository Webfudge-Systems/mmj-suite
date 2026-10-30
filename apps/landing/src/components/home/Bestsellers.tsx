import Image from "next/image";
import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ArrowCta } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { ProductCard } from "@/components/commerce/ProductCard";
import { getBestsellers } from "@/lib/catalog";

/**
 * Four tiles, but the third slot is a lifestyle crop rather than a product,
 * which is how the reference breaks up the row.
 */
export function Bestsellers() {
  const products = getBestsellers(3);

  return (
    <Panel tone="cream">
      <SectionHeading
        label="Bestsellers"
        action={<ArrowCta href="/shop?sort=popularity">View all</ArrowCta>}
      />

      <div className="mt-10 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {products.slice(0, 2).map((product, index) => (
          <Reveal key={product.slug} delay={index * 0.06}>
            <ProductCard product={product} />
          </Reveal>
        ))}

        <Reveal delay={0.12}>
          <Link href="/collections/temple-tradition" className="group block">
            <div className="relative aspect-square overflow-hidden bg-cream-deep">
              <Image
                src="/images/lifestyle/life-ear.webp"
                alt="Gold jhumka with a pearl fringe worn at the ear"
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-5 pt-12">
                <p className="eyebrow text-[10px] text-cream">Temple tradition</p>
                <p className="mt-1.5 text-[12px] text-cream/75">
                  Granulated by hand, grain by grain
                </p>
              </div>
            </div>
          </Link>
        </Reveal>

        {products.slice(2, 3).map((product) => (
          <Reveal key={product.slug} delay={0.18}>
            <ProductCard product={product} />
          </Reveal>
        ))}
      </div>
    </Panel>
  );
}
