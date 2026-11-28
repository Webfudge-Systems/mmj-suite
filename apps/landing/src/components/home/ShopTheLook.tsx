"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Plus, X } from "lucide-react";
import { Shell } from "@/components/ui/Shell";
import { ArrowCta } from "@/components/ui/Button";
import { priceText } from "@/components/commerce/ProductCard";
import { getProductBySlug, getProducts } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import type { CategorySlug, Product } from "@/types";

type Spot = {
  label: string;
  /** Position on the portrait, in per cent. */
  x: number;
  y: number;
  /** The sample-catalogue piece; if the live catalogue lacks it, the first piece in `category` is used. */
  slug: string;
  category: CategorySlug;
};

type Look = { key: string; name: string; image: string; alt: string; spots: Spot[] };

const looks: Look[] = [
  {
    key: "bridal",
    name: "Bridal polki",
    image: "/images/lifestyle/life-bridal.webp",
    alt: "Bride in a red silk saree wearing a polki choker, long haram, jhumkas and a nath",
    spots: [
      { label: "Earrings", x: 62, y: 42, slug: "kamal-jhumka", category: "earrings" },
      { label: "Nose pin", x: 37, y: 37, slug: "diamond-flower-nosepin", category: "nosepins" },
      { label: "Choker", x: 55, y: 57, slug: "polki-bridal-choker", category: "necklaces" },
      { label: "Long haram", x: 34, y: 80, slug: "maharani-long-haram", category: "necklaces" },
    ],
  },
  {
    key: "temple",
    name: "Temple gold",
    image: "/images/lifestyle/life-hero.webp",
    alt: "Three layered gold chains with temple pendants over an ivory drape",
    spots: [
      { label: "Pendant", x: 47, y: 47, slug: "ganesh-pendant", category: "pendants" },
      { label: "Temple necklace", x: 45, y: 81, slug: "kalyani-temple-necklace", category: "necklaces" },
      { label: "Chain", x: 26, y: 30, slug: "rope-chain-20", category: "chains" },
    ],
  },
  {
    key: "diamond",
    name: "Diamond drop",
    image: "/images/lifestyle/life-neck.webp",
    alt: "Two-strand diamond necklace with a pear drop against black silk",
    spots: [
      { label: "Necklace", x: 54, y: 47, slug: "drift-diamond-necklace", category: "necklaces" },
      { label: "Pendant", x: 52, y: 74, slug: "solitaire-pendant", category: "pendants" },
    ],
  },
];

function resolve(spot: Spot): Product | undefined {
  return (
    getProductBySlug(spot.slug) ??
    getProducts().find((product) => product.category === spot.category)
  );
}

/**
 * Bridal "shop the look": pick a look on the left, tap a tag on the portrait to
 * see the piece, its price and a link straight to it.
 */
export function ShopTheLook() {
  const [lookKey, setLookKey] = useState(looks[0].key);
  const [open, setOpen] = useState<string | null>(null);
  const look = looks.find((entry) => entry.key === lookKey) ?? looks[0];

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <section className="bg-paper pb-16 sm:pb-20">
      <Shell>
        <div className="grid overflow-hidden rounded-3xl bg-mist-wash lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="flex flex-col justify-center px-7 py-12 sm:px-12 lg:py-16">
            <h2 className="text-[clamp(2.2rem,4.4vw,3.4rem)] text-ink">Bridal elegance</h2>
            <p className="mt-4 max-w-sm text-[16px] leading-relaxed text-ash">
              Complete jewels for the wedding day, from the haldi to the pheras. Tap a tag to see
              each piece.
            </p>

            <div role="tablist" aria-label="Looks" className="mt-9 flex gap-3">
              {looks.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  role="tab"
                  aria-selected={entry.key === lookKey}
                  onClick={() => {
                    setLookKey(entry.key);
                    setOpen(null);
                  }}
                  className={cn(
                    "group w-[92px] rounded-2xl bg-paper p-1.5 text-left shadow-sm ring-1 transition sm:w-[112px]",
                    entry.key === lookKey ? "ring-wine" : "ring-transparent hover:ring-mist-deep",
                  )}
                >
                  <span className="relative block aspect-[4/5] overflow-hidden rounded-2xl bg-fog">
                    <Image src={entry.image} alt="" fill sizes="112px" className="object-cover" />
                  </span>
                  <span
                    className={cn(
                      "mt-2 block px-0.5 pb-0.5 text-[11px]",
                      entry.key === lookKey ? "text-wine" : "text-ash",
                    )}
                  >
                    {entry.name}
                  </span>
                </button>
              ))}
            </div>

            <ArrowCta href="/collections/bridal-vault" className="mt-10 self-start">
              Explore the bridal vault
            </ArrowCta>
          </div>

          <div className="relative min-h-[460px] sm:min-h-[560px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={look.key}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
              >
                <Image
                  src={look.image}
                  alt={look.alt}
                  fill
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  className="object-cover object-top"
                />

                {look.spots.map((spot) => {
                  const product = resolve(spot);
                  const id = `${look.key}-${spot.label}`;
                  const isOpen = open === id;
                  const flip = spot.x > 55;
                  const below = spot.y < 30;

                  return (
                    <div
                      key={id}
                      className={cn("absolute", isOpen && "z-20")}
                      style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                    >
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : id)}
                        aria-expanded={isOpen}
                        className={cn(
                          "flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-2 text-[12px] shadow-md transition-colors",
                          isOpen
                            ? "border-wine bg-wine text-cream"
                            : "border-paper bg-paper/95 text-ink hover:bg-paper",
                        )}
                      >
                        {isOpen ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
                        {spot.label}
                      </button>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.97 }}
                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                            className={cn(
                              "absolute z-10 w-[200px] rounded-2xl border border-mist-deep bg-paper p-2.5 shadow-[0_20px_40px_-20px_rgba(10,40,116,0.5)]",
                              flip ? "right-1/2 mr-2" : "left-1/2 ml-2",
                              below ? "top-6" : "bottom-6",
                            )}
                          >
                            {product ? (
                              <Link href={`/products/${product.slug}`} className="group block">
                                <span className="relative block aspect-[4/3] overflow-hidden rounded-2xl bg-fog">
                                  <Image
                                    src={product.images[0]}
                                    alt=""
                                    fill
                                    sizes="200px"
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                  />
                                </span>
                                <span className="mt-2.5 block truncate text-[12px] text-ink group-hover:text-wine">
                                  {product.name}
                                </span>
                                <span className="mt-1 flex items-baseline justify-between text-[12px]">
                                  <span className="text-stone">At today&rsquo;s rate</span>
                                  <span className="font-semibold tabular-nums text-ink">{priceText(product)}</span>
                                </span>
                              </Link>
                            ) : (
                              <Link
                                href={`/shop/${spot.category}`}
                                className="block p-2 text-[12px] text-wine underline-offset-4 hover:underline"
                              >
                                See all {spot.label.toLowerCase()}
                              </Link>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Shell>
    </section>
  );
}
