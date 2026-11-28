import Link from "next/link";
import { CalendarHeart, Gift, HandHeart, Truck } from "lucide-react";
import { Shell } from "@/components/ui/Shell";

const services = [
  {
    icon: CalendarHeart,
    title: "Book an appointment",
    body: "Sit with us at the showroom or on a video call, with the pieces you shortlisted laid out.",
    cta: "Book now",
    href: "/contact",
  },
  {
    icon: Truck,
    title: "Shipping & returns",
    body: "Fully insured delivery, free above ₹25,000, and fifteen days to return unworn pieces.",
    cta: "Learn more",
    href: "/shipping-returns",
  },
  {
    icon: HandHeart,
    title: "At your service",
    body: "Sizing, cleaning, re-polishing and old-gold exchange, handled by the people who made it.",
    cta: "Contact us",
    href: "/contact",
  },
  {
    icon: Gift,
    title: "Savings scheme",
    body: "Pay for eleven months and we add the twelfth, redeemable against any piece on the floor.",
    cta: "Explore",
    href: "/gold-savings-scheme",
  },
];

/** Four line-icon services under a centred serif title, as the reference closes its page. */
export function Experience() {
  return (
    <section className="bg-paper pb-20 pt-4 sm:pb-24">
      <Shell>
        <h2 className="text-center text-[clamp(1.9rem,3.4vw,2.6rem)] text-ink">The MMJ experience</h2>

        <ul className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <li key={service.title} className="flex flex-col items-center text-center">
              <span className="grid size-16 place-items-center rounded-2xl border border-ink/80 text-wine">
                <service.icon className="size-7" strokeWidth={1.3} aria-hidden />
              </span>
              <h3 className="mt-6 text-[24px] text-ink">{service.title}</h3>
              <p className="mt-3 max-w-[30ch] text-[14px] leading-relaxed text-ash">{service.body}</p>
              <Link
                href={service.href}
                className="eyebrow mt-6 border-b-2 border-wine/70 pb-2 text-[12px] text-ink transition-colors hover:border-wine hover:text-wine"
              >
                {service.cta}
              </Link>
            </li>
          ))}
        </ul>
      </Shell>
    </section>
  );
}
