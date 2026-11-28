import Image from "next/image";
import Link from "next/link";
import { Shell } from "@/components/ui/Shell";
import { categories } from "@/data/categories";
import { cn } from "@/lib/utils";
import type { CategorySlug } from "@/types";

/**
 * "Select a style" row of round ornament tiles above the product grid, the way
 * the reference asks for a diamond shape. Tapping the active one clears it.
 */
export function StyleStrip({
  basePath,
  active,
  title = "Select a style",
}: {
  basePath: string;
  active?: CategorySlug;
  title?: string;
}) {
  return (
    <section className="border-b border-line bg-paper py-10">
      <Shell>
        <h2 className="text-center text-[clamp(1.7rem,3vw,2.2rem)] text-ink">{title}</h2>
      </Shell>
      <div className="no-scrollbar mt-7 overflow-x-auto">
        <ul className="mx-auto flex w-max gap-4 px-5 sm:gap-6 sm:px-8">
          {categories.map((category) => {
            const on = category.slug === active;
            return (
              <li key={category.slug}>
                <Link
                  href={on ? basePath : `${basePath}?category=${category.slug}`}
                  aria-current={on ? "true" : undefined}
                  className="group flex w-[84px] flex-col items-center gap-2.5"
                >
                  <span
                    className={cn(
                      "relative block size-[72px] overflow-hidden rounded-full bg-fog ring-1 transition",
                      on ? "ring-2 ring-wine" : "ring-line group-hover:ring-mist-deep group-hover:ring-4",
                    )}
                  >
                    <Image
                      src={category.image}
                      alt=""
                      fill
                      sizes="72px"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </span>
                  <span
                    className={cn(
                      "text-center text-[12px] leading-tight transition-colors",
                      on ? "font-medium text-wine" : "text-ash group-hover:text-wine",
                    )}
                  >
                    {category.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
