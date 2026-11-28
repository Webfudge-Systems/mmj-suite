import Image from "next/image";
import { Clock, MapPin, Phone } from "lucide-react";
import { Shell } from "@/components/ui/Shell";
import { ButtonLink } from "@/components/ui/Button";
import { stores } from "@/data/stores";

/** Mist card with the showroom details beside a photograph of the floor. */
export function StoreLocator() {
  const store = stores[0];
  if (!store) return null;

  return (
    <section className="bg-paper py-16 sm:py-20">
      <Shell className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex flex-col justify-center rounded-3xl bg-mist px-8 py-12 sm:px-12">
          <h2 className="max-w-[12ch] text-[clamp(2.2rem,4vw,3.2rem)] text-ink">Visit MMJ in Rahuri</h2>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ash">
            See the pieces in hand, have a stone loosened under the loupe, or bring old gold to
            exchange at the day&rsquo;s rate.
          </p>

          <ul className="mt-8 space-y-3 text-[14px] text-ink">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-wine" aria-hidden />
              <span>
                {store.addressLines.join(", ")}, {store.city} {store.pincode}
              </span>
            </li>
            <li className="flex gap-3">
              <Clock className="mt-0.5 size-4 shrink-0 text-wine" aria-hidden />
              <span>
                {store.hours}
                <span className="block text-[12px] text-ash">{store.closedOn}</span>
              </span>
            </li>
            <li className="flex gap-3">
              <Phone className="mt-0.5 size-4 shrink-0 text-wine" aria-hidden />
              <a href={`tel:${store.phone.replace(/\s/g, "")}`} className="hover:text-wine">
                {store.phone}
              </a>
            </li>
          </ul>

          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/stores" variant="outline" arrow>
              Store locator
            </ButtonLink>
            <a
              href={store.mapUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center px-4 py-3.5 text-[13px] font-medium text-wine underline-offset-4 hover:underline"
            >
              Get directions
            </a>
          </div>
        </div>

        <div className="relative min-h-[320px] overflow-hidden rounded-3xl bg-fog sm:min-h-[440px]">
          <Image
            src={store.image}
            alt="Inside the MMJ showroom: velvet seating and lit cases of gold necklaces and bangles"
            fill
            sizes="(min-width: 1024px) 58vw, 100vw"
            className="object-cover"
          />
        </div>
      </Shell>
    </section>
  );
}
