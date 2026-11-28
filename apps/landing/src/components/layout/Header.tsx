"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Heart, MapPin, Menu, Search, ShoppingBag, User } from "lucide-react";
import { Shell } from "@/components/ui/Shell";
import { Wordmark } from "@/components/layout/Wordmark";
import { useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import { useHydrated, useUi } from "@/store/ui";
import { categories, metalCounters } from "@/data/categories";
import { collections } from "@/data/collections";
import { cn } from "@/lib/utils";

const utilityIcon =
  "relative grid size-9 place-items-center rounded-full text-ink transition-colors hover:bg-mist hover:text-wine";

/** The second row of the header, centred under the logo as on the reference. */
const navItems: { label: string; href: string; panel?: string }[] = [
  { label: "Gold", href: "/shop/gold", panel: "gold" },
  { label: "Diamond", href: "/shop/diamond", panel: "diamond" },
  { label: "Silver", href: "/shop/silver", panel: "silver" },
  { label: "Bridal", href: "/collections/bridal-vault" },
  { label: "Collections", href: "/collections", panel: "collections" },
  { label: "Gold rate", href: "/gold-rate" },
  { label: "Savings scheme", href: "/gold-savings-scheme" },
];

export function Header() {
  const pathname = usePathname();
  // The panel remembers the page it was opened on, so navigating closes it.
  const [opened, setOpened] = useState<{ key: string | null; path: string }>({ key: null, path: "" });
  const panel = opened.path === pathname ? opened.key : null;
  const setPanel = (key: string | null) => setOpened({ key, path: pathname });
  const [scrolled, setScrolled] = useState(false);
  const hydrated = useHydrated();
  const cartCount = useCart((state) => state.lines.reduce((n, l) => n + l.quantity, 0));
  const wishCount = useWishlist((state) => state.slugs.length);
  const { openCart, toggleNav, toggleSearch } = useUi();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "relative border-b bg-paper transition-shadow duration-300",
        scrolled ? "border-transparent shadow-[0_10px_30px_-22px_rgba(10,40,116,0.45)]" : "border-line",
      )}
      onMouseLeave={() => setPanel(null)}
    >
      <Shell className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4 sm:h-[4.5rem]">
        <div className="flex items-center gap-1 justify-self-start">
          <button type="button" onClick={toggleNav} aria-label="Open menu" className={cn(utilityIcon, "bg-mist")}>
            <Menu className="size-[18px]" strokeWidth={1.6} />
          </button>
          <button type="button" onClick={toggleSearch} aria-label="Search" className={cn(utilityIcon, "hidden lg:grid")}>
            <Search className="size-[18px]" strokeWidth={1.6} />
          </button>
          <Link
            href="/stores"
            aria-label="Find the showroom"
            className={cn(utilityIcon, "hidden sm:grid")}
          >
            <MapPin className="size-[18px]" strokeWidth={1.6} />
          </Link>
        </div>

        <div className="justify-self-center">
          <Wordmark />
        </div>

        <div className="flex items-center gap-1 justify-self-end">
          <Link href="/wishlist" aria-label="Wishlist" className={cn(utilityIcon, "hidden lg:grid")}>
            <Heart className="size-[18px]" strokeWidth={1.6} />
            {hydrated && wishCount > 0 && <Count value={wishCount} />}
          </Link>
          <Link href="/account" aria-label="Account" className={utilityIcon}>
            <User className="size-[18px]" strokeWidth={1.6} />
          </Link>
          <button type="button" onClick={openCart} aria-label="Bag" className={cn(utilityIcon, "hidden lg:grid")}>
            <ShoppingBag className="size-[18px]" strokeWidth={1.6} />
            {hydrated && cartCount > 0 && <Count value={cartCount} />}
          </button>
        </div>
      </Shell>

      <nav aria-label="Main" className="hidden lg:block">
        <ul className="flex items-center justify-center gap-11 pb-3.5">
          {navItems.map((item) => {
            const active = pathname === item.href || panel === item.panel;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onMouseEnter={() => setPanel(item.panel ?? null)}
                  onFocus={() => setPanel(item.panel ?? null)}
                  className={cn(
                    "relative py-1.5 text-[13px] transition-colors",
                    "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:bg-wine after:transition-transform after:duration-300",
                    active
                      ? "text-wine after:scale-x-100"
                      : "text-ash after:scale-x-0 hover:text-wine hover:after:scale-x-100",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <AnimatePresence>
        {panel && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 top-full z-40 hidden border-y border-line bg-paper shadow-[0_30px_60px_-40px_rgba(10,40,116,0.5)] lg:block"
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
    <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-wine text-[9px] leading-none text-cream tabular-nums">
      {value > 9 ? "9+" : value}
    </span>
  );
}

function MetalPanel({ metal }: { metal: string }) {
  const counter = metalCounters.find((entry) => entry.slug === metal);
  if (!counter) return null;

  return (
    <div className="grid grid-cols-[1.4fr_1fr_340px] gap-12">
      <div>
        <p className="font-serif text-[22px]  text-ink">Shop by style</p>
        <ul className="mt-6 grid grid-cols-4 gap-x-4 gap-y-6">
          {categories.slice(0, 8).map((category) => (
            <li key={category.slug}>
              <Link
                href={`/shop/${metal}?category=${category.slug}`}
                className="group flex flex-col items-center gap-2.5 text-center"
              >
                <span className="relative size-16 overflow-hidden rounded-full bg-fog ring-1 ring-line transition group-hover:ring-wine/40">
                  <Image
                    src={category.image}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </span>
                <span className="text-[12px] text-ash transition-colors group-hover:text-wine">
                  {category.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="font-serif text-[22px]  text-ink">Shop by occasion</p>
        <ul className="mt-6 space-y-3.5">
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
                className="text-[13px] text-ash transition-colors hover:text-wine"
              >
                {entry.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <Link href={`/shop/${counter.slug}`} className="group block">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-cream-deep">
          <Image
            src={counter.image}
            alt={counter.name}
            fill
            sizes="340px"
            className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-105"
          />
        </div>
        <p className="mt-4 font-serif text-[20px]  text-ink">All {counter.name.toLowerCase()}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-ash">{counter.tagline}</p>
      </Link>
    </div>
  );
}

function CollectionsPanel() {
  return (
    <div className="grid grid-cols-3 gap-8">
      {collections.slice(0, 6).map((collection) => (
        <Link key={collection.slug} href={`/collections/${collection.slug}`} className="group flex items-center gap-4">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-cream-deep">
            <Image
              src={collection.image}
              alt=""
              fill
              sizes="80px"
              className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-105"
            />
          </div>
          <div>
            <p className="font-serif text-[19px]  text-ink transition-colors group-hover:text-wine">
              {collection.name}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-ash">{collection.tagline}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
