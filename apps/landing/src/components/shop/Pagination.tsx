"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({ page, pageCount }: { page: number; pageCount: number }) {
  const pathname = usePathname();
  const params = useSearchParams();

  if (pageCount <= 1) return null;

  const hrefFor = (target: number) => {
    const next = new URLSearchParams(params.toString());
    if (target > 1) next.set("page", String(target));
    else next.delete("page");
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  return (
    <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-2">
      <Step href={hrefFor(page - 1)} disabled={page === 1} label="Previous">
        <ArrowLeft className="size-4" />
      </Step>

      {pages.map((target) => (
        <Link
          key={target}
          href={hrefFor(target)}
          aria-current={target === page ? "page" : undefined}
          className={cn(
            "grid size-10 place-items-center border text-[13px] transition-colors",
            target === page
              ? "border-ink bg-ink text-cream"
              : "border-line text-ash hover:border-ink hover:text-ink",
          )}
        >
          {target}
        </Link>
      ))}

      <Step href={hrefFor(page + 1)} disabled={page === pageCount} label="Next">
        <ArrowRight className="size-4" />
      </Step>
    </nav>
  );
}

function Step({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span aria-hidden className="grid size-10 place-items-center border border-line text-line">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className="grid size-10 place-items-center border border-line text-ash transition-colors hover:border-ink hover:text-ink"
    >
      {children}
    </Link>
  );
}
