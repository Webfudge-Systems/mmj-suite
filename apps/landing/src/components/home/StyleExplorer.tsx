import Image from "next/image";
import Link from "next/link";
import { Shell } from "@/components/ui/Shell";
import { categories } from "@/data/categories";

const picks = ["rings", "earrings", "necklaces", "bangles", "mangalsutra", "chains", "pendants", "bracelets"];

/** Row of round ornament tiles under a centred serif title; scrolls sideways on phones. */
export function StyleExplorer() {
  const tiles = picks
    .map((slug) => categories.find((category) => category.slug === slug))
    .filter((category): category is NonNullable<typeof category> => Boolean(category));

  return (
    <section id="explore" className="scroll-mt-28 bg-paper pt-16 sm:pt-20">
      <Shell>
        <h2 className="text-center text-[clamp(1.9rem,3.4vw,2.6rem)] text-ink">Explore by style</h2>
      </Shell>

      <div className="no-scrollbar mt-10 overflow-x-auto">
        <ul className="mx-auto flex w-max gap-5 px-5 sm:gap-7 sm:px-8 lg:w-full lg:max-w-[1440px] lg:justify-between lg:gap-4 lg:px-[78px]">
          {tiles.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/shop/${category.slug}`}
                className="group flex w-[104px] flex-col items-center gap-3.5 sm:w-[124px]"
              >
                <span className="relative block size-[104px] overflow-hidden rounded-full bg-[radial-gradient(circle_at_50%_35%,#ffffff,var(--color-fog)_70%)] ring-1 ring-line transition duration-500 ease-[var(--ease-out-soft)] group-hover:ring-4 group-hover:ring-mist-deep sm:size-[124px]">
                  <Image
                    src={category.image}
                    alt=""
                    fill
                    sizes="124px"
                    className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-110"
                  />
                </span>
                <span className="text-[13px] font-medium text-ink transition-colors group-hover:text-wine">
                  {category.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
