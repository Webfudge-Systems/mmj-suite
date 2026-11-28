import { BadgeCheck, CalendarHeart, Repeat, Truck, Undo2 } from "lucide-react";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/pricing";
import { formatPrice } from "@/lib/utils";

const benefits = [
  {
    icon: Truck,
    title: `Free insured delivery above ${formatPrice(FREE_SHIPPING_THRESHOLD)}`,
    note: "Signature and OTP on delivery. Applied automatically at checkout.",
    tag: "Auto applied",
  },
  {
    icon: Repeat,
    title: "Lifetime exchange on gold",
    note: "Weighed and tested in front of you, set against the day's rate.",
    tag: "Every piece",
  },
  {
    icon: CalendarHeart,
    title: "Pay 11 months, we add the 12th",
    note: "Join the savings scheme and redeem it against this piece.",
    tag: "Savings scheme",
  },
];

const trust = [
  { icon: BadgeCheck, label: "BIS\nhallmarked" },
  { icon: Repeat, label: "Lifetime\nexchange" },
  { icon: Truck, label: "Insured\ndelivery" },
  { icon: Undo2, label: "15-day\nreturns" },
];

/** Offer cards and the four-icon trust strip, in the order a buyer asks the questions. */
export function ProductBenefits() {
  return (
    <div className="mt-8 space-y-5">
      <ul className="space-y-3">
        {benefits.map((benefit) => (
          <li key={benefit.title} className="flex items-center gap-4 rounded-2xl bg-fog p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-mist text-wine">
              <benefit.icon className="size-5" strokeWidth={1.6} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-ink">{benefit.title}</span>
              <span className="mt-0.5 block text-[12px] leading-snug text-ash">{benefit.note}</span>
            </span>
            <span className="hidden shrink-0 rounded-full border border-dashed border-wine/40 px-3 py-1.5 text-[10px] font-medium text-wine sm:block">
              {benefit.tag}
            </span>
          </li>
        ))}
      </ul>

      <ul className="grid grid-cols-4 gap-2 rounded-2xl bg-wine px-3 py-4 text-cream">
        {trust.map((item) => (
          <li key={item.label} className="flex flex-col items-center gap-2 text-center">
            <item.icon className="size-6 text-gold" strokeWidth={1.4} aria-hidden />
            <span className="whitespace-pre-line text-[10px] font-medium leading-tight sm:text-[11px]">
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
