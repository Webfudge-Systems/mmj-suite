import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { WishlistView } from "@/components/commerce/WishlistView";

export const metadata: Metadata = {
  title: "Saved pieces",
  robots: { index: false },
};

export default function WishlistPage() {
  return (
    <>
      <PageHeader
        title="Saved pieces"
        lead="Kept on this device. Prices follow the day's rate, so what you see here moves with the market."
        trail={[{ label: "Home", href: "/" }, { label: "Saved" }]}
      />
      <WishlistView />
    </>
  );
}
