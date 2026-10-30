import Link from "next/link";
import { Shell } from "@/components/ui/Shell";
import { NewsletterForm } from "@/components/layout/NewsletterForm";
import { Wordmark } from "@/components/layout/Wordmark";
import { footerColumns, site } from "@/data/site";

const payments = ["Visa", "Mastercard", "RuPay", "UPI", "Net banking", "EMI"];

export function Footer() {
  return (
    <footer className="border-t border-line bg-cream text-ink">
      <Shell className="py-14 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Wordmark size="footer" />
            <p className="mt-6 max-w-sm text-[13px] leading-relaxed text-ash">
              {site.description}
            </p>
            <NewsletterForm />
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            {footerColumns.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <p className="eyebrow text-[9px] text-stone">{column.title}</p>
                <ul className="mt-5 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-[13px] text-ash transition-colors hover:text-ink"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 grid gap-8 border-t border-line pt-10 lg:grid-cols-3">
          <div>
            <p className="eyebrow text-[9px] text-stone">Showroom</p>
            <address className="mt-4 space-y-0.5 text-[13px] not-italic text-ash">
              {site.address.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <p>
                {site.address.city}, {site.address.state} {site.address.pincode}
              </p>
            </address>
            <p className="mt-3 text-[12px] text-stone">
              {site.hours} &middot; {site.closedOn}
            </p>
          </div>

          <div>
            <p className="eyebrow text-[9px] text-stone">Talk to us</p>
            <ul className="mt-4 space-y-0.5 text-[13px] text-ash">
              {site.phones.map((phone) => (
                <li key={phone}>
                  <a href={`tel:${phone.replace(/\s/g, "")}`} className="hover:text-ink">
                    {phone}
                  </a>
                </li>
              ))}
              <li>
                <a href={`mailto:${site.email}`} className="hover:text-ink">
                  {site.email}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="eyebrow text-[9px] text-stone">Follow</p>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
              {site.social.map((entry) => (
                <li key={entry.label}>
                  <a
                    href={entry.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-[13px] text-ash transition-colors hover:text-ink"
                  >
                    {entry.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Shell>

      <div className="border-t border-line">
        <Shell className="flex flex-col items-center justify-between gap-5 py-6 sm:flex-row">
          <p className="text-[11px] text-stone">
            &copy; {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-2">
            {payments.map((method) => (
              <li
                key={method}
                className="eyebrow border border-line px-2.5 py-1.5 text-[8px] text-stone"
              >
                {method}
              </li>
            ))}
          </ul>
        </Shell>
      </div>
    </footer>
  );
}
