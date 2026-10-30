import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { promises } from "@/data/site";

/**
 * Full-width wine band: image left, statement and the four promises right.
 */
export function CraftBand() {
  return (
    <section className="bg-wine text-cream">
      <div className="grid lg:grid-cols-2">
        <div className="relative min-h-[320px] lg:min-h-[560px]">
          <Image
            src="/images/lifestyle/craft-hand.webp"
            alt="A stack of carved gold bangles resting in an open palm"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col justify-center px-6 py-14 sm:px-10 sm:py-16 lg:px-14 lg:py-20">
          <Reveal>
            <p className="eyebrow text-[9px] text-cream/60">Why MMJ</p>
            <h2 className="mt-5 max-w-lg text-[clamp(1.75rem,3.6vw,2.75rem)] leading-[0.95]">
              Crafted with patience. Priced without a gap.
            </h2>
            <p className="mt-6 max-w-md text-[14px] leading-relaxed text-cream/75">
              A jeweller earns trust with arithmetic, not adjectives. We print the gross
              weight, the net weight, the stone weight, the making charge and the tax on
              every estimate, and we will walk you through each line before you pay.
            </p>
          </Reveal>

          <dl className="mt-11 grid gap-x-8 gap-y-7 sm:grid-cols-2">
            {promises.map((promise, index) => (
              <Reveal key={promise.index} delay={index * 0.06}>
                <dt className="eyebrow text-[9px] text-gold">{promise.index}</dt>
                <dd className="mt-2.5">
                  <p className="text-[14px] text-cream">{promise.title}</p>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-cream/60">
                    {promise.body}
                  </p>
                </dd>
              </Reveal>
            ))}
          </dl>

          <Reveal delay={0.24}>
            <ButtonLink href="/about" variant="light" className="mt-11 self-start">
              Our story
            </ButtonLink>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
