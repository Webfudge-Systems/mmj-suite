import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumbs({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[12px] text-ash">
      {trail.map((crumb, index) => (
        <span key={crumb.label} className="flex items-center gap-1.5">
          {crumb.href ? (
            <Link href={crumb.href} className="transition-colors hover:text-wine">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-ink">{crumb.label}</span>
          )}
          {index < trail.length - 1 && <ChevronRight className="size-3 text-stone" aria-hidden />}
        </span>
      ))}
    </nav>
  );
}
