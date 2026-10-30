import Link from "next/link";

export function Breadcrumbs({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="eyebrow flex flex-wrap items-center gap-2 text-[10px] text-ash">
      {trail.map((crumb, index) => (
        <span key={crumb.label} className="flex items-center gap-2">
          {crumb.href ? (
            <Link href={crumb.href} className="transition-colors hover:text-ink">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-ink">{crumb.label}</span>
          )}
          {index < trail.length - 1 && <span aria-hidden>/</span>}
        </span>
      ))}
    </nav>
  );
}
