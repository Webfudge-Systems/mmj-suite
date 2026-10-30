import type { Metadata } from "next";
import { Shell } from "@/components/ui/Shell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Prose } from "@/components/ui/Prose";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `How Mukund Maid Jewellers collects, uses and stores the information you share with us.`,
};

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        title="Privacy policy"
        lead="What we collect, why we collect it, and who we do not give it to."
        trail={[{ label: "Home", href: "/" }, { label: "Privacy" }]}
      />
      <Shell className="py-12 sm:py-16">
        <Prose>
          <p>
            Mukund Maid Jewellers, Main Road, Rahuri, Ahmednagar 413705, is the controller of the
            information described here. Write to us at {site.email} if you want a copy, a correction
            or a deletion.
          </p>
          <h2>What we collect</h2>
          <p>
            When you place an order, join the savings scheme or write to us, we keep your name,
            address, telephone number, email and the pieces you asked about. Payments are processed
            by the bank or UPI app you choose; we do not store card numbers.
          </p>
          <p>
            The storefront also keeps a cart and a wishlist in your browser. Those never leave the
            device unless you check out.
          </p>
          <h2>What we use it for</h2>
          <ul>
            <li>To fulfil an order, arrange delivery and issue the estimate</li>
            <li>To administer a savings-scheme account</li>
            <li>To answer a question you asked</li>
            <li>To send a rate or scheme reminder, only if you asked for one</li>
          </ul>
          <h2>Who we share it with</h2>
          <p>
            Couriers receive a name, a phone number and an address so they can deliver. The assay
            centre receives the piece, not your details. We do not sell or rent a list of customers
            to anyone.
          </p>
          <h2>How long we keep it</h2>
          <p>
            Invoices and hallmark records are kept for eight years, which is what the tax and BIS
            rules ask for. Marketing preferences are kept until you ask us to stop. Browser cart
            data lives on your device and can be cleared there.
          </p>
          <h2>Your rights</h2>
          <p>
            You can ask for a copy of what we hold, ask us to correct it, or ask us to delete it
            where the law does not require us to keep it. Call {site.phones[0]} or write to{" "}
            {site.email}.
          </p>
        </Prose>
      </Shell>
    </>
  );
}
