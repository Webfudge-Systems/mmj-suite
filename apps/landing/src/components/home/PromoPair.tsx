import Image from "next/image";
import { Shell } from "@/components/ui/Shell";
import { ArrowCta } from "@/components/ui/Button";

const fade = {
  maskImage: "linear-gradient(to right, transparent 0%, black 45%)",
  WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 45%)",
};

const promos = [
  {
    title: "Solitaire House",
    lead: "Certified stones, honest settings",
    cta: "Shop collection",
    href: "/collections/solitaire-house",
    image: "/images/products/prod-solitaire-ring.webp",
    alt: "Solitaire diamond ring",
    ground: "bg-fog",
  },
  {
    title: "The Bridal Vault",
    lead: "Everything the trousseau asks for",
    cta: "Shop now",
    href: "/collections/bridal-vault",
    image: "/images/products/prod-polki-choker.webp",
    alt: "Polki bridal choker",
    ground: "bg-mist",
  },
];

/** Two wide promo cards, text left and the piece melting in from the right. */
export function PromoPair() {
  return (
    <section className="bg-paper pt-14 sm:pt-16">
      <Shell className="grid gap-5 md:grid-cols-2">
        {promos.map((promo) => (
          <article
            key={promo.title}
            className={`group relative isolate flex min-h-[230px] overflow-hidden rounded-3xl sm:min-h-[260px] ${promo.ground}`}
          >
            <div className="absolute inset-y-0 right-0 -z-10 w-[62%]" style={fade}>
              <Image
                src={promo.image}
                alt={promo.alt}
                fill
                sizes="(min-width: 768px) 30vw, 60vw"
                className="object-cover mix-blend-multiply transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col justify-center p-7 sm:p-9">
              <h3 className="text-[clamp(1.8rem,3vw,2.3rem)] text-ink">{promo.title}</h3>
              <p className="mt-2 max-w-[22ch] text-[14px] text-ash">{promo.lead}</p>
              <ArrowCta href={promo.href} className="mt-6 self-start">
                {promo.cta}
              </ArrowCta>
            </div>
          </article>
        ))}
      </Shell>
    </section>
  );
}
