import { Panel } from "@/components/ui/Panel";
import { Stars } from "@/components/ui/Stars";
import { Reveal } from "@/components/ui/Reveal";
import { ArrowCta } from "@/components/ui/Button";
import { ratingSummary, reviews } from "@/data/reviews";
import { formatDate } from "@/lib/utils";

/** Three cards under a centred heading, as the reference arranges them. */
export function Reviews() {
  return (
    <Panel tone="cream">
      <div className="text-center">
        <Stars rating={5} className="justify-center" size={15} />
        <h2 className="mt-5 text-[clamp(1.5rem,3vw,2.25rem)]">Exceptional quality</h2>
        <p className="mx-auto mt-4 max-w-md text-[13px] leading-relaxed text-ash">
          {ratingSummary.average} out of 5 across {ratingSummary.count} reviews from
          customers in Rahuri, Ahmednagar and beyond.
        </p>
      </div>

      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        {reviews.slice(0, 3).map((review, index) => (
          <Reveal key={review.id} delay={index * 0.06}>
            <figure className="flex h-full flex-col border border-line bg-paper p-7">
              <Stars rating={review.rating} size={13} />
              <blockquote className="mt-5 flex-1">
                <p className="text-[14px] leading-snug text-ink">{review.title}</p>
                <p className="mt-3 text-[13px] leading-relaxed text-ash">{review.body}</p>
              </blockquote>
              <figcaption className="mt-7 flex items-center gap-3 border-t border-line pt-5">
                <span className="grid size-9 shrink-0 place-items-center bg-wine text-[12px] text-cream">
                  {review.name.charAt(0)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-ink">{review.name}</span>
                  <span className="eyebrow block text-[8px] text-stone">
                    {review.location} &middot; {formatDate(review.publishedOn)}
                  </span>
                </span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>

      <div className="mt-10 text-center">
        <ArrowCta href="/about">Read more reviews</ArrowCta>
      </div>
    </Panel>
  );
}
