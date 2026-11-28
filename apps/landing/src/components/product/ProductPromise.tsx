import Image from "next/image";
import { Shell } from "@/components/ui/Shell";
import { Accordion } from "@/components/ui/Accordion";
import { promises, site } from "@/data/site";

/**
 * "The MMJ experience" block from the reference product page: a photograph on
 * the left, the brand promise and an accordion of what every piece comes with.
 */
export function ProductPromise() {
  const items = [
    ...promises.map((promise) => ({ question: promise.title, answer: promise.body })),
    {
      question: "Size guide",
      answer:
        "Ring sizes follow the Indian scale. If you are between sizes, choose the larger; we resize free within half a size either way, once, within six months.",
    },
    {
      question: "Visit the showroom",
      answer: `${site.address.lines.join(", ")}, ${site.address.city}. Open ${site.hours.toLowerCase()}, ${site.closedOn.toLowerCase()}.`,
    },
  ];

  return (
    <section className="bg-paper py-16 sm:py-20">
      <Shell className="grid gap-10 overflow-hidden rounded-3xl bg-mist lg:grid-cols-2 lg:gap-0">
        <div className="relative min-h-[300px] lg:min-h-[480px]">
          <Image
            src="/images/lifestyle/life-showroom.webp"
            alt="Inside the MMJ showroom"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="px-6 pb-10 sm:px-10 lg:px-14 lg:py-14">
          <h2 className="text-[clamp(2rem,3.6vw,2.8rem)] text-ink">The MMJ experience</h2>
          <p className="mt-4 max-w-md text-[14px] leading-relaxed text-ash">
            Every piece is hallmarked, weighed in front of you and backed by lifetime exchange,
            from the first estimate to the day you hand it down.
          </p>
          <div className="mt-8">
            <Accordion items={items} />
          </div>
        </div>
      </Shell>
    </section>
  );
}
