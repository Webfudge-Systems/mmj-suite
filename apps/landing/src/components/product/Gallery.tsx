"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Heart } from "lucide-react";
import { useWishlist } from "@/store/wishlist";
import { useHydrated } from "@/store/ui";
import { cn } from "@/lib/utils";

/**
 * Swipeable photo frame with a counter, a heart, and a thumbnail strip under
 * it. Swiping snaps one photo at a time on a phone; the strip jumps to one.
 */
export function Gallery({ images, name, slug }: { images: string[]; name: string; slug: string }) {
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const hydrated = useHydrated();
  const { slugs, toggle } = useWishlist();
  const saved = hydrated && slugs.includes(slug);

  const sync = () => {
    const el = track.current;
    if (el) setActive(Math.round(el.scrollLeft / el.clientWidth));
  };
  const go = (index: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div>
      <div className="relative">
        <ul
          ref={track}
          onScroll={sync}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-3xl bg-fog"
        >
          {images.map((image, index) => (
            <li key={image} className="relative aspect-square w-full shrink-0 snap-center">
              <Image
                src={image}
                alt={index === 0 ? name : ""}
                fill
                priority={index === 0}
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => toggle(slug)}
          aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
          aria-pressed={saved}
          className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-paper/90 text-ink shadow-sm backdrop-blur transition-transform active:scale-90"
        >
          <Heart className={cn("size-[18px]", saved && "fill-wine text-wine")} strokeWidth={1.6} />
        </button>

        {images.length > 1 && (
          <span className="absolute bottom-3 right-3 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] tabular-nums text-cream backdrop-blur">
            {active + 1} / {images.length}
          </span>
        )}
      </div>

      {images.length > 1 && (
        <ul className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto">
          {images.map((image, index) => (
            <li key={image} className="shrink-0">
              <button
                type="button"
                onClick={() => go(index)}
                aria-label={`View image ${index + 1}`}
                aria-current={index === active}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-xl bg-fog ring-2 transition sm:size-[72px]",
                  index === active ? "ring-wine" : "ring-transparent",
                )}
              >
                <Image src={image} alt="" fill sizes="72px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
