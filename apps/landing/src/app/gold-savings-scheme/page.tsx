import type { Metadata } from "next";
import { Shell } from "@/components/ui/Shell";
import { Panel } from "@/components/ui/Panel";
import { PageHeader } from "@/components/ui/PageHeader";
import { Statement } from "@/components/ui/SectionHeading";
import { Accordion } from "@/components/ui/Accordion";
import { ButtonLink } from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Gold savings scheme",
  description:
    "Pay eleven monthly instalments at MMJ and we contribute the twelfth. Redeem the full value against any ornament in the Rahuri showroom.",
};

const monthly = 5_000;
const months = 11;
const bonus = monthly;
const total = monthly * months + bonus;

const schemeFaqs = [
  {
    question: "Does the scheme lock today's gold rate?",
    answer:
      "No. You buy at the rate on the day you redeem. Schemes that claim to lock a rate almost always lock it at a premium. We would rather be honest about that.",
  },
  {
    question: "Are making charges reduced at redemption?",
    answer:
      "Making charges on the piece you choose are reduced by two percentage points. The free twelfth instalment is the main benefit; we do not take it back on the making.",
  },
  {
    question: "What if I miss a month or want to stop?",
    answer:
      "You can withdraw the money you have paid, without the bonus, at any time. A missed month can be paid with the next one. Three consecutive misses close the account and we refund the principal.",
  },
  {
    question: "Can I redeem against any ornament?",
    answer:
      "Yes. Gold, diamond, silver, platinum or bullion, from the floor or made to order. If the piece costs more than the matured value, you pay the difference at the counter.",
  },
];

export default function GoldSavingsSchemePage() {
  return (
    <>
      <PageHeader
        title="Eleven months from you, the twelfth from us"
        lead="A fixed monthly payment, a free instalment at the end, and the whole amount redeemable against any ornament in the showroom. No locked rate, no hidden making."
        trail={[{ label: "Home", href: "/" }, { label: "Savings scheme" }]}
      />

      <Shell className="py-12 sm:py-16">
        <ol className="grid gap-px border border-line bg-line sm:grid-cols-3">
          {[
            {
              n: "01",
              t: "Choose a monthly amount",
              d: "Any figure from two thousand rupees. Most accounts sit at five.",
            },
            {
              n: "02",
              t: "Pay for eleven months",
              d: "Cash, UPI or card, on any date in the month. We send a WhatsApp reminder.",
            },
            {
              n: "03",
              t: "Redeem in month twelve",
              d: "We add one instalment. The total is yours against any piece on the floor.",
            },
          ].map((step) => (
            <li key={step.n} className="bg-paper p-7 sm:p-8">
              <p className="eyebrow text-[9px] text-gold">{step.n}</p>
              <h2 className="mt-4 text-[18px] normal-case tracking-normal">{step.t}</h2>
              <p className="mt-3 text-[13px] leading-relaxed text-ash">{step.d}</p>
            </li>
          ))}
        </ol>
      </Shell>

      <Panel tone="paper">
        <p className="eyebrow text-[9px] text-stone">Worked example</p>
        <Statement className="mt-5">A five thousand rupee account</Statement>
        <div className="mt-10 overflow-x-auto border border-line bg-cream">
          <table className="w-full min-w-[480px] text-left text-[13px]">
            <tbody>
              {[
                ["Monthly instalment", formatPrice(monthly)],
                ["Your eleven payments", formatPrice(monthly * months)],
                ["MMJ contribution", formatPrice(bonus)],
                ["Redeemable value", formatPrice(total)],
              ].map(([label, value], index, list) => (
                <tr
                  key={label}
                  className={`border-t border-line first:border-t-0 ${
                    index === list.length - 1 ? "bg-ink text-cream" : ""
                  }`}
                >
                  <td className="px-5 py-4">{label}</td>
                  <td className="px-5 py-4 text-right tabular-nums">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-xl text-[12px] leading-relaxed text-stone">
          That twelfth instalment is about eight per cent on the money you put in. It is a discount,
          not interest, and it is written on the scheme card before you sign.
        </p>
      </Panel>

      <Panel tone="cream">
        <p className="eyebrow text-[9px] text-stone">Before you join</p>
        <Statement className="mt-5 max-w-2xl">Three things we write on the card</Statement>
        <ul className="mt-10 grid gap-8 sm:grid-cols-3">
          {[
            {
              t: "The rate is not locked",
              d: "You buy at the rate on the day you redeem. Anyone who tells you otherwise is locking it at a premium.",
            },
            {
              t: "Making is reduced, not waived",
              d: "Two percentage points off the published making charge. The free month is the benefit; we do not claw it back.",
            },
            {
              t: "You can walk away",
              d: "Principal back, minus the bonus, any time. No argument, no processing fee.",
            },
          ].map((item) => (
            <li key={item.t}>
              <h3 className="text-[16px] normal-case tracking-normal">{item.t}</h3>
              <p className="mt-3 text-[13px] leading-relaxed text-ash">{item.d}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel tone="cream">
        <h2 className="text-[clamp(1.35rem,2.8vw,2rem)]">Scheme questions</h2>
        <div className="mt-8">
          <Accordion items={schemeFaqs} defaultOpen={0} />
        </div>
      </Panel>

      <section className="bg-wine py-16 text-cream sm:py-20">
        <Shell className="flex flex-wrap items-center justify-between gap-8">
          <div>
            <Statement className="max-w-xl">Start an account at the counter</Statement>
            <p className="mt-5 max-w-md text-[14px] leading-relaxed text-cream/75">
              Bring a photograph and an identity card. Open {site.hours.toLowerCase()}. {site.closedOn}.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/stores" variant="gold">
              Visit the showroom
            </ButtonLink>
            <ButtonLink href="/contact" variant="light">
              Ask a question
            </ButtonLink>
          </div>
        </Shell>
      </section>
    </>
  );
}
