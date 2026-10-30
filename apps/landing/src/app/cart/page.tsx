import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { CartView } from "@/components/commerce/CartView";

export const metadata: Metadata = {
  title: "Your bag",
  robots: { index: false },
};

export default function CartPage() {
  return (
    <>
      <PageHeader
        title="Your bag"
        lead="Weights, purity and making charges carry through to the estimate. Nothing is added at checkout."
        trail={[{ label: "Home", href: "/" }, { label: "Bag" }]}
      />
      <CartView />
    </>
  );
}
