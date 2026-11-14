"use client";

import type { ReactNode } from "react";
import { setCatalog } from "@/lib/catalog";
import type { Product } from "@/types";

/**
 * Hands the server's catalogue to the browser, so search, wishlist and cart
 * read the same live products the pages were rendered from.
 */
export function CatalogProvider({ products, children }: { products: Product[]; children: ReactNode }) {
  setCatalog(products);
  return <>{children}</>;
}
