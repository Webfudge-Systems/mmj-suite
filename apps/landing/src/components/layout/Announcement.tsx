import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Shell } from "@/components/ui/Shell";
import { announcements } from "@/data/site";
import { getLiveRates } from "@/lib/live-rates";
import { formatPrice } from "@/lib/utils";

/**
 * Thin band above the header. An Indian jeweller leads with the day's rate, so
 * the 22KT figure sits on the right where a shipping promise usually would.
 */
export async function Announcement() {
  const { rates } = await getLiveRates();
  const gold = rates.find((rate) => rate.purity === "22KT");
  const rising = (gold?.changePerGram ?? 0) >= 0;
  const Trend = rising ? TrendingUp : TrendingDown;

  return (
    <div className="bg-ink text-cream">
      <Shell className="flex h-9 items-center justify-between gap-6">
        <p className="eyebrow truncate text-[9px] text-cream/70">{announcements[0]}</p>

        <ul className="eyebrow hidden gap-6 text-[9px] text-cream/70 md:flex">
          {announcements.slice(1).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        {gold && (
          <Link
            href="/gold-rate"
            className="eyebrow flex shrink-0 items-center gap-2 text-[9px] transition-colors hover:text-gold"
          >
            <span className="text-cream/70">22KT today</span>
            <span className="text-gold">{formatPrice(gold.ratePerGram)}/g</span>
            <Trend className="size-3 text-gold" aria-hidden />
          </Link>
        )}
      </Shell>
    </div>
  );
}
