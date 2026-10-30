import type { Metadata } from "next";
import { Check } from "lucide-react";
import { Shell } from "@/components/ui/Shell";
import { Panel } from "@/components/ui/Panel";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProductGrid } from "@/components/commerce/ProductGrid";
import { getBestsellers } from "@/lib/catalog";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Order placed",
  robots: { index: false },
};

const steps = [
  {
    index: "01",
    title: "We call to confirm",
    body: "Within one working day, to lock the rate and read back the weights on your estimate.",
  },
  {
    index: "02",
    title: "The workshop begins",
    body: "In-stock pieces are checked and boxed. Made-to-order work takes three to five weeks.",
  },
  {
    index: "03",
    title: "Hallmark and dispatch",
    body: "Every piece is BIS assayed, photographed and sent insured to your door.",
  },
];

export default function CheckoutSuccessPage() {
  return (
    <>
      <Shell className="py-20 sm:py-28">
        <div className="mx-auto max-w-lg text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-stock text-cream">
            <Check className="size-5" strokeWidth={2.5} />
          </span>
          <p className="eyebrow mt-8 text-[9px] text-stone">Order received</p>
          <h1 className="mt-4 text-[clamp(1.75rem,4vw,2.5rem)]">Thank you</h1>
          <p className="mt-5 text-[14px] leading-relaxed text-ash">
            Your estimate is on its way by email. If anything looks off, call us on{" "}
            <a href={`tel:${site.phones[0].replace(/\s/g, "")}`} className="text-ink underline-offset-4 hover:underline">
              {site.phones[0]}
            </a>{" "}
            and we will correct it before the workshop starts.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/account">View your orders</ButtonLink>
            <ButtonLink href="/shop" variant="outline">
              Keep browsing
            </ButtonLink>
          </div>
        </div>

        <ol className="mx-auto mt-16 grid max-w-3xl gap-px border border-line bg-line sm:grid-cols-3">
          {steps.map((step) => (
            <li key={step.index} className="bg-paper p-6">
              <p className="eyebrow text-[9px] text-gold">{step.index}</p>
              <h2 className="mt-3 text-[15px] normal-case tracking-normal">{step.title}</h2>
              <p className="mt-2 text-[12px] leading-relaxed text-ash">{step.body}</p>
            </li>
          ))}
        </ol>
      </Shell>

      <Panel tone="cream">
        <SectionHeading label="Often bought together" />
        <ProductGrid products={getBestsellers(4)} className="mt-10" />
      </Panel>
    </>
  );
}
