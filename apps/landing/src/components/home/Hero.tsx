import Image from "next/image";
import Link from "next/link";
import { ArrowDown, Star } from "lucide-react";
import { Shell } from "@/components/ui/Shell";
import { HeroIntro } from "@/components/home/HeroIntro";
import { ratingSummary, reviews } from "@/data/reviews";

const fade = {
  maskImage: "linear-gradient(to right, transparent 0%, black 38%)",
  WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 38%)",
};

/**
 * Deep Blue wash with the headline, a glass pill of two CTAs and a happy
 * customers card on the left; the portrait melts into the wash on the right.
 */
export function Hero() {
  const avatars = reviews.slice(0, 3);

  return (
    <section className="relative isolate overflow-hidden rounded-b-[2rem] bg-brand-wash text-cream sm:rounded-b-[3rem]">
      <div className="absolute inset-0 -z-10 lg:left-auto lg:w-[62%]" style={fade}>
        <Image
          src="/images/categories/cat-diamond.webp"
          alt="Three diamond rings worn on one hand against a navy silk collar"
          fill
          priority
          sizes="(min-width: 1024px) 62vw, 100vw"
          className="object-cover object-[center_30%] opacity-45 lg:opacity-100"
        />
      </div>

      <Shell className="flex min-h-[560px] items-center py-16 sm:min-h-[600px] lg:min-h-[640px] lg:py-20">
        <HeroIntro>
          <h1 className="max-w-[13ch] font-sans text-[clamp(2.5rem,5vw,3.9rem)] font-light not-italic leading-[1.1] tracking-[-0.01em]">
            Jewels that carry your story.
          </h1>
          <p className="mt-2 font-serif text-[clamp(2rem,4vw,3.2rem)]  leading-tight text-cream/90">
            Hallmarked &amp; handmade
          </p>

          <div className="mt-9 inline-flex items-center gap-1.5 rounded-full border border-cream/25 bg-cream/10 p-1.5 backdrop-blur-md">
            <span className="flex items-center gap-5 pl-5 pr-1">
              <Link href="/shop" className="py-2 text-[13px] transition-colors hover:text-gold">
                Shop collection
              </Link>
              <a
                href="#explore"
                aria-label="Scroll to explore by style"
                className="grid size-8 place-items-center rounded-full bg-cream text-wine transition-transform hover:translate-y-0.5"
              >
                <ArrowDown className="size-4" />
              </a>
            </span>
            <Link
              href="/about"
              className="rounded-full bg-cream px-5 py-2.5 text-[13px] font-medium text-wine transition-colors hover:bg-gold hover:text-ink"
            >
              Our story
            </Link>
          </div>

          <Link
            href="#reviews"
            className="mt-8 flex w-fit items-center gap-4 rounded-2xl border border-cream/20 bg-cream/10 py-3 pl-3 pr-5 backdrop-blur-md transition-colors hover:bg-cream/15"
          >
            <span className="flex -space-x-2.5">
              {avatars.map((review, index) => (
                <span
                  key={review.id}
                  className={[
                    "grid size-11 place-items-center rounded-full border-2 border-cream/70 font-serif text-[18px] ",
                    index === 0 ? "bg-gold text-ink" : index === 1 ? "bg-cream text-wine" : "bg-mist-deep text-wine",
                  ].join(" ")}
                  aria-hidden
                >
                  {review.name.charAt(0)}
                </span>
              ))}
            </span>
            <span>
              <span className="block text-[14px]">Our happy customers</span>
              <span className="mt-0.5 flex items-center gap-1 text-[11px] text-cream/75">
                <Star className="size-3 fill-gold text-gold" aria-hidden />
                {ratingSummary.average} ({ratingSummary.count}+ reviews)
              </span>
            </span>
          </Link>
        </HeroIntro>
      </Shell>
    </section>
  );
}
