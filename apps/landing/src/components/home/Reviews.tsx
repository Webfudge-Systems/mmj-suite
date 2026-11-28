"use client";

import { useRef } from "react";
import Image from "next/image";
import { BadgeCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { Shell } from "@/components/ui/Shell";
import { Stars } from "@/components/ui/Stars";
import { ratingSummary, reviews } from "@/data/reviews";
import { getProducts } from "@/lib/catalog";

/** "3 months ago" from an ISO date, against today. */
function ago(iso: string) {
  const days = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000));
  if (days < 1) return "today";
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.round(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

/** Product thumbnail for a review, matched by name against the catalogue. */
function thumbFor(name: string) {
  const product = getProducts().find((entry) => entry.name === name);
  return product?.images[0];
}

/**
 * Title, rating and arrows over a photograph on the left; a sideways strip of
 * review cards on the right that the arrows scroll.
 */
export function Reviews() {
  const track = useRef<HTMLUListElement>(null);

  const scroll = (step: number) => {
    const list = track.current;
    if (!list) return;
    const card = list.querySelector("li");
    const width = card ? card.getBoundingClientRect().width + 20 : 320;
    list.scrollBy({ left: step * width, behavior: "smooth" });
  };

  return (
    <section id="reviews" className="scroll-mt-28 bg-fog py-16 sm:py-20">
      <Shell className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12">
        <div className="flex flex-col">
          <h2 className="max-w-[12ch] text-[clamp(2.2rem,4vw,3.2rem)] text-ink">
            Reviews from our customers
          </h2>
          <div className="mt-5 flex items-center gap-3">
            <span className="font-serif text-[40px]  leading-none text-ink">{ratingSummary.average}</span>
            <span>
              <Stars rating={ratingSummary.average} size={14} />
              <span className="mt-1 block text-[12px] text-ash">{ratingSummary.count} reviews</span>
            </span>
          </div>
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => scroll(-1)}
              aria-label="Previous reviews"
              className="grid size-10 place-items-center rounded-full border border-ink/40 text-ink transition-colors hover:border-ink"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              aria-label="Next reviews"
              className="grid size-10 place-items-center rounded-full bg-ink text-cream transition-colors hover:bg-wine"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="relative mt-8 hidden min-h-[240px] flex-1 overflow-hidden rounded-3xl lg:block">
            <Image
              src="/images/lifestyle/life-showroom.webp"
              alt="The MMJ showroom with lit display cases of gold"
              fill
              sizes="33vw"
              className="object-cover"
            />
          </div>
        </div>

        <ul
          ref={track}
          className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0"
        >
          {reviews.map((review) => {
            const thumb = thumbFor(review.product);
            return (
              <li key={review.id} className="w-[290px] shrink-0 snap-start sm:w-[340px]">
                <figure className="flex h-full flex-col rounded-2xl border border-line bg-paper p-6 sm:p-7">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[14px] font-medium text-ink">{review.name}</p>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-ash">
                        <BadgeCheck className="size-3.5 text-wine" aria-hidden />
                        Verified customer
                      </p>
                    </div>
                    <Stars rating={review.rating} size={13} />
                  </div>
                  <blockquote className="mt-6 flex-1">
                    <p className="font-serif text-[20px]  leading-snug text-ink">
                      &ldquo;{review.title}.&rdquo;
                    </p>
                    <p className="mt-3 text-[13px] leading-relaxed text-ash">{review.body}</p>
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 border-t border-line pt-5">
                    <span className="relative size-11 shrink-0 overflow-hidden rounded-2xl bg-fog">
                      {thumb ? (
                        <Image src={thumb} alt="" fill sizes="44px" className="object-cover" />
                      ) : (
                        <span className="grid size-full place-items-center bg-mist font-serif text-[18px]  text-wine">
                          {review.product.charAt(0)}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-medium text-ink">{review.product}</span>
                      <span className="block text-[11px] text-stone" suppressHydrationWarning>
                        {review.location}, {ago(review.publishedOn)}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              </li>
            );
          })}
        </ul>
      </Shell>
    </section>
  );
}
