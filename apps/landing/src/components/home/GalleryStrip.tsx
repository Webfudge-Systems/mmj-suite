import Image from "next/image";
import { site } from "@/data/site";

/** Lucide dropped brand marks in v1, so the glyph is inlined. */
function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 text-ash" fill="none" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

const strip = [
  { src: "/images/lifestyle/life-neck.webp", alt: "Layered diamond necklace at the collarbone" },
  { src: "/images/lifestyle/life-bangles.webp", alt: "Stacked gold bangles on a wrist" },
  { src: "/images/categories/cat-gold.webp", alt: "Gold choker and jhumka in profile" },
  { src: "/images/lifestyle/life-ear.webp", alt: "Jhumka with a pearl fringe" },
  { src: "/images/lifestyle/life-bridal.webp", alt: "Bride in full bridal jewellery" },
];

/** Edge-to-edge five-up row, no container, as on the reference. */
export function GalleryStrip() {
  const instagram = site.social.find((entry) => entry.label === "Instagram");

  return (
    <section className="bg-cream pb-0">
      <div className="flex items-center justify-center gap-2 py-8">
        <InstagramGlyph />
        <a
          href={instagram?.href ?? "https://instagram.com"}
          target="_blank"
          rel="noreferrer noopener"
          className="eyebrow text-[10px] text-ink transition-opacity hover:opacity-60"
        >
          Follow @mukundmaidjewellers
        </a>
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {strip.map((shot) => (
          <li key={shot.src} className="group relative aspect-square overflow-hidden bg-cream-deep last:hidden sm:last:block">
            <Image
              src={shot.src}
              alt={shot.alt}
              fill
              sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-105"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
