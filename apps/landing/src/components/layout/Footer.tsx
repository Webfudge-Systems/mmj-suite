import Link from "next/link";
import { Sparkle } from "lucide-react";
import { Shell } from "@/components/ui/Shell";
import { NewsletterForm } from "@/components/layout/NewsletterForm";
import { Wordmark } from "@/components/layout/Wordmark";
import { SocialIcon } from "@/components/layout/SocialIcon";
import { footerColumns, site } from "@/data/site";
import { collections } from "@/data/collections";

const payments = ["Visa", "Mastercard", "RuPay", "UPI", "Net banking", "EMI"];

/** Velvet Black footer: centred gold lockup, four link columns, sign-up row. */
export function Footer() {
  const [shop, help, company] = footerColumns;
  const columns = [
    shop,
    {
      title: "Collections",
      links: collections.map((collection) => ({
        label: collection.name,
        href: `/collections/${collection.slug}`,
      })),
    },
    { ...help, title: "Customer care" },
    { ...company, title: "About MMJ" },
  ];

  return (
    <footer className="rounded-t-[2rem] bg-ink text-cream sm:rounded-t-[3rem]">
      <Shell className="pt-16 sm:pt-20">
        <div className="flex items-center gap-6 sm:gap-10">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/60" aria-hidden />
          <div className="flex flex-col items-center gap-3">
            <Wordmark tone="light" size="footer" showTagline={false} />
            <p className="text-[12px] tracking-[0.3em] text-gold/80">Since {site.established}</p>
          </div>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/60" aria-hidden />
        </div>

        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="text-[14px] font-medium text-gold">{column.title}</p>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-cream/70 transition-colors hover:text-cream"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-16 grid gap-10 border-t border-cream/10 pt-12 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="flex items-center gap-3 font-serif text-[clamp(1.6rem,3vw,2.1rem)]  leading-tight">
              <Sparkle className="size-5 shrink-0 fill-gold text-gold" aria-hidden />
              Be the first to see new collections
            </p>
            <div className="mt-6 grid gap-6 text-[13px] text-cream/65 sm:grid-cols-2 sm:gap-10">
              <address className="not-italic leading-relaxed">
                {site.address.lines.join(", ")}
                <br />
                {site.address.city}, {site.address.state} {site.address.pincode}
                <br />
                <span className="text-cream/45">
                  {site.hours}, {site.closedOn.toLowerCase()}
                </span>
              </address>
              <ul className="space-y-1">
                {site.phones.map((phone) => (
                  <li key={phone}>
                    <a href={`tel:${phone.replace(/\s/g, "")}`} className="hover:text-cream">
                      {phone}
                    </a>
                  </li>
                ))}
                <li>
                  <a href={`mailto:${site.email}`} className="hover:text-cream">
                    {site.email}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <NewsletterForm variant="dark" className="lg:w-[440px]" />
        </div>
      </Shell>

      <Shell className="mt-14 pb-8">
        <div className="flex flex-col items-center justify-between gap-6 border-t border-cream/10 pt-8 md:flex-row">
          <ul className="flex items-center gap-2.5">
            {site.social.map((entry) => (
              <li key={entry.label}>
                <a
                  href={entry.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={entry.label}
                  className="grid size-9 place-items-center rounded-full bg-cream/10 text-cream/80 transition-colors hover:bg-gold hover:text-ink"
                >
                  <SocialIcon label={entry.label} />
                </a>
              </li>
            ))}
          </ul>

          <ul className="flex flex-wrap items-center justify-center gap-2">
            {payments.map((method) => (
              <li
                key={method}
                className="rounded-full border border-cream/15 px-3 py-1 text-[10px] text-cream/55"
              >
                {method}
              </li>
            ))}
          </ul>

          <p className="text-[11px] text-cream/45">
            &copy; {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
        </div>
      </Shell>
    </footer>
  );
}
