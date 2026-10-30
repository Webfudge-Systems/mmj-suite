"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/ui/Shell";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextArea } from "@/components/ui/Field";
import { OrderSummary } from "@/components/commerce/OrderSummary";
import { EmptyState } from "@/components/commerce/EmptyState";
import { useCart } from "@/store/cart";
import { useHydrated } from "@/store/ui";
import { resolveLines } from "@/lib/cart";
import { cn, formatPrice, formatWeight } from "@/lib/utils";

const payments = [
  { value: "upi", label: "UPI", note: "GPay, PhonePe, Paytm" },
  { value: "card", label: "Card", note: "Visa, Mastercard, RuPay" },
  { value: "netbanking", label: "Net banking", note: "All major banks" },
  { value: "showroom", label: "Pay at showroom", note: "Reserve and pay in Rahuri" },
];

const states = [
  "Maharashtra",
  "Gujarat",
  "Karnataka",
  "Madhya Pradesh",
  "Telangana",
  "Delhi",
  "Other",
].map((state) => ({ value: state, label: state }));

/**
 * No payment gateway is wired yet, so submitting clears the bag and hands off
 * to the confirmation page. The fields mirror what the counter actually asks.
 */
export function CheckoutForm() {
  const router = useRouter();
  const [payment, setPayment] = useState("upi");
  const [submitting, setSubmitting] = useState(false);

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
        title="Nothing to check out"
        body="Add a piece to your bag and the estimate will be waiting here."
        primary={{ href: "/shop", label: "Shop all pieces" }}
      />
    );
  }

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    clear();
    router.push("/checkout/success");
  };

  return (
    <Shell className="py-12 sm:py-16">
      <form onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-[1fr_minmax(0,380px)] lg:gap-14">
        <div className="space-y-12">
          <section>
            <h2 className="eyebrow text-[10px]">Contact</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Full name" name="name" required autoComplete="name" />
              <Field label="Mobile" name="phone" type="tel" required autoComplete="tel" placeholder="+91" />
              <Field label="Email" name="email" type="email" required autoComplete="email" className="sm:col-span-2" />
            </div>
          </section>

          <section>
            <h2 className="eyebrow text-[10px]">Delivery address</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Address line 1" name="address1" required autoComplete="address-line1" className="sm:col-span-2" />
              <Field label="Address line 2" name="address2" autoComplete="address-line2" className="sm:col-span-2" />
              <Field label="City" name="city" required autoComplete="address-level2" />
              <Field label="PIN code" name="pincode" required autoComplete="postal-code" />
              <Select label="State" name="state" options={states} defaultValue="Maharashtra" />
              <Field label="Landmark" name="landmark" />
            </div>
          </section>

          <section>
            <h2 className="eyebrow text-[10px]">Payment</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {payments.map((option) => (
                <li key={option.value}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-3 border p-4 transition-colors",
                      payment === option.value
                        ? "border-ink bg-cream-deep"
                        : "border-line hover:border-ink/40",
                    )}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={option.value}
                      checked={payment === option.value}
                      onChange={() => setPayment(option.value)}
                      className="mt-1 accent-ink"
                    />
                    <span>
                      <span className="block text-[14px] text-ink">{option.label}</span>
                      <span className="mt-0.5 block text-[11px] text-stone">{option.note}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <TextArea
              label="Note for the workshop"
              name="note"
              rows={3}
              placeholder="Engraving, sizing or a delivery date you need us to hit"
              className="mt-6"
            />
          </section>
        </div>

        <div className="lg:sticky lg:top-32 lg:self-start">
          <ul className="mb-5 divide-y divide-line border border-line bg-paper">
            {lines.map((line) => (
              <li key={`${line.slug}-${line.size ?? "one"}`} className="flex gap-3 p-4">
                <span className="relative size-14 shrink-0 overflow-hidden bg-cream-deep">
                  <Image
                    src={line.product.images[0]}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-ink">{line.product.name}</span>
                  <span className="eyebrow mt-1 block text-[8px] text-stone">
                    {line.product.purity} &middot; {formatWeight(line.product.grossWeight)} &middot; ×{line.quantity}
                  </span>
                </span>
                <span className="shrink-0 text-[13px] tabular-nums text-ink">
                  {formatPrice(line.product.price * line.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <OrderSummary lines={lines}>
            <Button type="submit" disabled={submitting} className="mt-7 w-full">
              {submitting ? "Placing order" : "Place order"}
            </Button>
            <p className="mt-4 text-center text-[11px] leading-relaxed text-stone">
              This is a demonstration storefront. No payment is taken and no card
              details are collected.
            </p>
          </OrderSummary>
        </div>
      </form>
    </Shell>
  );
}
