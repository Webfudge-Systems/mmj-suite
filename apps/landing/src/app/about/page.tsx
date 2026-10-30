import type { Metadata } from "next";
import Image from "next/image";
import { Shell } from "@/components/ui/Shell";
import { Panel } from "@/components/ui/Panel";
import { PageHeader } from "@/components/ui/PageHeader";
import { Statement } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { Stars } from "@/components/ui/Stars";
import { promises, site } from "@/data/site";
import { ratingSummary, reviews } from "@/data/reviews";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Our story",
  description: site.description,
};

const timeline = [
  {
    year: "1978",
    title: "A single showcase on Main Road",
    body: "Mukund Maid opens with one showcase, a balance and a gas torch, making chains to order for Rahuri's farming families.",
  },
  {
    year: "1994",
    title: "The workshop moves upstairs",
    body: "Six karigars take the floor above the showroom so customers can watch their own gold being worked.",
  },
  {
    year: "2008",
    title: "Hallmarking from the start",
    body: "We begin hallmarking every piece years before it became mandatory, and start printing the full weight breakup on estimates.",
  },
  {
    year: "2016",
    title: "The diamond counter",
    body: "Certified solitaires arrive, billed with the stone value separated from the metal so the arithmetic stays checkable.",
  },
  {
    year: "2026",
    title: "Forty-eight karigars",
    body: "Five counters, a bridal atelier and a workshop that still finishes every ornament by hand before it reaches the case.",
  },
];

const numbers = [
  { value: "48", label: "Karigars on the floor" },
  { value: "1978", label: "Trading since" },
  { value: "100%", label: "BIS hallmarked" },
  { value: `${ratingSummary.count}+`, label: "Customer reviews" },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="Forty-eight years on the same road"
        lead={site.description}
        trail={[{ label: "Home", href: "/" }, { label: "Our story" }]}
      />

      <Shell className="py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal className="relative aspect-[4/5] overflow-hidden bg-cream-deep">
            <Image
              src="/images/lifestyle/craft-hand.webp"
              alt="A karigar finishing a carved gold bangle by hand"
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </Reveal>

          <Reveal delay={0.08} className="flex flex-col justify-center">
            <p className="eyebrow text-[9px] text-stone">Why we print the numbers</p>
            <h2 className="mt-5 text-[clamp(1.5rem,3.2vw,2.25rem)]">
              A jeweller earns trust with arithmetic
            </h2>
            <div className="mt-6 space-y-5 text-[14px] leading-relaxed text-ash">
              <p>
                At Mukund Maid Jewellers, we believe in the art of jewellery making, where
                tradition meets innovation. Our collections are inspired by nature&rsquo;s
                beauty and the timeless allure of classic designs, ensuring that our jewellery
                remains a cherished possession for generations.
              </p>
              <p>
                Gold is sold by weight, and weight is a fact. What varies between shops is
                the making charge, the wastage percentage and how much of it is explained
                to you before you pay.
              </p>
              <p>
                We have printed the gross weight, the net weight, the stone weight, the
                making charge and the tax on every MMJ estimate since 2008. It is the same
                breakup you will find on every product page of this website, calculated
                from the same day&rsquo;s rate.
              </p>
            </div>
            <ButtonLink href="/gold-rate" variant="outline" className="mt-9 self-start">
              Today's rate
            </ButtonLink>
          </Reveal>
        </div>
      </Shell>

      <section className="bg-ink py-16 text-cream sm:py-20">
        <Shell>
          <dl className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {numbers.map((entry, index) => (
              <Reveal key={entry.label} delay={index * 0.06}>
                <dt className="text-[clamp(2.25rem,5vw,3.25rem)] leading-none text-cream">
                  {entry.value}
                </dt>
                <dd className="eyebrow mt-4 text-[9px] text-cream/50">{entry.label}</dd>
              </Reveal>
            ))}
          </dl>
        </Shell>
      </section>

      <Panel tone="cream">
        <p className="eyebrow text-[9px] text-stone">The long way round</p>
        <Statement className="mt-5 max-w-2xl">Five moments that shaped the shop</Statement>

        <ol className="mt-12 border-t border-line">
          {timeline.map((entry, index) => (
            <Reveal key={entry.year} delay={Math.min(index, 3) * 0.05}>
              <li className="grid gap-4 border-b border-line py-8 sm:grid-cols-[120px_1fr] sm:gap-10">
                <p className="text-[clamp(1.25rem,2.4vw,1.6rem)] leading-none text-gold">
                  {entry.year}
                </p>
                <div>
                  <h3 className="text-[16px] normal-case tracking-normal">{entry.title}</h3>
                  <p className="mt-2.5 max-w-xl text-[13px] leading-relaxed text-ash">
                    {entry.body}
                  </p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </Panel>

      <Panel tone="paper">
        <p className="eyebrow text-[9px] text-stone">What you can hold us to</p>
        <dl className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
          {promises.map((promise, index) => (
            <Reveal key={promise.index} delay={index * 0.06}>
              <dt className="eyebrow text-[9px] text-gold">{promise.index}</dt>
              <dd className="mt-3">
                <p className="text-[15px] text-ink">{promise.title}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-ash">{promise.body}</p>
              </dd>
            </Reveal>
          ))}
        </dl>
      </Panel>

      <Panel tone="cream">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow text-[9px] text-stone">In their words</p>
            <h2 className="mt-4 text-[clamp(1.35rem,2.8vw,2rem)]">
              {ratingSummary.average} out of 5, across {ratingSummary.count} reviews
            </h2>
          </div>
          <Stars rating={ratingSummary.average} size={16} />
        </div>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review, index) => (
            <Reveal key={review.id} delay={Math.min(index, 3) * 0.05}>
              <li className="flex h-full flex-col border border-line bg-paper p-6">
                <Stars rating={review.rating} size={13} />
                <p className="mt-4 text-[14px] leading-snug text-ink">{review.title}</p>
                <p className="mt-3 flex-1 text-[13px] leading-relaxed text-ash">
                  {review.body}
                </p>
                <p className="eyebrow mt-6 border-t border-line pt-4 text-[8px] text-stone">
                  {review.name} &middot; {review.location} &middot;{" "}
                  {formatDate(review.publishedOn)}
                </p>
              </li>
            </Reveal>
          ))}
        </ul>
      </Panel>

      <section className="bg-wine py-16 text-cream sm:py-20">
        <Shell className="flex flex-wrap items-center justify-between gap-8">
          <div>
            <Statement className="max-w-xl">Come and weigh it yourself</Statement>
            <p className="mt-5 max-w-md text-[14px] leading-relaxed text-cream/75">
              The showroom is open {site.hours.toLowerCase()}. {site.closedOn}. Ask for
              the estimate before you ask for the price.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/stores" variant="gold">
              Showroom details
            </ButtonLink>
            <ButtonLink href="/contact" variant="light">
              Contact us
            </ButtonLink>
          </div>
        </Shell>
      </section>
    </>
  );
}
