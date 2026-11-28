import { BadgeCheck } from "lucide-react";
import { Shell } from "@/components/ui/Shell";
import { Stars } from "@/components/ui/Stars";
import { ButtonLink } from "@/components/ui/Button";
import { ratingSummary, reviews } from "@/data/reviews";
import { formatDate } from "@/lib/utils";

/**
 * Item reviews, as on the reference product page. The sample reviews belong to
 * the showroom as a whole, so a live piece is headed as store reviews rather
 * than claiming them for itself.
 */
export function ProductReviews({ live }: { live: boolean }) {
  const counts = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((review) => review.rating === stars).length,
  }));
  const total = reviews.length || 1;

  return (
    <section className="border-t border-line bg-paper py-16 sm:py-20">
      <Shell className="grid gap-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <div>
          <h2 className="text-[clamp(2rem,3.4vw,2.6rem)] text-ink">
            {live ? "What customers say about MMJ" : "Item reviews"}
          </h2>
          <div className="mt-6 flex items-center gap-4">
            <span className="text-[44px] font-light leading-none text-ink">{ratingSummary.average}</span>
            <span>
              <Stars rating={ratingSummary.average} size={15} />
              <span className="mt-1 block text-[12px] text-ash">{ratingSummary.count} reviews</span>
            </span>
          </div>

          <ul className="mt-6 space-y-2">
            {counts.map((row) => (
              <li key={row.stars} className="flex items-center gap-3 text-[12px] text-ash">
                <span className="w-3 tabular-nums">{row.stars}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-fog">
                  <span
                    className="block h-full rounded-full bg-gold"
                    style={{ width: `${(row.count / total) * 100}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>

          <ButtonLink href="/contact" variant="ink" className="mt-8">
            Write a review
          </ButtonLink>
        </div>

        <ul className="divide-y divide-line border-y border-line">
          {reviews.slice(0, 4).map((review) => (
            <li key={review.id} className="py-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Stars rating={review.rating} size={13} />
                <span className="text-[12px] text-stone">{formatDate(review.publishedOn)}</span>
              </div>
              <p className="mt-3 text-[15px] font-medium text-ink">{review.title}</p>
              <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ash">{review.body}</p>
              <p className="mt-4 flex items-center gap-1.5 text-[12px] text-ash">
                <BadgeCheck className="size-3.5 text-wine" aria-hidden />
                {review.name}, {review.location}, bought the {review.product}
              </p>
            </li>
          ))}
        </ul>
      </Shell>
    </section>
  );
}
