import Link from "next/link";
import { cn } from "@/lib/utils";

const base =
  "eyebrow inline-flex items-center gap-1.5 border px-3.5 py-2 text-[11px] transition-colors duration-200";

export function Pill({
  children,
  active,
  onClick,
  className,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        base,
        active
          ? "border-ink bg-ink text-cream"
          : "border-line bg-transparent text-ash hover:border-ink hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function PillLink({
  children,
  href,
  active,
  className,
}: {
  children: React.ReactNode;
  href: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        base,
        active
          ? "border-ink bg-ink text-cream"
          : "border-line bg-transparent text-ash hover:border-ink hover:text-ink",
        className,
      )}
    >
      {children}
    </Link>
  );
}
