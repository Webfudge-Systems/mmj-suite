import Link from "next/link";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Shell } from "@/components/ui/Shell";
import { ArrowCta } from "@/components/ui/Button";
import { getLiveRates } from "@/lib/live-rates";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import type { Purity } from "@/types";

const shown: Purity[] = ["24KT", "22KT", "18KT", "925"];

/**
 * Today's counter rates. Not in the reference, but an Indian jeweller's
 * customers check this before anything else, so it gets its own band.
 */
export async function RateStrip() {
  const { rates, updatedOn, live } = await getLiveRates();
  const lines = shown
    .map((purity) => rates.find((rate) => rate.purity === purity))
    .filter((rate): rate is NonNullable<typeof rate> => Boolean(rate));

  if (lines.length === 0) return null;

  return (
    <section className="bg-wine text-cream">
      <Shell className="grid gap-10 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-center lg:py-16">
        <div>
          <h2 className="text-[clamp(2rem,3.6vw,2.8rem)]">Today&rsquo;s gold rate</h2>
          <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-cream/70">
            Per gram at the Rahuri counter{live ? ", updated through the day" : `, as of ${formatDate(updatedOn)}`}.
            Every price on this site is worked out from these figures.
          </p>
          <ArrowCta href="/gold-rate" tone="light" className="mt-7">
            See the full rate card
          </ArrowCta>
        </div>

        <ul className="grid grid-cols-2 gap-px overflow-hidden bg-cream/15 sm:grid-cols-4">
          {lines.map((rate) => {
            const rising = rate.changePerGram >= 0;
            const Trend = rate.changePerGram === 0 ? Minus : rising ? TrendingUp : TrendingDown;
            return (
              <li key={rate.purity} className="bg-wine p-5 sm:p-6">
                <Link href="/gold-rate" className="block">
                  <p className="text-[13px] text-cream/70">{rate.label}</p>
                  <p className="mt-3 text-[26px] font-light leading-none tabular-nums text-gold">
                    {formatPrice(rate.ratePerGram)}
                  </p>
                  <p
                    className={cn(
                      "mt-3 flex items-center gap-1.5 text-[12px] tabular-nums",
                      rate.changePerGram === 0 ? "text-cream/60" : rising ? "text-[#9fd8a8]" : "text-[#f2a7a0]",
                    )}
                  >
                    <Trend className="size-3.5" aria-hidden />
                    {rate.changePerGram === 0
                      ? "Unchanged today"
                      : `${rising ? "+" : "−"}${formatPrice(Math.abs(rate.changePerGram))} today`}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </Shell>
    </section>
  );
}
