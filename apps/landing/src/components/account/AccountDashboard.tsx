"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Shell } from "@/components/ui/Shell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { customer, orders, scheme, statusLabels } from "@/data/account";
import { getProductBySlug } from "@/lib/catalog";
import { formatDate, formatPrice, formatWeight, cn } from "@/lib/utils";

const tabs = ["Orders", "Scheme", "Addresses", "Details"] as const;
type Tab = (typeof tabs)[number];

/**
 * There is no auth backend yet, so the panel starts signed out and reveals a
 * populated demo dashboard once the form is submitted.
 */
export function AccountDashboard() {
  const [signedIn, setSignedIn] = useState(false);
  const [tab, setTab] = useState<Tab>("Orders");

  if (!signedIn) {
    return (
      <Shell className="py-16 sm:py-24">
        <div className="mx-auto max-w-sm">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSignedIn(true);
            }}
            className="border border-line bg-paper p-7 sm:p-9"
          >
            <h2 className="eyebrow text-[10px]">Sign in</h2>
            <p className="mt-4 text-[13px] leading-relaxed text-ash">
              We send a one-time code to your mobile. No password to remember.
            </p>
            <Field
              label="Mobile number"
              name="phone"
              type="tel"
              placeholder="+91"
              required
              autoComplete="tel"
              className="mt-7"
            />
            <Button type="submit" className="mt-6 w-full">
              Send code
            </Button>
            <p className="mt-5 text-[11px] leading-relaxed text-stone">
              Demonstration only. Submitting opens a sample account with placeholder
              orders.
            </p>
          </form>
        </div>
      </Shell>
    );
  }

  return (
    <Shell className="py-12 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-line pb-6">
        <div>
          <p className="eyebrow text-[9px] text-stone">
            Member since {customer.memberSince}
          </p>
          <h2 className="mt-2.5 text-[clamp(1.25rem,2.4vw,1.6rem)] normal-case tracking-normal">
            {customer.name}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setSignedIn(false)}
          className="eyebrow text-[9px] text-ash underline-offset-4 hover:text-ink hover:underline"
        >
          Sign out
        </button>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[200px_1fr] lg:gap-14">
        <nav aria-label="Account sections">
          <ul className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
            {tabs.map((entry) => (
              <li key={entry}>
                <button
                  type="button"
                  onClick={() => setTab(entry)}
                  aria-current={tab === entry ? "true" : undefined}
                  className={cn(
                    "eyebrow whitespace-nowrap px-3.5 py-2.5 text-[10px] transition-colors lg:w-full lg:text-left",
                    tab === entry ? "bg-ink text-cream" : "text-ash hover:text-ink",
                  )}
                >
                  {entry}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          {tab === "Orders" && <Orders />}
          {tab === "Scheme" && <Scheme />}
          {tab === "Addresses" && <Addresses />}
          {tab === "Details" && <Details />}
        </div>
      </div>
    </Shell>
  );
}

function Orders() {
  return (
    <ul className="space-y-5">
      {orders.map((order) => (
        <li key={order.id} className="border border-line bg-paper">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <p className="text-[14px] tabular-nums text-ink">{order.id}</p>
              <p className="eyebrow mt-1 text-[8px] text-stone">
                Placed {formatDate(order.placedOn)}
              </p>
            </div>
            <span
              className={cn(
                "eyebrow px-2.5 py-1 text-[9px]",
                order.status === "delivered"
                  ? "bg-stock/10 text-stock"
                  : "bg-gold/15 text-ink",
              )}
            >
              {statusLabels[order.status]}
            </span>
            <p className="text-[15px] tabular-nums text-ink">{formatPrice(order.total)}</p>
          </div>

          <ul className="divide-y divide-line">
            {order.items.map((item) => {
              const product = getProductBySlug(item.slug);
              if (!product) return null;

              return (
                <li key={item.slug} className="flex items-center gap-4 px-5 py-4">
                  <Link
                    href={`/products/${product.slug}`}
                    className="relative size-16 shrink-0 overflow-hidden bg-cream-deep"
                  >
                    <Image
                      src={product.images[0]}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${product.slug}`}
                      className="block truncate text-[13px] text-ink hover:underline"
                    >
                      {product.name}
                    </Link>
                    <p className="eyebrow mt-1 text-[8px] text-stone">
                      {product.purity} &middot; {formatWeight(product.grossWeight)} &middot; ×
                      {item.quantity}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function Scheme() {
  const progress = Math.round((scheme.paid / scheme.term) * 100);

  return (
    <div className="border border-line bg-paper p-7 sm:p-9">
      <p className="eyebrow text-[9px] text-gold">Gold savings scheme</p>
      <h3 className="mt-3 text-[clamp(1.2rem,2.4vw,1.55rem)]">{scheme.plan}</h3>
      <p className="mt-4 text-[13px] leading-relaxed text-ash">
        {formatPrice(scheme.monthly)} a month for {scheme.term} months. We add the twelfth
        instalment, and each payment buys gold at that day's rate.
      </p>

      <div className="mt-8">
        <div className="flex items-baseline justify-between text-[12px]">
          <span className="text-ash">
            Instalment {scheme.paid} of {scheme.term}
          </span>
          <span className="tabular-nums text-ink">{progress}%</span>
        </div>
        <div className="mt-2.5 h-1.5 w-full bg-cream-deep">
          <div className="h-full bg-gold" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3">
        {[
          { label: "Paid so far", value: formatPrice(scheme.monthly * scheme.paid) },
          { label: "Gold accrued", value: formatWeight(scheme.gramsAccrued) },
          { label: "Instalments left", value: String(scheme.term - scheme.paid) },
        ].map((entry) => (
          <div key={entry.label} className="bg-paper px-5 py-5">
            <dt className="eyebrow text-[8px] text-stone">{entry.label}</dt>
            <dd className="mt-2 text-[15px] tabular-nums text-ink">{entry.value}</dd>
          </div>
        ))}
      </dl>

      <ButtonLink href="/gold-savings-scheme" variant="outline" className="mt-8">
        Scheme terms
      </ButtonLink>
    </div>
  );
}

function Addresses() {
  return (
    <ul className="grid gap-5 sm:grid-cols-2">
      {customer.addresses.map((address) => (
        <li key={address.label} className="border border-line bg-paper p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow text-[9px] text-stone">{address.label}</p>
            {address.isDefault && (
              <span className="eyebrow bg-cream-deep px-2 py-1 text-[8px] text-ash">
                default
              </span>
            )}
          </div>
          <address className="mt-4 text-[13px] not-italic leading-relaxed text-ash">
            {address.lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
        </li>
      ))}
    </ul>
  );
}

function Details() {
  return (
    <div className="border border-line bg-paper p-7 sm:p-9">
      <h3 className="eyebrow text-[10px]">Your details</h3>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label="Full name" name="name" defaultValue={customer.name} />
        <Field label="Mobile" name="phone" defaultValue={customer.phone} />
        <Field label="Email" name="email" defaultValue={customer.email} className="sm:col-span-2" />
      </div>
      <Button className="mt-7">Save changes</Button>
    </div>
  );
}
