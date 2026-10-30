"use client";

import { Shell } from "@/components/ui/Shell";
import { ButtonLink } from "@/components/ui/Button";
import { CartLines } from "@/components/commerce/CartLines";
import { OrderSummary } from "@/components/commerce/OrderSummary";
import { EmptyState } from "@/components/commerce/EmptyState";
import { useCart } from "@/store/cart";
import { useHydrated } from "@/store/ui";
import { resolveLines } from "@/lib/cart";

export function CartView() {
  const cartLines = useCart((state) => state.lines);
  const clear = useCart((state) => state.clear);
  const hydrated = useHydrated();
  const lines = resolveLines(cartLines);

  /** The bag lives in localStorage, so render nothing until it is readable. */
  if (!hydrated) {
    return <Shell className="py-16"><div className="h-64" /></Shell>;
  }

  if (lines.length === 0) {
    return (
      <EmptyState
        title="Your bag is empty"
        body="Start at a counter, or pick up where the bridal vault left off."
        primary={{ href: "/shop", label: "Shop all pieces" }}
        secondary={{ href: "/collections/bridal-vault", label: "The Bridal Vault" }}
      />
    );
  }

  return (
    <Shell className="py-12 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,380px)] lg:gap-14">
        <div>
          <CartLines lines={lines} />
          <div className="mt-6 flex items-center justify-between border-t border-line pt-6">
            <ButtonLink href="/shop" variant="outline">
              Continue shopping
            </ButtonLink>
            <button
              type="button"
              onClick={clear}
              className="eyebrow text-[9px] text-ash underline-offset-4 hover:text-wine hover:underline"
            >
              Empty bag
            </button>
          </div>
        </div>

        <div className="lg:sticky lg:top-32 lg:self-start">
          <OrderSummary lines={lines}>
            <ButtonLink href="/checkout" className="mt-7 w-full">
              Proceed to checkout
            </ButtonLink>
            <p className="mt-4 text-center text-[11px] text-stone">
              Fifteen-day exchange. Lifetime buyback at the day's rate.
            </p>
          </OrderSummary>
        </div>
      </div>
    </Shell>
  );
}
