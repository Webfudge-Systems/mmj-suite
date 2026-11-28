import type { Metadata } from "next";
import { Check } from "lucide-react";
import { Shell } from "@/components/ui/Shell";
import { Panel } from "@/components/ui/Panel";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProductGrid } from "@/components/commerce/ProductGrid";
import { ReservationNumber } from "@/components/commerce/ReservationNumber";
import { getBestsellers, ensureCatalog } from "@/lib/catalog";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Reservation received",
  robots: { index: false },
};

const steps = [
  {
    index: "01",
    title: "We call to confirm",
    body: "Within one working day, to read back the pieces and weights and agree a time for your visit.",
  },
  {
    index: "02",
    title: "We hold the pieces",
    body: "Pieces in stock are set aside for you. Made-to-order work is quoted on the call.",
  },
  {
    index: "03",
    title: "Try, then pay",
    body: "See the pieces in the showroom and pay at the counter at that day's rate.",
  },
];

export default async function CheckoutSuccessPage() {
  await ensureCatalog();
  return (
    <>
      <Shell className="py-20 sm:py-28">
        <div className="mx-auto max-w-lg text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-stock text-cream">
            <Check className="size-5" strokeWidth={2.5} />
          </span>
          <p className="eyebrow mt-8 text-[9px] text-stone">Reservation received</p>
          <h1 className="mt-4 text-[clamp(1.75rem,4vw,2.5rem)]">Thank you</h1>
          <p className="mt-5 text-[14px] leading-relaxed text-ash">
            We will call you shortly. If you would rather talk now, call us on{" "}
            <a href={`tel:${site.phones[0].replace(/\s/g, "")}`} className="text-ink underline-offset-4 hover:underline">
              {site.phones[0]}
            </a>
            .
          </p>
          <ReservationNumber />
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/stores">Find the showroom</ButtonLink>
            <ButtonLink href="/shop" variant="outline">
              Keep browsing
            </ButtonLink>
          </div>
        </div>

        <ol className="mx-auto mt-16 grid max-w-3xl gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
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
        <SectionHeading label="While you wait" />
        <ProductGrid products={getBestsellers(4)} className="mt-10" />
      </Panel>
    </>
  );
}
