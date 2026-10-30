import { Shell } from "@/components/ui/Shell";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Statement } from "@/components/ui/SectionHeading";

export function PageHeader({
  title,
  lead,
  trail,
}: {
  title: string;
  lead?: string;
  trail?: { label: string; href?: string }[];
}) {
  return (
    <header className="border-b border-line bg-paper">
      <Shell className="py-12 sm:py-16">
        {trail && <Breadcrumbs trail={trail} />}
        <Statement as="h1" className="mt-5 max-w-3xl">
          {title}
        </Statement>
        {lead && <p className="mt-5 max-w-xl text-[14px] leading-relaxed text-ash">{lead}</p>}
      </Shell>
    </header>
  );
}
