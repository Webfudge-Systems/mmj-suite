"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Shell } from "@/components/ui/Shell";
import { ProductCard } from "@/components/commerce/ProductCard";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

type ProductSet = { key: string; label: string; products: Product[] };

const PAGE = 4;

/**
 * Large lifestyle image on the left, a 2×2 page of product cards on the right,
 * tabs to switch the set and round arrows to page through it.
 */
export function FeaturedCarousel({ sets }: { sets: ProductSet[] }) {
  const [active, setActive] = useState(sets[0].key);
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(1);

  const current = sets.find((set) => set.key === active) ?? sets[0];
  const pages = Math.max(1, Math.ceil(current.products.length / PAGE));
  const visible = current.products.slice(page * PAGE, page * PAGE + PAGE);

  const go = (step: number) => {
    setDirection(step);
    setPage((value) => (value + step + pages) % pages);
  };

  return (
    <section className="bg-paper py-16 sm:py-20">
      <Shell>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="text-[clamp(1.9rem,3.4vw,2.6rem)] text-ink">Featured products</h2>
            <p className="mt-2 text-[14px] text-ash">Our most-loved designs, ready to become yours.</p>
          </div>

          <div className="flex items-center gap-5">
            {sets.length > 1 && (
            <div role="tablist" aria-label="Product sets" className="hidden gap-1 sm:flex">
              {sets.map((set) => (
                <button
                  key={set.key}
                  type="button"
                  role="tab"
                  aria-selected={set.key === active}
                  onClick={() => {
                    setActive(set.key);
                    setPage(0);
                  }}
                  className={cn(
                    "rounded-full px-4 py-2 text-[12px] transition-colors",
                    set.key === active ? "bg-mist text-wine" : "text-ash hover:text-wine",
                  )}
                >
                  {set.label}
                </button>
              ))}
            </div>
            )}
            {pages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous products"
                  className="grid size-9 place-items-center rounded-full border border-ink/40 text-ink transition-colors hover:border-ink"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next products"
                  className="grid size-9 place-items-center rounded-full bg-ink text-cream transition-colors hover:bg-wine"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <Link
            href="/collections/everyday-light"
            className="group relative hidden min-h-[520px] overflow-hidden rounded-3xl bg-fog lg:block"
          >
            <Image
              src="/images/lifestyle/life-neck.webp"
              alt="Layered diamond necklace with a pear drop at the collarbone"
              fill
              sizes="50vw"
              className="object-cover transition-transform duration-1000 ease-[var(--ease-out-soft)] group-hover:scale-[1.03]"
            />
            <span className="absolute bottom-6 left-6 rounded-full bg-paper/90 px-4 py-2.5 text-[13px] text-ink backdrop-blur">
              Everyday Light, under ten grams
            </span>
          </Link>

          <div className="relative overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
              <motion.ul
                key={`${active}-${page}`}
                custom={direction}
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -40 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="grid grid-cols-2 gap-3 sm:gap-5"
              >
                {visible.map((product) => (
                  <li key={product.slug}>
                    <ProductCard product={product} sizes="(min-width: 1024px) 22vw, 50vw" />
                  </li>
                ))}
              </motion.ul>
            </AnimatePresence>
          </div>
        </div>

        {pages > 1 && (
          <div className="mt-6 flex justify-center gap-1.5" aria-hidden>
            {Array.from({ length: pages }, (_, index) => (
              <span
                key={index}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  index === page ? "w-6 bg-wine" : "w-1.5 bg-line",
                )}
              />
            ))}
          </div>
        )}
      </Shell>
    </section>
  );
}
