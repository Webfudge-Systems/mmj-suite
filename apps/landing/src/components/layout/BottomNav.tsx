"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, LayoutGrid, Search, ShoppingBag } from "lucide-react";
import { useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import { useHydrated, useUi } from "@/store/ui";
import { cn } from "@/lib/utils";

/** Pages that bring their own bottom bar (or none), so the tab bar steps aside. */
const hidden = (path: string) => path.startsWith("/products/") || path.startsWith("/checkout");

/**
 * Phone-only tab bar: a floating rounded pill pinned to the bottom, the way an
 * app lays out its main destinations. Most visitors arrive on a phone, so
 * search and the bag live here, within thumb reach.
 */
export function BottomNav() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const { openCart, toggleSearch, cartOpen, searchOpen } = useUi();
  const cartCount = useCart((state) => state.lines.reduce((n, l) => n + l.quantity, 0));
  const wishCount = useWishlist((state) => state.slugs.length);

  if (hidden(pathname)) return null;

  const tabs = [
    { key: "home", label: "Home", icon: Home, href: "/", active: pathname === "/" && !cartOpen && !searchOpen },
    {
      key: "shop",
      label: "Shop",
      icon: LayoutGrid,
      href: "/shop",
      active: (pathname.startsWith("/shop") || pathname.startsWith("/collections")) && !cartOpen && !searchOpen,
    },
    { key: "search", label: "Search", icon: Search, onClick: toggleSearch, active: searchOpen },
    {
      key: "saved",
      label: "Saved",
      icon: Heart,
      href: "/wishlist",
      count: wishCount,
      active: pathname.startsWith("/wishlist") && !cartOpen && !searchOpen,
    },
    { key: "bag", label: "Bag", icon: ShoppingBag, onClick: openCart, count: cartCount, active: cartOpen },
  ];

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <ul className="mx-auto flex max-w-md items-center justify-between rounded-full bg-ink/95 p-1.5 shadow-[0_18px_40px_-12px_rgba(10,40,116,0.55)] backdrop-blur-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const inner = (
            <>
              <span className="relative">
                <Icon className="size-[20px]" strokeWidth={tab.active ? 2.2 : 1.6} />
                {hydrated && tab.count ? (
                  <span className="absolute -right-2.5 -top-1.5 grid min-w-4 place-items-center rounded-full bg-gold px-1 text-[9px] font-semibold leading-4 text-ink">
                    {tab.count > 9 ? "9+" : tab.count}
                  </span>
                ) : null}
              </span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </>
          );
          const cls = cn(
            "flex h-[52px] w-full flex-col items-center justify-center gap-1 rounded-full transition-colors",
            tab.active ? "bg-cream text-wine" : "text-cream/75 active:bg-cream/10",
          );
          return (
            <li key={tab.key} className="flex-1">
              {tab.href ? (
                <Link href={tab.href} className={cls} aria-current={tab.active ? "page" : undefined}>
                  {inner}
                </Link>
              ) : (
                <button type="button" onClick={tab.onClick} className={cls}>
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
