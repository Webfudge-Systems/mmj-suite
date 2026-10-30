import type { Metadata } from "next";
import { Shell } from "@/components/ui/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Prose } from "@/components/ui/Prose";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/pricing";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Shipping and returns",
  description:
    "Insured delivery across India, free above twenty-five thousand rupees, and a fifteen-day return on unworn ornaments.",
};

export default function ShippingReturnsPage() {
  return (
    <>
      <PageHeader
        title="Shipping and returns"
        lead="Every despatch is insured and signed for. Unworn pieces come back within fifteen days."
        trail={[{ label: "Home", href: "/" }, { label: "Shipping and returns" }]}
      />
      <Shell className="py-12 sm:py-16">
        <Prose>
          <h2>Delivery</h2>
          <p>
            We ship across India with a courier that requires a signature and an OTP at the door.
            Every packet is fully insured for the invoice value. Delivery is free on orders of{" "}
            {formatPrice(FREE_SHIPPING_THRESHOLD)} and above; below that a flat two hundred and fifty
            rupees is added at checkout.
          </p>
          <p>
            In-stock pieces leave Rahuri within two working days. Made-to-order work ships when the
            karigar finishes and the assay centre returns the HUID, usually three to eight weeks
            depending on the piece.
          </p>
          <h2>Trying on at the showroom</h2>
          <p>
            If you would rather collect than wait for a courier, say so at checkout. We will hold
            the piece at the Rahuri counter for fourteen days at no charge.
          </p>
          <h2>Returns</h2>
          <p>
            Unworn ornaments can be returned within fifteen days of delivery, with the original
            estimate, tags and packaging, for a full refund of the amount paid. We arrange the
            reverse pickup and cover the insured return.
          </p>
          <p>The following are not returnable:</p>
          <ul>
            <li>Made-to-order and engraved pieces</li>
            <li>Opened bullion, coins and bars</li>
            <li>Pieces that have been worn, resized or repaired after delivery</li>
          </ul>
          <h2>Exchange</h2>
          <p>
            Any gold ornament bought from us can be exchanged against the day&apos;s rate for as long
            as you own it, with a standard two per cent refining deduction. The original invoice is
            enough. This is a lifetime promise, not a fifteen-day one.
          </p>
        </Prose>
      </Shell>
    </>
  );
}
