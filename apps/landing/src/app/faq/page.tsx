import type { Metadata } from "next";
import { Shell } from "@/components/ui/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Accordion } from "@/components/ui/Accordion";
import { ButtonLink } from "@/components/ui/Button";
import { faqs } from "@/data/site";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description:
    "How MMJ prices gold, what BIS hallmarking proves, old-gold exchange, made-to-order work, delivery and the savings scheme.",
};

export default function FaqPage() {
  return (
    <>
      <PageHeader
        title="Questions we hear at the counter"
        lead="Weight, hallmarking, exchange and the savings scheme. If the answer you need is not here, call the showroom."
        trail={[{ label: "Home", href: "/" }, { label: "FAQ" }]}
      />
      <Shell className="py-12 sm:py-16">
        <Accordion items={faqs} defaultOpen={0} />
        <div className="mt-12 flex flex-wrap gap-3">
          <ButtonLink href="/contact" variant="outline">
            Still have a question
          </ButtonLink>
          <ButtonLink href="/gold-rate">Today&apos;s rate</ButtonLink>
        </div>
      </Shell>
    </>
  );
}
