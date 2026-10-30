"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Heart, Menu, Search, ShoppingBag, User } from "lucide-react";
import { Shell } from "@/components/ui/Shell";
import { Wordmark } from "@/components/layout/Wordmark";
import { useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import { useHydrated, useUi } from "@/store/ui";
import { categories, metalCounters } from "@/data/categories";
import { collections } from "@/data/collections";
import { cn } from "@/lib/utils";

const utilityIcon = "relative text-ink transition-colors hover:text-wine";

export function Header() {
  const [panel, setPanel] = useState<string | null>(null);
  const hydrated = useHydrated();
  const cartCount = useCart((state) => state.lines.reduce((n, l) => n + l.quantity, 0));
  const wishCount = useWishlist((state) => state.slugs.length);
  const { openCart, toggleNav, toggleSearch } = useUi();

  return (
    <header
      className="border-b border-line bg-cream"
      onMouseLeave={() => setPanel(null)}
    >
      <Shell className="grid h-[4.5rem] grid-cols-[1fr_auto_1fr] items-center gap-4 sm:h-24">
        {/* Left: primary nav on desktop, hamburger on mobile */}
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
          {metalCounters.slice(0, 3).map((counter) => (
            <button
              key={counter.slug}
              type="button"
              onMouseEnter={() => setPanel(counter.slug)}
              onFocus={() => setPanel(counter.slug)}
              className={cn(
                "eyebrow text-[10px] transition-colors",
                panel === counter.slug ? "text-wine" : "text-ink hover:text-wine",
              )}
            >
              {counter.name}
            </button>
          ))}
          <button
            type="button"
            onMouseEnter={() => setPanel("collections")}
            onFocus={() => setPanel("collections")}
            className={cn(
              "eyebrow text-[10px] transition-colors",
              panel === "collections" ? "text-wine" : "text-ink hover:text-wine",
            )}
          >
            Collections
          </button>
        </nav>

        <button
          type="button"
          onClick={toggleNav}
          aria-label="Open menu"
          className={cn(utilityIcon, "justify-self-start lg:hidden")}
        >
          <Menu className="size-5" />
        </button>

        {/* Centre: full Primary Logo lockup */}
        <div className="justify-self-center">
          <Wordmark />
        </div>

        {/* Right: utilities */}
        <div className="flex items-center gap-4 justify-self-end sm:gap-5">
          <button type="button" onClick={toggleSearch} aria-label="Search" className={utilityIcon}>
            <Search className="size-[18px]" />
          </button>
          <Link href="/account" aria-label="Account" className={cn(utilityIcon, "hidden sm:block")}>
            <User className="size-[18px]" />
          </Link>
          <Link href="/wishlist" aria-label="Wishlist" className={utilityIcon}>
            <Heart className="size-[18px]" />
            {hydrated && wishCount > 0 && <Count value={wishCount} />}
          </Link>
          <button type="button" onClick={openCart} aria-label="Cart" className={utilityIcon}>
            <ShoppingBag className="size-[18px]" />
            {hydrated && cartCount > 0 && <Count value={cartCount} />}
          </button>
        </div>
      </Shell>

      <AnimatePresence>
        {panel && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 z-40 hidden border-b border-line bg-cream shadow-[0_24px_48px_-32px_rgba(17,16,16,0.4)] lg:block"
          >
            <Shell className="py-10">
              {panel === "collections" ? <CollectionsPanel /> : <MetalPanel metal={panel} />}
            </Shell>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function Count({ value }: { value: number }) {
  return (
    <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-wine text-[9px] leading-none text-cream tabular-nums">
      {value > 9 ? "9+" : value}
    </span>
  );
}

function MetalPanel({ metal }: { metal: string }) {
  const counter = metalCounters.find((entry) => entry.slug === metal);
  if (!counter) return null;

  return (
    <div className="grid grid-cols-[1fr_1fr_320px] gap-12">
      <div>
        <p className="eyebrow text-[9px] text-stone">Shop by ornament</p>
        <ul className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3">
          {categories.slice(0, 8).map((category) => (
            <li key={category.slug}>
              <Link
                href={`/shop/${metal}?category=${category.slug}`}
                className="text-[13px] text-ash transition-colors hover:text-ink"
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="eyebrow text-[9px] text-stone">Shop by occasion</p>
        <ul className="mt-5 space-y-3">
          {[
            { label: "Bridal", value: "bridal" },
            { label: "Festive", value: "festive" },
            { label: "Daily wear", value: "daily" },
            { label: "Gifting", value: "gifting" },
            { label: "For men", value: "mens" },
          ].map((entry) => (
            <li key={entry.value}>
              <Link
                href={`/shop/${metal}?occasion=${entry.value}`}
                className="text-[13px] text-ash transition-colors hover:text-ink"
              >
                {entry.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <Link href={`/shop/${counter.slug}`} className="group block">
        <div className="relative aspect-[4/3] overflow-hidden bg-cream-deep">
          <Image
            src={counter.image}
            alt={counter.name}
            fill
            sizes="320px"
            className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-105"
          />
        </div>
        <p className="eyebrow mt-4 text-[10px]">All {counter.name}</p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ash">{counter.tagline}</p>
      </Link>
    </div>
  );
}

function CollectionsPanel() {
  return (
    <div className="grid grid-cols-3 gap-8">
      {collections.slice(0, 6).map((collection) => (
        <Link key={collection.slug} href={`/collections/${collection.slug}`} className="group flex gap-4">
          <div className="relative size-20 shrink-0 overflow-hidden bg-cream-deep">
            <Image
              src={collection.image}
              alt=""
              fill
              sizes="80px"
              className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-105"
            />
          </div>
          <div>
            <p className="eyebrow text-[9px] text-stone">{collection.index}</p>
            <p className="mt-1 text-[13px] text-ink">{collection.name}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ash">{collection.tagline}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
