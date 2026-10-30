"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";

type UiState = {
  cartOpen: boolean;
  navOpen: boolean;
  searchOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleNav: () => void;
  closeNav: () => void;
  toggleSearch: () => void;
  closeSearch: () => void;
};

export const useUi = create<UiState>((set) => ({
  cartOpen: false,
  navOpen: false,
  searchOpen: false,
  openCart: () => set({ cartOpen: true, navOpen: false, searchOpen: false }),
  closeCart: () => set({ cartOpen: false }),
  toggleNav: () => set((state) => ({ navOpen: !state.navOpen, cartOpen: false })),
  closeNav: () => set({ navOpen: false }),
  toggleSearch: () => set((state) => ({ searchOpen: !state.searchOpen, cartOpen: false })),
  closeSearch: () => set({ searchOpen: false }),
}));

/**
 * Persisted stores read localStorage after mount, so anything that renders a
 * count has to wait a tick or the server and client markup disagree.
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
