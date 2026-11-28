"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/ui/Shell";
import { Button } from "@/components/ui/Button";
import { Field, TextArea } from "@/components/ui/Field";
import { OrderSummary } from "@/components/commerce/OrderSummary";
import { EmptyState } from "@/components/commerce/EmptyState";
import { useCart } from "@/store/cart";
import { useHydrated } from "@/store/ui";
import { resolveLines } from "@/lib/cart";
import { sendEnquiry } from "@/lib/live-catalog";
import { formatPrice, formatWeight } from "@/lib/utils";
import { site } from "@/data/site";

/** Where the confirmation page finds the request number. */
const RESERVATION_KEY = "mmj.reservation";

function tomorrow() {
  const date = new Date(Date.now() + 86400000);
  return date.toISOString().slice(0, 10);
}

/**
 * Reserve and visit. Gold is priced on the day it is bought, so instead of
 * taking payment online the request goes to the shop's CRM; the team calls to
 * confirm the pieces and today's rate, and the customer pays at the showroom.
 */
export function CheckoutForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cartLines = useCart((state) => state.lines);
  const clear = useCart((state) => state.clear);
  const hydrated = useHydrated();
  const lines = resolveLines(cartLines);

  if (!hydrated) {
    return <Shell className="py-16"><div className="h-64" /></Shell>;
  }

  if (lines.length === 0) {
    return (
      <EmptyState
        title="Nothing to reserve"
        body="Add a piece to your bag and we will hold it for your visit."
        primary={{ href: "/shop", label: "Shop all pieces" }}
      />
    );
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      const { number } = await sendEnquiry({
        name: String(form.get("name") ?? ""),
        phone: String(form.get("phone") ?? ""),
        email: String(form.get("email") ?? "") || undefined,
        visitOn: String(form.get("visitOn") ?? "") || undefined,
        message: String(form.get("note") ?? "") || undefined,
        website: String(form.get("website") ?? "") || undefined,
        items: lines.map((line) => ({
          code: line.product.sku,
          name: [line.product.name, line.size ? `size ${line.size}` : null].filter(Boolean).join(", "),
          price: line.product.live?.priceOnRequest ? null : line.product.price,
          quantity: line.quantity,
          url: `${window.location.origin}/products/${line.slug}`,
        })),
      });
      try {
        sessionStorage.setItem(RESERVATION_KEY, number);
      } catch {
        // Private browsing: the confirmation simply shows without the number.
      }
      clear();
      router.push("/checkout/success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not send your request. Please call the shop.");
      setSubmitting(false);
    }
  };

  return (
    <Shell className="py-12 sm:py-16">
      <form onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14">
        <div className="space-y-12">
          <section>
            <h2 className="text-[24px] text-ink">Your details</h2>
            <p className="mt-3 text-[13px] leading-relaxed text-ash">
              We call within one working day to confirm the pieces, the weights and the day&apos;s rate, and set a time for your visit.
            </p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Full name" name="name" required autoComplete="name" />
              <Field label="Mobile" name="phone" type="tel" required autoComplete="tel" placeholder="10-digit mobile" inputMode="tel" pattern="[0-9 +-]{10,15}" />
              <Field label="Email (optional)" name="email" type="email" autoComplete="email" />
              <Field label="When would you like to visit?" name="visitOn" type="date" min={tomorrow()} />
            </div>
            {/* Hidden from people; bots fill it in and are ignored. */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          </section>

          <section>
            <h2 className="text-[24px] text-ink">Anything we should know</h2>
            <TextArea
              label="Note for the shop"
              name="note"
              rows={3}
              placeholder="Ring size, a weight you have in mind, old gold you want to exchange"
              className="mt-6"
            />
          </section>

          <section className="rounded-2xl border border-line bg-cream-deep p-5 text-[13px] leading-relaxed text-ash">
            <p className="text-ink">How payment works</p>
            <p className="mt-2">
              Nothing is charged online. You see and try the pieces at {site.name}, then pay at the counter by UPI, card or cash. The price is worked out at that day&apos;s published rate.
            </p>
          </section>
        </div>

        <div className="lg:sticky lg:top-32 lg:self-start">
          <ul className="mb-5 divide-y divide-line rounded-2xl border border-line bg-paper">
            {lines.map((line) => (
              <li key={`${line.slug}-${line.size ?? "one"}`} className="flex gap-3 p-4">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-cream-deep">
                  <Image src={line.product.images[0]} alt="" fill sizes="56px" className="object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-ink">{line.product.name}</span>
                  <span className="eyebrow mt-1 block text-[8px] text-stone">
                    {line.product.purity} &middot; {formatWeight(line.product.grossWeight)} &middot; ×{line.quantity}
                  </span>
                </span>
                <span className="shrink-0 text-[13px] tabular-nums text-ink">
                  {line.product.live?.priceOnRequest ? "On request" : formatPrice(line.product.price * line.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <OrderSummary lines={lines}>
            {error && <p className="mt-6 border border-[#e8b4b4] bg-[#fbeaea] p-3 text-[12px] text-[#8a2a2a]">{error}</p>}
            <Button type="submit" disabled={submitting} className="mt-7 w-full">
              {submitting ? "Sending" : "Reserve and arrange a visit"}
            </Button>
            <p className="mt-4 text-center text-[11px] leading-relaxed text-stone">
              No payment is taken online. Prices are estimates at today&apos;s rate and are confirmed when you visit.
            </p>
          </OrderSummary>
        </div>
      </form>
    </Shell>
  );
}
