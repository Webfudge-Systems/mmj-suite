import type { Metadata } from "next";
import { Shell } from "@/components/ui/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Prose } from "@/components/ui/Prose";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Terms of use",
  description: `Terms that govern browsing and buying from Mukund Maid Jewellers at ${site.domain}.`,
};

export default function TermsPage() {
  return (
    <>
      <PageHeader
        title="Terms of use"
        lead="The rules that apply when you browse this site or buy from the Rahuri showroom."
        trail={[{ label: "Home", href: "/" }, { label: "Terms" }]}
      />
      <Shell className="py-12 sm:py-16">
        <Prose>
          <p>
            This website is operated by Mukund Maid Jewellers, Main Road, Rahuri, Maharashtra. By
            using it you agree to the terms below. Buying in the showroom is governed by the
            estimate we print for you that day.
          </p>
          <h2>Catalogue and rates</h2>
          <p>
            Weights, making charges and photographs describe the piece as it left the workshop.
            Gold and silver rates change through the day. The price on a product page is calculated
            from the rate published on this site and is confirmed on the estimate at the moment you
            pay.
          </p>
          <h2>Orders</h2>
          <p>
            Checkout on this site is a demonstration flow. Nothing is charged and nothing is stored
            as an order. To buy, visit the showroom, call {site.phones[0]}, or write to {site.email}.
          </p>
          <h2>Hallmarking</h2>
          <p>
            Every ornament we sell is BIS hallmarked and carries a unique HUID. Bullion is sold in
            sealed assay packaging. Opening that seal ends the certified-weight premium on buyback.
          </p>
          <h2>Intellectual property</h2>
          <p>
            Photographs, copy and the MMJ wordmark belong to Mukund Maid Jewellers. Do not reuse
            them without written permission.
          </p>
          <h2>Governing law</h2>
          <p>
            These terms are governed by the laws of India. The courts at Ahmednagar have exclusive
            jurisdiction.
          </p>
        </Prose>
      </Shell>
    </>
  );
}
