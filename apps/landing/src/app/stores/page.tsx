import type { Metadata } from "next";
import Image from "next/image";
import { Clock, MapPin, Phone } from "lucide-react";
import { Shell } from "@/components/ui/Shell";
import { Panel } from "@/components/ui/Panel";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { stores } from "@/data/stores";
import { site } from "@/data/site";

export const metadata: Metadata = {
  title: "Visit the showroom",
  description: `Mukund Maid Jewellers, Main Road, Rahuri, ${site.address.city}. Open ${site.hours}.`,
};

const counters = [
  { name: "Gold", body: "Temple work, festive sets, chains and everyday bangles in 22 and 18 karat." },
  { name: "Diamond", body: "Certified solitaires, pave daily wear and uncut polki for the trousseau." },
  { name: "Silver", body: "Sterling payal, toe rings, puja articles and oxidised statement pieces." },
  { name: "Platinum", body: "950 bands and couple rings, hallmarked and sized on site." },
  { name: "Coins and bars", body: "Sealed assay-certified bullion, bought back at the day's rate." },
];

export default function StoresPage() {
  const store = stores[0];

  return (
    <>
      <PageHeader
        title="One showroom, five counters"
        lead="Everything we make is finished in the workshop on the floor above this room. You are welcome to come up and watch."
        trail={[{ label: "Home", href: "/" }, { label: "Showroom" }]}
      />

      <Shell className="py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal className="relative aspect-[4/3] overflow-hidden bg-cream-deep">
            <Image
              src={store.image}
              alt={`Inside the ${store.name} showroom`}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </Reveal>

          <Reveal delay={0.08}>
            <h2 className="text-[clamp(1.5rem,3.2vw,2.15rem)]">{store.name}</h2>

            <dl className="mt-8 space-y-7">
              <div className="flex gap-4">
                <MapPin className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                <div>
                  <dt className="eyebrow text-[9px] text-stone">Address</dt>
                  <dd className="mt-2 text-[14px] leading-relaxed text-ink">
                    {store.addressLines.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                    <span className="block">
                      {store.city}, {store.state} {store.pincode}
                    </span>
                  </dd>
                </div>
              </div>

              <div className="flex gap-4">
                <Clock className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                <div>
                  <dt className="eyebrow text-[9px] text-stone">Opening hours</dt>
                  <dd className="mt-2 text-[14px] leading-relaxed text-ink">
                    {store.hours}
                    <span className="block text-ash">{store.closedOn}</span>
                  </dd>
                </div>
              </div>

              <div className="flex gap-4">
                <Phone className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                <div>
                  <dt className="eyebrow text-[9px] text-stone">Phone</dt>
                  <dd className="mt-2 text-[14px] leading-relaxed text-ink">
                    {site.phones.map((phone) => (
                      <a
                        key={phone}
                        href={`tel:${phone.replace(/\s/g, "")}`}
                        className="block underline-offset-4 hover:underline"
                      >
                        {phone}
                      </a>
                    ))}
                  </dd>
                </div>
              </div>
            </dl>

            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href={store.mapUrl}>Get directions</ButtonLink>
              <ButtonLink href="/contact" variant="outline">
                Call ahead
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </Shell>

      <Panel tone="cream">
        <p className="eyebrow text-[9px] text-stone">What is where</p>
        <h2 className="mt-5 max-w-xl text-[clamp(1.35rem,2.8vw,2rem)]">
          The floor, counter by counter
        </h2>

        <ol className="mt-11 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
          {counters.map((counter, index) => (
            <li key={counter.name} className="bg-paper p-6">
              <p className="eyebrow text-[9px] text-gold">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-3 text-[15px] normal-case tracking-normal">{counter.name}</h3>
              <p className="mt-2.5 text-[12px] leading-relaxed text-ash">{counter.body}</p>
            </li>
          ))}
        </ol>
      </Panel>
    </>
  );
}
