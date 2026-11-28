import Image from "next/image";
import { Shell } from "@/components/ui/Shell";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Statement } from "@/components/ui/SectionHeading";

/**
 * Inner-page header on the pale blue mist, the way the reference opens its
 * category pages: title and lead on the left, an optional image tile on the
 * right.
 */
export function PageHeader({
  title,
  lead,
  trail,
  image,
  imageAlt = "",
}: {
  title: string;
  lead?: string;
  trail?: { label: string; href?: string }[];
  image?: string;
  imageAlt?: string;
}) {
  return (
    <header className="rounded-b-[2rem] bg-mist-wash sm:rounded-b-[3rem]">
      <Shell className={image ? "grid items-stretch gap-8 py-10 sm:py-12 lg:grid-cols-[minmax(0,1fr)_460px]" : "py-12 sm:py-16"}>
        <div className="flex flex-col justify-center">
          {trail && <Breadcrumbs trail={trail} />}
          <Statement as="h1" className="mt-5 max-w-3xl text-ink">
            {title}
          </Statement>
          {lead && <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ash">{lead}</p>}
        </div>
        {image && (
          <div className="relative hidden min-h-[220px] overflow-hidden bg-paper lg:block">
            <Image src={image} alt={imageAlt} fill sizes="460px" className="object-cover" priority />
          </div>
        )}
      </Shell>
    </header>
  );
}
