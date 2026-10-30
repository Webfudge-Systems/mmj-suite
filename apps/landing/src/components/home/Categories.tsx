import Image from "next/image";
import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { Reveal } from "@/components/ui/Reveal";
import { metalCounters } from "@/data/categories";

const tiles = ["gold", "diamond", "silver"] as const;

/**
 * Flush 2×2 category mosaic: section label left, short description right,
 * equal image cells with a hairline cream gutter and centered bottom labels.
 */
export function Categories() {
  const counters = tiles
    .map((slug) => metalCounters.find((counter) => counter.slug === slug))
    .filter((counter): counter is NonNullable<typeof counter> => Boolean(counter));

  const [gold, diamond, silver] = counters;

  return (
    <Panel tone="cream" className="pt-0">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between sm:gap-12">
        <h2 className="eyebrow shrink-0 text-[13px] text-ink sm:text-[15px]">Categories</h2>
        <p className="max-w-md text-[13px] leading-relaxed text-ash sm:text-right sm:text-[14px]">
          Discover timeless jewelry collections crafted with exceptional quality, elegant
          design, and lasting beauty for every meaningful occasion.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-0.5">
        <Reveal>
          <Tile counter={gold} />
        </Reveal>
        <Reveal delay={0.06}>
          <Tile counter={diamond} />
        </Reveal>
        <Reveal delay={0.1}>
          <Tile counter={silver} />
        </Reveal>
        <Reveal delay={0.14}>
          <Link
            href="/shop/mens"
            className="group relative block aspect-4/5 overflow-hidden bg-cream-deep"
          >
            <Image
              src="/images/categories/cat-mens.webp"
              alt="Gold cuban chain and signet ring worn with a charcoal blazer"
              fill
              sizes="(min-width: 1024px) 50vw, 50vw"
              className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-105"
            />
            <Caption title="For men" />
          </Link>
        </Reveal>
      </div>
    </Panel>
  );
}

function Tile({ counter }: { counter: (typeof metalCounters)[number] }) {
  return (
    <Link
      href={`/shop/${counter.slug}`}
      className="group relative block aspect-4/5 overflow-hidden bg-cream-deep"
    >
      <Image
        src={counter.image}
        alt={counter.tagline}
        fill
        sizes="(min-width: 1024px) 50vw, 50vw"
        className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-105"
      />
      <Caption title={counter.name} />
    </Link>
  );
}

function Caption({ title }: { title: string }) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-ink/50 via-ink/15 to-transparent px-4 pb-5 pt-16 sm:pb-7">
      <p className="text-center text-[12px] tracking-wide text-cream sm:text-[13px]">{title}</p>
    </div>
  );
}
