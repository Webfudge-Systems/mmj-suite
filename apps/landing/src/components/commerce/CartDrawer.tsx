"use client";

import Link from "next/link";
import { Drawer } from "@/components/ui/Drawer";
import { ButtonLink } from "@/components/ui/Button";
import { CartLines } from "@/components/commerce/CartLines";
import { useCart } from "@/store/cart";
import { useHydrated, useUi } from "@/store/ui";
import { cartTotals, resolveLines } from "@/lib/cart";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/pricing";
import { formatPrice } from "@/lib/utils";

export function CartDrawer() {
  const { cartOpen, closeCart } = useUi();
  const rawLines = useCart((state) => state.lines);
  const hydrated = useHydrated();

  const lines = hydrated ? resolveLines(rawLines) : [];
  const totals = cartTotals(lines);
  const shortfall = FREE_SHIPPING_THRESHOLD - totals.subtotal;

  return (
    <Drawer open={cartOpen} onClose={closeCart} title={`Bag (${totals.count})`}>
      {lines.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <p className="text-[15px] text-ink">Your bag is empty.</p>
          <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-ash">
            Start at the gold counter, or look through the bridal vault.
          </p>
          <div className="mt-7 flex flex-col gap-3">
            <ButtonLink href="/shop/gold" className="w-full">
              Shop gold
            </ButtonLink>
            <ButtonLink href="/collections/bridal-vault" variant="outline" className="w-full">
              Bridal vault
            </ButtonLink>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <div className="flex-1 px-6">
            {shortfall > 0 && (
              <p className="border-b border-line py-4 text-[12px] leading-relaxed text-ash">
                Add {formatPrice(shortfall)} more for free insured delivery.
              </p>
            )}
            <CartLines lines={lines} onNavigate={closeCart} compact />
          </div>

          <div className="border-t border-line bg-paper px-6 py-6">
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-ash">Subtotal</dt>
                <dd className="tabular-nums text-ink">{formatPrice(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ash">Insured delivery</dt>
                <dd className="tabular-nums text-ink">
                  {totals.shipping === 0 ? "Free" : formatPrice(totals.shipping)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2.5 text-[15px]">
                <dt className="text-ink">Total</dt>
                <dd className="tabular-nums text-ink">{formatPrice(totals.total)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-[11px] leading-relaxed text-stone">
              GST included. Gold rate locked at the time of order.
            </p>
            <ButtonLink href="/checkout" className="mt-5 w-full">
              Checkout
            </ButtonLink>
            <Link
              href="/cart"
              onClick={closeCart}
              className="eyebrow mt-4 block text-center text-[10px] text-ash hover:text-ink"
            >
              View full bag
            </Link>
          </div>
        </div>
      )}
    </Drawer>
  );
}
