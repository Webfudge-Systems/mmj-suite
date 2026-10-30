import type { Metadata } from "next";
import { Shell } from "@/components/ui/Shell";
import { Panel } from "@/components/ui/Panel";
import { PageHeader } from "@/components/ui/PageHeader";
import { Statement } from "@/components/ui/SectionHeading";
import { ButtonLink } from "@/components/ui/Button";
import { Prose } from "@/components/ui/Prose";
import { metalRates, rateUpdatedOn } from "@/data/rates";
import { formatDate, formatRate } from "@/lib/utils";
import type { Purity } from "@/types";

export const metadata: Metadata = {
  title: "Today's gold rate",
  description:
    "MMJ counter rates for 24, 22, 18 and 14 karat gold, 950 platinum and 925 silver, updated each trading morning in Rahuri.",
};

const fineness: Record<Purity, number> = {
  "24KT": 1,
  "22KT": 22 / 24,
  "18KT": 18 / 24,
  "14KT": 14 / 24,
  "950PT": 0.95,
  "925": 1,
};

export default function GoldRatePage() {
  return (
    <>
      <PageHeader
        title="Today's rate at the counter"
        lead={`Updated ${formatDate(rateUpdatedOn)}. The same numbers sit behind every estimate on this site and every slip printed in Rahuri.`}
        trail={[{ label: "Home", href: "/" }, { label: "Today's rate" }]}
      />

      <Shell className="py-12 sm:py-16">
        <div className="overflow-x-auto border border-line">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="bg-paper">
              <tr className="eyebrow text-[9px] text-stone">
                <th className="px-5 py-4 font-normal">Metal</th>
                <th className="px-5 py-4 font-normal">Purity</th>
                <th className="px-5 py-4 font-normal">Rate per gram</th>
                <th className="px-5 py-4 font-normal">Change</th>
              </tr>
            </thead>
            <tbody>
              {metalRates.map((rate) => {
                const effective = rate.ratePerGram * fineness[rate.purity];
                const change = rate.changePerGram * fineness[rate.purity];
                const up = change >= 0;

                return (
                  <tr key={rate.label} className="border-t border-line">
                    <td className="px-5 py-4 text-ink">{rate.label}</td>
                    <td className="px-5 py-4 text-ash">{rate.purity}</td>
                    <td className="px-5 py-4 tabular-nums text-ink">{formatRate(effective)}</td>
                    <td className={`px-5 py-4 tabular-nums ${up ? "text-stock" : "text-wine"}`}>
                      {up ? "+" : ""}
                      {formatRate(change)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 max-w-2xl text-[12px] leading-relaxed text-stone">
          Gold is quoted as 24 karat and scaled by purity on the estimate. Silver is quoted as 925.
          Rates move through the day; a piece reserved after 4pm is billed at the next morning&apos;s
          figure if you have not paid.
        </p>
      </Shell>

      <Panel tone="paper">
        <p className="eyebrow text-[9px] text-stone">How the estimate is built</p>
        <Statement className="mt-5 max-w-2xl">Five numbers, nothing hidden</Statement>
        <Prose>
          <p className="mt-8">
            Metal value is the net weight times today&apos;s rate times the purity fraction. Making
            is a percentage of that metal value. Stones are billed separately. GST is three per cent
            on the metal and making, eighteen per cent on the stones. The hallmark charge is a
            government-notified flat fee.
          </p>
        </Prose>
        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { n: "01", t: "Net weight", d: "Metal only, never the stones." },
            { n: "02", t: "Day's rate", d: "The figure on this page, scaled by purity." },
            { n: "03", t: "Making", d: "A published percentage of the metal value." },
            { n: "04", t: "Stones", d: "Billed flat, with their own GST." },
            { n: "05", t: "GST + HUID", d: "Three per cent, eighteen per cent, then the assay fee." },
          ].map((step) => (
            <li key={step.n}>
              <p className="eyebrow text-[9px] text-gold">{step.n}</p>
              <p className="mt-3 text-[15px] text-ink">{step.t}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ash">{step.d}</p>
            </li>
          ))}
        </ol>
        <ButtonLink href="/shop" variant="outline" className="mt-12">
          Shop with today&apos;s rate
        </ButtonLink>
      </Panel>
    </>
  );
}
