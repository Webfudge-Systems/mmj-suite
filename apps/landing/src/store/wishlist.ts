"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type WishlistState = {
  slugs: string[];
  toggle: (slug: string) => void;
  remove: (slug: string) => void;
  clear: () => void;
};

export const useWishlist = create<WishlistState>()(
  persist(
    (set) => ({
      slugs: [],
      toggle: (slug) =>
        set((state) => ({
          slugs: state.slugs.includes(slug)
            ? state.slugs.filter((entry) => entry !== slug)
            : [...state.slugs, slug],
        })),
      remove: (slug) =>
        set((state) => ({ slugs: state.slugs.filter((entry) => entry !== slug) })),
      clear: () => set({ slugs: [] }),
    }),
    { name: "mmj-wishlist" },
  ),
);
