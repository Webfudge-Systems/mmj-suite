import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Shell } from "@/components/ui/Shell";
import { Reveal } from "@/components/ui/Reveal";
import { collections } from "@/data/collections";
import { getByCollection } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Collections",
  description:
    "Six MMJ collections, from the bridal vault to the men's line, each built so the gold tone and the weights match across every piece.",
};

export default function CollectionsPage() {
  return (
    <>
      <PageHeader
        title="Six collections, one workshop"
        lead="A collection at MMJ is not a marketing exercise. It means the pieces were struck from the same dies, in the same gold tone, so they sit together when they are worn together."
        trail={[{ label: "Home", href: "/" }, { label: "Collections" }]}
      />

      <Shell className="py-12 sm:py-16">
        <div className="grid gap-5 sm:grid-cols-2">
          {collections.map((collection, index) => {
            const count = getByCollection(collection.slug).length;
            /** The first and last tiles run full width, as the reference does. */
            const wide = index === 0 || index === collections.length - 1;

            return (
              <Reveal
                key={collection.slug}
                delay={Math.min(index, 3) * 0.06}
                className={wide ? "sm:col-span-2" : undefined}
              >
                <Link
                  href={`/collections/${collection.slug}`}
                  className="group relative block overflow-hidden bg-cream-deep"
                >
                  <div className={wide ? "aspect-[16/9] lg:aspect-[21/9]" : "aspect-[4/5]"}>
                    <Image
                      src={collection.image}
                      alt={collection.name}
                      fill
                      sizes={wide ? "100vw" : "(min-width: 640px) 50vw, 100vw"}
                      className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-7 sm:p-9">
                    <div>
                      <p className="eyebrow text-[9px] text-gold">
                        {collection.index} &middot; {count} pieces
                      </p>
                      <h2 className="mt-3 text-[clamp(1.35rem,2.6vw,2rem)] text-cream">
                        {collection.name}
                      </h2>
                      <p className="mt-2.5 max-w-md text-[13px] leading-relaxed text-cream/70">
                        {collection.tagline}
                      </p>
                    </div>
                    <span className="eyebrow text-[9px] text-cream/70 transition-opacity group-hover:opacity-60">
                      View
                    </span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </Shell>
    </>
  );
}
