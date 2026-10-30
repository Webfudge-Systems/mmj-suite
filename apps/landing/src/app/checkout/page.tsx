import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { CheckoutForm } from "@/components/commerce/CheckoutForm";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <>
      <PageHeader
        title="Checkout"
        lead="We call every order to confirm the weight band and the gold rate before the workshop begins."
        trail={[{ label: "Home", href: "/" }, { label: "Bag", href: "/cart" }, { label: "Checkout" }]}
      />
      <CheckoutForm />
    </>
  );
}
