import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";

/** Viewport height minus sticky announcement (h-9) + header (h-[4.5rem] / sm:h-24). */
const heroHeight =
  "min-h-[calc(100dvh-6.75rem)] sm:min-h-[calc(100dvh-8.25rem)]";

/**
 * Split hero: Deep Blue brand panel (headline → product → copy → CTA) on the
 * left, full-bleed lifestyle portrait on the right.
 */
export function Hero() {
  return (
    <section className={`grid lg:grid-cols-2 ${heroHeight}`}>
      <div className="flex flex-col items-center justify-center bg-wine px-8 py-16 text-center text-cream sm:px-12 sm:py-20 lg:px-16 lg:py-24">
        <h1 className="max-w-[14ch] text-[clamp(2.25rem,5.5vw,3.35rem)] leading-[0.92]">
          Made for life&rsquo;s key moments
        </h1>

        <Image
          src="/images/lifestyle/hero-rings.webp"
          alt="Gold ring with diamond accents"
          width={280}
          height={210}
          priority
          className="mt-10 w-[42%] max-w-[200px] object-contain sm:mt-12 sm:max-w-[220px]"
        />

        <p className="mt-10 max-w-md text-[14px] leading-relaxed text-cream/80 sm:mt-12">
          Discover handcrafted fine jewellery made with exceptional craftsmanship,
          ethically sourced materials, and timeless design. Whether you&rsquo;re
          celebrating love, milestones, or everyday elegance, find pieces you&rsquo;ll
          treasure for generations.
        </p>

        <ButtonLink href="/shop/gold" variant="cream" className="mt-10 sm:mt-12">
          Shop Collection
        </ButtonLink>
      </div>

      <div className="relative min-h-[50vh] bg-ink lg:min-h-0">
        <Image
          src="/images/lifestyle/life-hero.webp"
          alt="Layered gold chains and hoop earrings against a dark backdrop"
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover object-center"
        />
      </div>
    </section>
  );
}
