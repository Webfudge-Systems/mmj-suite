import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { CheckoutForm } from "@/components/commerce/CheckoutForm";

export const metadata: Metadata = {
  title: "Reserve and visit",
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <>
      <PageHeader
        title="Reserve and visit"
        lead="Tell us which pieces you like. We hold them and call to arrange your visit; you pay at the showroom at the day's rate."
        trail={[{ label: "Home", href: "/" }, { label: "Bag", href: "/cart" }, { label: "Reserve" }]}
      />
      <CheckoutForm />
    </>
  );
}
