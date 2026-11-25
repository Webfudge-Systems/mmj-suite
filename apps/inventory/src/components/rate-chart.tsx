import { brand, PURITIES } from "@webfudge/config";
import type { RateCard } from "@webfudge/utils/api";

const rupees = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;
const rupeesPaise = (value: number) => `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * The day's gold and silver rates as a poster for the showroom and WhatsApp:
 * one A4 page in the MMJ colours, every purity per gram and per 10 g (per kg
 * for silver). Platinum is left out so everything fits on the one sheet.
 */
export function RateChart({ card, place, phone }: { card: RateCard; place?: string | null; phone?: string | null }) {
  const when = new Date(card.effectiveFrom);
  const date = when.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = when.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  const rows = PURITIES.filter((purity) => purity.metal !== "platinum").map((purity) => ({ purity, rate: card.rates.find((line) => line.purity === purity.code)?.ratePerGram })).filter((row) => row.rate);
  const groups = (["gold", "silver"] as const).map((metal) => ({ metal, rows: rows.filter((row) => row.purity.metal === metal) })).filter((group) => group.rows.length);
  const names = { gold: "Gold", silver: "Silver" } as const;

  return (
    <article
      className="rate-chart relative mx-auto flex min-h-[297mm] w-[210mm] flex-col overflow-hidden bg-white text-ink break-inside-avoid print:h-[272mm] print:min-h-0 print:w-auto"
      style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
    >
      <header className="relative overflow-hidden bg-navy px-[14mm] pt-[10mm] pb-[8mm] text-white">
        <div aria-hidden className="absolute -top-24 -right-24 size-80 rounded-full border-[28px] border-gold/15" />
        <div className="relative flex items-center gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mmj-mark.png" alt={`${brand.name} logo`} className="h-[26mm] w-auto" />
          <div>
            <p className="text-[26px] leading-tight font-bold tracking-wide">{brand.name}</p>
            {place && <p className="text-[13px] tracking-[0.25em] text-gold uppercase">{place}</p>}
          </div>
        </div>
        <div className="relative mt-[6mm] flex items-end justify-between gap-4 border-t border-white/20 pt-[5mm]">
          <div>
            <p className="text-[12px] font-semibold tracking-[0.3em] text-gold uppercase">Today&apos;s rates</p>
            <p className="mt-1 text-[30px] leading-none font-bold">Gold &amp; Silver</p>
          </div>
          <div className="text-right">
            <p className="text-[15px] font-semibold">{date}</p>
            <p className="text-[12px] text-white/70">Published at {time}</p>
          </div>
        </div>
      </header>

      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[95mm] bottom-[30mm] grid place-items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mmj-mark.png" alt="" className="w-[110mm] opacity-[0.06]" />
      </div>

      <div className="relative grid flex-1 content-start gap-[6mm] px-[14mm] py-[8mm]">
        {groups.map((group) => (
          <section key={group.metal}>
            <div className="mb-[3mm] flex items-center gap-3">
              <span className={`h-[3px] w-10 rounded-full ${group.metal === "silver" ? "bg-gray-400" : "bg-gold"}`} />
              <h2 className="text-[13px] font-bold tracking-[0.25em] text-navy uppercase">{names[group.metal]}</h2>
            </div>
            <table className="w-full border-collapse overflow-hidden rounded-xl">
              <thead>
                <tr className="bg-navy/[0.06] text-[11px] font-semibold tracking-wider text-navy uppercase">
                  <th className="px-4 py-2.5 text-left">Purity</th>
                  <th className="px-4 py-2.5 text-right">Per gram</th>
                  <th className="px-4 py-2.5 text-right">{group.metal === "silver" ? "Per kg" : "Per 10 grams"}</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map(({ purity, rate }) => (
                  <tr key={purity.code} className="border-b border-navy/10 last:border-b-0">
                    <td className="px-4 py-3">
                      <span className="block text-[19px] font-bold">{purity.label}</span>
                      <span className="text-[11px] text-ash">{purity.metal === "gold" ? `${(purity.fineness / 10).toFixed(1)}% pure` : `${purity.fineness} fineness`}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-[24px] font-bold text-navy tabular-nums">{rupeesPaise(rate!)}</td>
                    <td className="px-4 py-3 text-right text-[19px] font-semibold tabular-nums">{rupees(rate! * (purity.metal === "silver" ? 1000 : 10))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}

        {card.note && <p className="rounded-lg bg-gold-soft px-4 py-2.5 text-[12.5px]">{card.note}</p>}
      </div>

      <footer className="relative grid gap-1 border-t-[3px] border-gold px-[14mm] py-[6mm] text-[11px] text-ash">
        <p>
          Rates are per gram of metal, before making charges, stone value and 3% GST. Every piece is BIS hallmarked with its HUID. Rates change daily; the bill uses the rate at the time of billing.
        </p>
        <p className="font-semibold text-navy">
          {brand.name}
          {place ? ` · ${place}` : ""}
          {phone ? ` · ${phone}` : ""}
        </p>
      </footer>
    </article>
  );
}
