import Image from "next/image";
import { Shell } from "@/components/ui/Shell";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Checkerboard of two photographs and two statement cards: a grey card for
 * rings and a blue-mist card for diamonds, each with a boxed CTA.
 */
export function StoryMosaic() {
  return (
    <section className="bg-paper pb-16 sm:pb-20">
      <Shell className="grid gap-5 md:grid-cols-2">
        <div className="relative min-h-[320px] overflow-hidden rounded-3xl bg-fog md:min-h-[400px]">
          <Image
            src="/images/lifestyle/craft-hand.webp"
            alt="A stack of carved gold bangles resting in an open palm"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>

        <article className="relative isolate flex min-h-[320px] flex-col items-center justify-center overflow-hidden rounded-3xl bg-mist px-8 py-14 text-center md:min-h-[400px]">
          <Image
            src="/images/products/prod-diamond-studs.webp"
            alt=""
            width={220}
            height={220}
            className="pointer-events-none absolute -left-10 -top-10 -z-10 size-[220px] rounded-full object-cover opacity-30 blur-[2px] mix-blend-multiply"
          />
          <h2 className="max-w-[16ch] text-[clamp(2rem,3.6vw,2.9rem)] text-ink">
            The brilliance of diamonds
          </h2>
          <p className="mt-4 max-w-md text-[14px] leading-relaxed text-ash">
            From solitaires to pav&eacute; daily wear, every stone is chosen for its fire and clarity,
            and arrives with its certificate.
          </p>
          <ButtonLink href="/shop/diamond" variant="outline" arrow className="mt-8">
            Explore diamonds
          </ButtonLink>
        </article>

        <article className="relative isolate flex min-h-[320px] flex-col items-center justify-center overflow-hidden rounded-3xl bg-fog px-8 py-14 text-center md:min-h-[400px]">
          <Image
            src="/images/products/prod-solitaire-ring.webp"
            alt=""
            width={240}
            height={240}
            className="pointer-events-none absolute -bottom-12 -left-12 -z-10 size-[240px] rounded-full object-cover opacity-25 blur-[3px] mix-blend-multiply"
          />
          <h2 className="max-w-[16ch] text-[clamp(2rem,3.6vw,2.9rem)] text-ink">
            Your love story, set in gold
          </h2>
          <p className="mt-4 max-w-md text-[14px] leading-relaxed text-ash">
            Engagement bands, couple rings and the solitaire for the question, sized free within half
            a size either way.
          </p>
          <ButtonLink href="/shop/rings" variant="outline" arrow className="mt-8">
            Explore rings
          </ButtonLink>
        </article>

        <div className="relative min-h-[320px] overflow-hidden rounded-3xl bg-fog md:min-h-[400px]">
          <Image
            src="/images/lifestyle/hero-rings.webp"
            alt="Gold ring with diamond accents"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      </Shell>
    </section>
  );
}
