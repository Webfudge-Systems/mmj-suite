"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Search, X } from "lucide-react";
import { Shell } from "@/components/ui/Shell";
import { useUi } from "@/store/ui";
import { searchProducts } from "@/lib/catalog";
import { formatPrice } from "@/lib/utils";

export function SearchOverlay() {
  const { searchOpen, closeSearch } = useUi();
  const [query, setQuery] = useState("");
  const router = useRouter();
  const results = searchProducts(query).slice(0, 5);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    closeSearch();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <AnimatePresence>
      {searchOpen && (
        <motion.div
          className="fixed inset-0 z-[90]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Close search"
            onClick={closeSearch}
            className="absolute inset-0 h-full w-full cursor-default bg-ink/50"
          />
          <motion.div
            className="relative bg-cream pb-10 pt-6"
            initial={{ y: -24 }}
            animate={{ y: 0 }}
            exit={{ y: -24 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <Shell>
              <form onSubmit={submit} className="flex items-center gap-4 border-b border-ink pb-4">
                <Search className="size-5 shrink-0 text-stone" aria-hidden />
                <input
                  autoFocus
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, design number or SKU"
                  aria-label="Search the catalogue"
                  className="w-full bg-transparent text-[16px] text-ink outline-none placeholder:text-stone sm:text-[20px]"
                />
                <button
                  type="button"
                  onClick={closeSearch}
                  aria-label="Close search"
                  className="shrink-0 text-stone transition-colors hover:text-ink"
                >
                  <X className="size-5" />
                </button>
              </form>

              {query.trim() && (
                <div className="mt-6">
                  {results.length === 0 ? (
                    <p className="text-[14px] text-ash">
                      Nothing matches &ldquo;{query}&rdquo;. Try a metal, an ornament or a design number.
                    </p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {results.map((product) => (
                        <li key={product.slug}>
                          <Link
                            href={`/products/${product.slug}`}
                            onClick={closeSearch}
                            className="flex items-center gap-4 py-3"
                          >
                            <div className="relative size-14 shrink-0 overflow-hidden bg-cream-deep">
                              <Image
                                src={product.images[0]}
                                alt=""
                                fill
                                sizes="56px"
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[14px] text-ink">{product.name}</p>
                              <p className="eyebrow text-[9px] text-stone">
                                {product.purity} &middot; {product.designNumber}
                              </p>
                            </div>
                            <p className="text-[13px] tabular-nums text-ink">
                              {formatPrice(product.price)}
                            </p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Shell>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
