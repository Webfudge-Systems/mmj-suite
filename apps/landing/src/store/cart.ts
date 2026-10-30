"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "@/types";

type CartState = {
  lines: CartLine[];
  add: (slug: string, quantity?: number, size?: string) => void;
  remove: (slug: string, size?: string) => void;
  setQuantity: (slug: string, quantity: number, size?: string) => void;
  clear: () => void;
};

const sameLine = (line: CartLine, slug: string, size?: string) =>
  line.slug === slug && line.size === size;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (slug, quantity = 1, size) =>
        set((state) => {
          const existing = state.lines.find((line) => sameLine(line, slug, size));
          if (existing) {
            return {
              lines: state.lines.map((line) =>
                sameLine(line, slug, size)
                  ? { ...line, quantity: line.quantity + quantity }
                  : line,
              ),
            };
          }
          return { lines: [...state.lines, { slug, quantity, size }] };
        }),
      remove: (slug, size) =>
        set((state) => ({
          lines: state.lines.filter((line) => !sameLine(line, slug, size)),
        })),
      setQuantity: (slug, quantity, size) =>
        set((state) => ({
          lines: state.lines.flatMap((line) => {
            if (!sameLine(line, slug, size)) return [line];
            return quantity < 1 ? [] : [{ ...line, quantity }];
          }),
        })),
      clear: () => set({ lines: [] }),
    }),
    { name: "mmj-cart" },
  ),
);
