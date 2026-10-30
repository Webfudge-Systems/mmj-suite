"use client";

import Link from "next/link";
import { Drawer } from "@/components/ui/Drawer";
import { useUi } from "@/store/ui";
import { metalCounters } from "@/data/categories";
import { collections } from "@/data/collections";
import { site } from "@/data/site";

export function MobileNav() {
  const { navOpen, closeNav } = useUi();

  return (
    <Drawer open={navOpen} onClose={closeNav} title="Menu" side="left">
      <nav className="px-6 py-6">
        <p className="eyebrow text-[9px] text-stone">Shop by metal</p>
        <ul className="mt-4 space-y-1">
          {metalCounters.map((counter) => (
            <li key={counter.slug}>
              <Link
                href={`/shop/${counter.slug}`}
                onClick={closeNav}
                className="block border-b border-line py-3 text-[15px] text-ink"
              >
                {counter.name}
              </Link>
            </li>
          ))}
        </ul>

        <p className="eyebrow mt-9 text-[9px] text-stone">Collections</p>
        <ul className="mt-4 space-y-1">
          {collections.map((collection) => (
            <li key={collection.slug}>
              <Link
                href={`/collections/${collection.slug}`}
                onClick={closeNav}
                className="block border-b border-line py-3 text-[14px] text-ash"
              >
                {collection.name}
              </Link>
            </li>
          ))}
        </ul>

        <ul className="mt-9 space-y-1">
          {[
            { label: "Today's rate", href: "/gold-rate" },
            { label: "Savings scheme", href: "/gold-savings-scheme" },
            { label: "Visit the showroom", href: "/stores" },
            { label: "Our story", href: "/about" },
            { label: "Journal", href: "/journal" },
            { label: "My account", href: "/account" },
          ].map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={closeNav}
                className="block border-b border-line py-3 text-[14px] text-ash"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-10 space-y-1 text-[13px] text-ash">
          <p>{site.phones[0]}</p>
          <p>{site.email}</p>
          <p className="text-[12px] text-stone">{site.hours}</p>
        </div>
      </nav>
    </Drawer>
  );
}
