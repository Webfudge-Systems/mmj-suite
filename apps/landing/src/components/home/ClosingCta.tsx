import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { Shell } from "@/components/ui/Shell";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Dark full-bleed band with the portrait behind a centred condensed statement,
 * closing the page the way the reference does.
 */
export function ClosingCta() {
  return (
    <section className="relative isolate overflow-hidden bg-ink">
      <Image
        src="/images/lifestyle/life-closing.webp"
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-right opacity-70"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/20" />

      <Shell className="relative py-24 sm:py-32 lg:py-40">
        <Reveal className="max-w-2xl">
          <p className="eyebrow text-[9px] text-gold">Made to order</p>
          <h2 className="mt-5 text-[clamp(1.75rem,4.4vw,3.25rem)] leading-[0.95] text-cream">
            Find the piece you will keep for a lifetime, or have it made from a sketch
          </h2>
          <p className="mt-6 max-w-lg text-[14px] leading-relaxed text-cream/70">
            Bring a photograph, a family piece or an idea. Our karigars will quote a weight
            band and a timeline, usually three to five weeks for bridal work.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/contact" variant="gold">
              Start a commission
            </ButtonLink>
            <ButtonLink href="/stores" variant="light">
              Visit the showroom
            </ButtonLink>
          </div>
        </Reveal>
      </Shell>
    </section>
  );
}
